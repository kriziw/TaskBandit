import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { AuthProvider, HouseholdRole } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { Secret, sign, SignOptions, verify } from "jsonwebtoken";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { AppConfigService } from "../../common/config/app-config.service";
import { AuthenticatedUser } from "../../common/auth/authenticated-user.type";
import { I18nService } from "../../common/i18n/i18n.service";
import { SupportedLanguage } from "../../common/i18n/supported-languages";
import { PrismaService } from "../../common/prisma/prisma.service";
import { HostedRuntimeConfigService } from "../../common/tenancy/hosted-runtime-config.service";
import { TenantContextService } from "../../common/tenancy/tenant-context.service";
import { SmtpService, type SmtpSettings } from "../settings/smtp.service";
import { CompletePasswordResetDto } from "./dto/complete-password-reset.dto";
import { LoginDto } from "./dto/login.dto";
import { RequestPasswordResetDto } from "./dto/request-password-reset.dto";
import { SignupDto } from "./dto/signup.dto";

type AuthTokenPayload = {
  sub: string;
  tenantId: string;
  householdId: string;
  role: string;
  email?: string;
};

type DashboardSyncTokenPayload = {
  purpose: "dashboard-sync";
  sub: string;
  tenantId: string;
  householdId: string;
};

type OidcStatePayload = {
  purpose: "oidc-state";
  nonce: string;
  returnTo: string;
  language: SupportedLanguage;
};

type OidcMetadata = {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
};

type OidcProfile = {
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
};

type StoredAuthSettings = {
  tenantId: string;
  householdId: string;
  selfSignupEnabled: boolean;
  localAuthEnabled: boolean;
  oidcEnabled: boolean;
  oidcAuthority: string;
  oidcClientId: string;
  oidcClientSecret: string;
  oidcScope: string;
};

@Injectable()
export class AuthService {
  private readonly oidcMetadataPromises = new Map<string, Promise<OidcMetadata>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfigService: AppConfigService,
    private readonly i18nService: I18nService,
    private readonly smtpService: SmtpService,
    private readonly tenantContextService: TenantContextService,
    private readonly hostedRuntimeConfigService: HostedRuntimeConfigService
  ) {}

  async hashPassword(password: string) {
    return hash(password, 12);
  }

  async login(dto: LoginDto, language: SupportedLanguage, requestHost?: string | null) {
    const tenant = await this.tenantContextService.resolveFromRequestHost(requestHost);
    const localAuthConfig = await this.getEffectiveLocalAuthConfig(tenant.tenantId);
    if (!localAuthConfig.enabled) {
      throw new ForbiddenException({
        message: this.i18nService.translate("auth.local_disabled", language)
      });
    }

    const normalizedEmail = this.normalizeEmail(dto.email);
    const identity = await this.prisma.authIdentity.findUnique({
      where: {
        email: normalizedEmail
      },
      include: {
        user: true
      }
    });

    if (
      !identity ||
      identity.provider !== AuthProvider.LOCAL ||
      !identity.passwordHash ||
      identity.user.tenantId !== tenant.tenantId
    ) {
      throw new UnauthorizedException({
        message: this.i18nService.translate("auth.invalid_credentials", language)
      });
    }

    const passwordMatches = await compare(dto.password, identity.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException({
        message: this.i18nService.translate("auth.invalid_credentials", language)
      });
    }

    return this.buildAuthResponse(
      identity.user.id,
      identity.user.tenantId,
      identity.user.householdId,
      identity.user.role,
      identity.email
    );
  }

  async signup(dto: SignupDto, language: SupportedLanguage, requestHost?: string | null) {
    const tenant = await this.tenantContextService.resolveFromRequestHost(requestHost);
    const settings = await this.getStoredAuthSettings(tenant.tenantId);
    if (!settings) {
      throw new ForbiddenException({
        message: this.i18nService.translate("auth.bootstrap_required", language)
      });
    }

    const localAuthConfig = await this.getEffectiveLocalAuthConfig(tenant.tenantId, settings);
    if (!localAuthConfig.enabled) {
      throw new ForbiddenException({
        message: this.i18nService.translate("auth.local_disabled", language)
      });
    }

    if (!settings.selfSignupEnabled) {
      throw new ForbiddenException({
        message: this.i18nService.translate("auth.self_signup_disabled", language)
      });
    }

    if (!localAuthConfig.householdId) {
      throw new ForbiddenException({
        message: this.i18nService.translate("auth.bootstrap_required", language)
      });
    }

    const normalizedEmail = this.normalizeEmail(dto.email);
    const existingIdentity = await this.prisma.authIdentity.findUnique({
      where: {
        email: normalizedEmail
      }
    });

    if (existingIdentity) {
      throw new ConflictException({
        message: this.i18nService.translate("auth.email_in_use", language)
      });
    }

    const passwordHash = await hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        tenantId: tenant.tenantId,
        householdId: localAuthConfig.householdId,
        displayName: dto.displayName.trim(),
        role: HouseholdRole.PARENT,
        identities: {
          create: {
            provider: AuthProvider.LOCAL,
            providerSubject: normalizedEmail,
            email: normalizedEmail,
            passwordHash
          }
        }
      }
    });

    return this.buildAuthResponse(user.id, user.tenantId, user.householdId, user.role, normalizedEmail);
  }

  async requestPasswordReset(
    dto: RequestPasswordResetDto,
    resetLinkTemplate: string,
    language: SupportedLanguage,
    requestHost?: string | null
  ) {
    const tenant = await this.tenantContextService.resolveFromRequestHost(requestHost);
    const localAuthConfig = await this.getEffectiveLocalAuthConfig(tenant.tenantId);
    if (!localAuthConfig.enabled) {
      throw new ForbiddenException({
        message: this.i18nService.translate("auth.local_disabled", language)
      });
    }

    const smtpSettings = await this.getPrimaryHouseholdSmtpSettings(tenant.tenantId);
    if (!smtpSettings || !smtpSettings.enabled) {
      throw new BadRequestException({
        message: this.i18nService.translate("auth.password_reset_unavailable", language)
      });
    }

    const normalizedEmail = this.normalizeEmail(dto.email);
    const identity = await this.prisma.authIdentity.findUnique({
      where: {
        email: normalizedEmail
      },
      include: {
        user: true
      }
    });

    if (
      !identity ||
      identity.provider !== AuthProvider.LOCAL ||
      !identity.passwordHash ||
      identity.user.tenantId !== tenant.tenantId
    ) {
      return {
        ok: true,
        message: this.i18nService.translate("auth.password_reset_requested", language)
      };
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = this.hashResetToken(rawToken);
    const expiresAtUtc = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: {
        authIdentityId: identity.id,
        tokenHash,
        expiresAtUtc
      }
    });

    const resetLink = resetLinkTemplate.replace("__TASKBANDIT_RESET_TOKEN__", encodeURIComponent(rawToken));
    const subject = this.i18nService.translate("auth.password_reset_email_subject", language);
    const text = [
      this.i18nService.translate("auth.password_reset_email_intro", language),
      "",
      resetLink,
      "",
      this.i18nService.translate("auth.password_reset_email_expiry", language)
    ].join("\n");

    await this.smtpService.sendMail(smtpSettings, {
      to: normalizedEmail,
      subject,
      text,
      html: `<p>${this.escapeHtml(
        this.i18nService.translate("auth.password_reset_email_intro", language)
      )}</p><p><a href="${this.escapeHtml(resetLink)}">${this.escapeHtml(resetLink)}</a></p><p>${this.escapeHtml(
        this.i18nService.translate("auth.password_reset_email_expiry", language)
      )}</p>`
    });

    return {
      ok: true,
      message: this.i18nService.translate("auth.password_reset_requested", language)
    };
  }

  async completePasswordReset(
    dto: CompletePasswordResetDto,
    language: SupportedLanguage,
    requestHost?: string | null
  ) {
    const tenant = await this.tenantContextService.resolveFromRequestHost(requestHost);
    const localAuthConfig = await this.getEffectiveLocalAuthConfig(tenant.tenantId);
    if (!localAuthConfig.enabled) {
      throw new ForbiddenException({
        message: this.i18nService.translate("auth.local_disabled", language)
      });
    }

    const tokenHash = this.hashResetToken(dto.token);
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: {
        tokenHash
      },
      include: {
        authIdentity: true
      }
    });

    if (!resetToken || resetToken.usedAtUtc || resetToken.expiresAtUtc.getTime() < Date.now()) {
      throw new BadRequestException({
        message: this.i18nService.translate("auth.password_reset_invalid", language)
      });
    }

    if (resetToken.authIdentity.provider !== AuthProvider.LOCAL) {
      throw new BadRequestException({
        message: this.i18nService.translate("auth.password_reset_invalid", language)
      });
    }

    const passwordHash = await this.hashPassword(dto.password);
    await this.prisma.$transaction([
      this.prisma.authIdentity.update({
        where: {
          id: resetToken.authIdentity.id
        },
        data: {
          passwordHash
        }
      }),
      this.prisma.passwordResetToken.update({
        where: {
          id: resetToken.id
        },
        data: {
          usedAtUtc: new Date()
        }
      }),
      this.prisma.passwordResetToken.updateMany({
        where: {
          authIdentityId: resetToken.authIdentity.id,
          id: {
            not: resetToken.id
          },
          usedAtUtc: null
        },
        data: {
          usedAtUtc: new Date()
        }
      })
    ]);

    return {
      ok: true,
      message: this.i18nService.translate("auth.password_reset_completed", language)
    };
  }

  async getCurrentUser(
    authorizationHeader: string | undefined,
    language: SupportedLanguage,
    requestHost?: string | null
  ): Promise<AuthenticatedUser> {
    const tenant = await this.tenantContextService.resolveFromRequestHost(requestHost);
    const token = this.extractBearerToken(authorizationHeader);
    if (!token) {
      throw new UnauthorizedException({
        message: this.i18nService.translate("auth.unauthorized", language)
      });
    }

    try {
      const payload = verify(token, this.appConfigService.jwtSecret) as AuthTokenPayload;
      const user = await this.prisma.user.findUniqueOrThrow({
        where: {
          id: payload.sub
        },
        include: {
          identities: true
        }
      });

      if (payload.tenantId !== user.tenantId || user.tenantId !== tenant.tenantId) {
        throw new Error("Tenant mismatch.");
      }

      const preferredIdentity =
        user.identities.find((identity) => identity.provider === AuthProvider.LOCAL && identity.email) ??
        user.identities.find((identity) => Boolean(identity.email));

      return {
        id: user.id,
        tenantId: user.tenantId,
        householdId: user.householdId,
        displayName: user.displayName,
        role: this.mapRole(user.role),
        email: preferredIdentity?.email ?? null,
        points: user.points,
        currentStreak: user.currentStreak
      };
    } catch {
      throw new UnauthorizedException({
        message: this.i18nService.translate("auth.unauthorized", language)
      });
    }
  }

  createDashboardSyncToken(user: AuthenticatedUser) {
    return sign(
      {
        purpose: "dashboard-sync",
        sub: user.id,
        tenantId: user.tenantId,
        householdId: user.householdId
      } satisfies DashboardSyncTokenPayload,
      this.appConfigService.jwtSecret as Secret,
      {
        expiresIn: "15m"
      }
    );
  }

  async getCurrentUserFromDashboardSyncToken(
    token: string | undefined,
    language: SupportedLanguage,
    requestHost?: string | null
  ): Promise<AuthenticatedUser> {
    if (!token) {
      throw new UnauthorizedException({
        message: this.i18nService.translate("auth.unauthorized", language)
      });
    }

    try {
      const tenant = await this.tenantContextService.resolveFromRequestHost(requestHost);
      const payload = verify(token, this.appConfigService.jwtSecret) as Partial<DashboardSyncTokenPayload>;
      if (payload.purpose !== "dashboard-sync" || !payload.sub || !payload.householdId || !payload.tenantId) {
        throw new Error("Invalid dashboard sync token.");
      }

      const user = await this.prisma.user.findUniqueOrThrow({
        where: {
          id: payload.sub
        },
        include: {
          identities: true
        }
      });

      if (
        user.householdId !== payload.householdId ||
        user.tenantId !== payload.tenantId ||
        user.tenantId !== tenant.tenantId
      ) {
        throw new Error("Dashboard sync token household mismatch.");
      }

      const preferredIdentity =
        user.identities.find((identity) => identity.provider === AuthProvider.LOCAL && identity.email) ??
        user.identities.find((identity) => Boolean(identity.email));

      return {
        id: user.id,
        tenantId: user.tenantId,
        householdId: user.householdId,
        displayName: user.displayName,
        role: this.mapRole(user.role),
        email: preferredIdentity?.email ?? null,
        points: user.points,
        currentStreak: user.currentStreak
      };
    } catch {
      throw new UnauthorizedException({
        message: this.i18nService.translate("auth.unauthorized", language)
      });
    }
  }

  async getProviders(requestHost?: string | null) {
    let tenant: Awaited<ReturnType<TenantContextService["resolveFromRequestHost"]>>;
    try {
      tenant = await this.tenantContextService.resolveFromRequestHost(requestHost);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          local: {
            enabled: false,
            forcedByConfig: this.appConfigService.forceLocalAuthEnabled,
            selfSignupEnabled: false,
            householdId: null
          },
          oidc: {
            enabled: false,
            authority: "",
            clientId: "",
            source: "none" as const
          }
        };
      }

      throw error;
    }

    const settings = await this.getStoredAuthSettings(tenant.tenantId);
    const local = await this.getEffectiveLocalAuthConfig(tenant.tenantId, settings);
    const oidc = await this.getEffectiveOidcConfig(tenant.tenantId, settings);

    return {
      local,
      oidc: {
        enabled: oidc.enabled,
        authority: oidc.authority,
        clientId: oidc.clientId,
        source: oidc.source
      }
    };
  }

  createOidcState(returnTo: string, language: SupportedLanguage) {
    return sign(
      {
        purpose: "oidc-state",
        nonce: randomUUID(),
        returnTo,
        language
      } satisfies OidcStatePayload,
      this.appConfigService.jwtSecret as Secret,
      {
        expiresIn: "10m"
      }
    );
  }

  verifyOidcState(state: string, language: SupportedLanguage): OidcStatePayload {
    try {
      const payload = verify(state, this.appConfigService.jwtSecret) as Partial<OidcStatePayload>;
      if (payload.purpose !== "oidc-state" || !payload.returnTo || !payload.language) {
        throw new Error("Invalid OIDC state payload.");
      }

      return {
        purpose: "oidc-state",
        nonce: payload.nonce ?? randomUUID(),
        returnTo: payload.returnTo,
        language: payload.language
      };
    } catch {
      throw new UnauthorizedException({
        message: this.i18nService.translate("auth.oidc_state_invalid", language)
      });
    }
  }

  async buildOidcAuthorizationUrl(
    callbackUrl: string,
    state: string,
    requestHost?: string | null
  ) {
    const tenant = await this.tenantContextService.resolveFromRequestHost(requestHost);
    const metadata = await this.getOidcMetadata(tenant.tenantId);
    const oidcConfig = await this.getEffectiveOidcConfig(tenant.tenantId);
    const params = new URLSearchParams({
      client_id: oidcConfig.clientId,
      response_type: "code",
      redirect_uri: callbackUrl,
      scope: oidcConfig.scope,
      state
    });

    return `${metadata.authorization_endpoint}?${params.toString()}`;
  }

  async completeOidcLogin(
    code: string,
    callbackUrl: string,
    language: SupportedLanguage,
    requestHost?: string | null
  ) {
    const tenant = await this.tenantContextService.resolveFromRequestHost(requestHost);
    const metadata = await this.getOidcMetadata(tenant.tenantId);
    const oidcConfig = await this.getEffectiveOidcConfig(tenant.tenantId);
    const tokenResponse = await fetch(metadata.token_endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: this.buildOidcTokenRequestBody(code, callbackUrl, oidcConfig)
    });

    if (!tokenResponse.ok) {
      throw new UnauthorizedException({
        message: this.i18nService.translate("auth.unauthorized", language)
      });
    }

    const tokenPayload = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenPayload.access_token) {
      throw new UnauthorizedException({
        message: this.i18nService.translate("auth.unauthorized", language)
      });
    }

    const profileResponse = await fetch(metadata.userinfo_endpoint, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${tokenPayload.access_token}`
      }
    });

    if (!profileResponse.ok) {
      throw new UnauthorizedException({
        message: this.i18nService.translate("auth.unauthorized", language)
      });
    }

    const profile = (await profileResponse.json()) as OidcProfile;
    if (!profile.sub) {
      throw new UnauthorizedException({
        message: this.i18nService.translate("auth.unauthorized", language)
      });
    }

    const normalizedEmail = profile.email ? this.normalizeEmail(profile.email) : null;
    const displayName =
      profile.name?.trim() ||
      profile.preferred_username?.trim() ||
      normalizedEmail ||
      "OIDC User";

    let user = await this.prisma.authIdentity.findUnique({
      where: {
        provider_providerSubject: {
          provider: AuthProvider.OIDC,
          providerSubject: profile.sub
        }
      },
      include: {
        user: true
      }
    });

    if (user && user.user.tenantId !== tenant.tenantId) {
      user = null;
    }

    if (!user && normalizedEmail) {
      const existingIdentity = await this.prisma.authIdentity.findUnique({
        where: {
          email: normalizedEmail
        },
        include: {
          user: true
        }
      });

      if (existingIdentity) {
        if (existingIdentity.user.tenantId !== tenant.tenantId) {
          throw new ConflictException({
            message: this.i18nService.translate("auth.email_in_use", language)
          });
        }

        user = await this.prisma.authIdentity.create({
          data: {
            userId: existingIdentity.userId,
            provider: AuthProvider.OIDC,
            providerSubject: profile.sub,
            email: normalizedEmail
          },
          include: {
            user: true
          }
        });
      }
    }

    if (!user) {
      const settings = await this.getStoredAuthSettings(tenant.tenantId);
      if (!settings) {
        throw new ForbiddenException({
          message: this.i18nService.translate("auth.bootstrap_required", language)
        });
      }

      if (!settings.selfSignupEnabled) {
        throw new ForbiddenException({
          message: this.i18nService.translate("auth.self_signup_disabled", language)
        });
      }

      if (!normalizedEmail) {
        throw new UnauthorizedException({
          message: this.i18nService.translate("auth.oidc_email_required", language)
        });
      }

      if (!oidcConfig.householdId) {
        throw new ForbiddenException({
          message: this.i18nService.translate("auth.bootstrap_required", language)
        });
      }

      const createdUser = await this.prisma.user.create({
        data: {
          tenantId: tenant.tenantId,
          householdId: oidcConfig.householdId,
          displayName,
          role: HouseholdRole.PARENT,
          identities: {
            create: {
              provider: AuthProvider.OIDC,
              providerSubject: profile.sub,
              email: normalizedEmail
            }
          }
        },
        include: {
          identities: true
        }
      });

      return this.buildAuthResponse(
        createdUser.id,
        createdUser.tenantId,
        createdUser.householdId,
        createdUser.role,
        normalizedEmail
      );
    }

    const preferredEmail = normalizedEmail ?? user.email;

    return this.buildAuthResponse(
      user.user.id,
      user.user.tenantId,
      user.user.householdId,
      user.user.role,
      preferredEmail
    );
  }

  private buildAuthResponse(
    userId: string,
    tenantId: string,
    householdId: string,
    role: HouseholdRole,
    email?: string | null
  ) {
    const accessToken = sign(
      {
        sub: userId,
        tenantId,
        householdId,
        role: role.toLowerCase(),
        email: email ?? undefined
      },
      this.appConfigService.jwtSecret as Secret,
      {
        expiresIn: this.appConfigService.jwtExpiresIn as SignOptions["expiresIn"]
      }
    );

    return {
      accessToken,
      tokenType: "Bearer",
      expiresIn: this.appConfigService.jwtExpiresIn,
      user: {
        id: userId,
        tenantId,
        householdId,
        role: role.toLowerCase(),
        email: email ?? null
      }
    };
  }

  private extractBearerToken(authorizationHeader?: string) {
    if (!authorizationHeader) {
      return null;
    }

    const [scheme, token] = authorizationHeader.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) {
      return null;
    }

    return token;
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private async getOidcMetadata(tenantId: string) {
    const oidcConfig = await this.getEffectiveOidcConfig(tenantId);
    if (!oidcConfig.enabled) {
      throw new UnauthorizedException({
        message: this.i18nService.translate("auth.unauthorized", "en")
      });
    }

    const metadataCacheKey = oidcConfig.authority.trim().toLowerCase();
    const cachedPromise = this.oidcMetadataPromises.get(metadataCacheKey);
    if (cachedPromise) {
      return cachedPromise;
    }

    const metadataUrl = `${oidcConfig.authority.replace(/\/+$/, "")}/.well-known/openid-configuration`;
    const metadataPromise = fetch(metadataUrl, {
      headers: {
        Accept: "application/json"
      }
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load OIDC metadata.");
        }

        return (await response.json()) as OidcMetadata;
      })
      .catch((error) => {
        this.oidcMetadataPromises.delete(metadataCacheKey);
        throw error;
      });

    this.oidcMetadataPromises.set(metadataCacheKey, metadataPromise);
    return metadataPromise;
  }

  private buildOidcTokenRequestBody(
    code: string,
    callbackUrl: string,
    oidcConfig: Awaited<ReturnType<AuthService["getEffectiveOidcConfig"]>>
  ) {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: callbackUrl,
      client_id: oidcConfig.clientId
    });

    if (oidcConfig.clientSecret) {
      body.set("client_secret", oidcConfig.clientSecret);
    }

    return body;
  }

  private async getStoredAuthSettings(tenantId: string): Promise<StoredAuthSettings | null> {
    const household = await this.prisma.household.findFirst({
      where: {
        tenantId
      },
      include: {
        settings: true
      }
    });

    if (!household) {
      return null;
    }

    return {
      tenantId,
      householdId: household.id,
      selfSignupEnabled: household.settings?.selfSignupEnabled ?? false,
      localAuthEnabled: household.settings?.localAuthEnabled ?? true,
      oidcEnabled: household.settings?.oidcEnabled ?? false,
      oidcAuthority: household.settings?.oidcAuthority?.trim() ?? "",
      oidcClientId: household.settings?.oidcClientId?.trim() ?? "",
      oidcClientSecret: household.settings?.oidcClientSecret?.trim() ?? "",
      oidcScope: household.settings?.oidcScope?.trim() || "openid profile email"
    };
  }

  private async getPrimaryHouseholdSmtpSettings(tenantId: string): Promise<SmtpSettings | null> {
    const household = await this.prisma.household.findFirst({
      where: {
        tenantId
      },
      include: {
        settings: true
      }
    });

    if (!household?.settings) {
      return null;
    }

    return {
      enabled: household.settings.smtpEnabled,
      host: household.settings.smtpHost ?? "",
      port: household.settings.smtpPort ?? 587,
      secure: household.settings.smtpSecure,
      username: household.settings.smtpUsername ?? "",
      password: household.settings.smtpPassword ?? "",
      fromEmail: household.settings.smtpFromEmail ?? "",
      fromName: household.settings.smtpFromName ?? "",
      passwordConfigured: Boolean(household.settings.smtpPassword)
    };
  }

  private hashResetToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  private async getEffectiveLocalAuthConfig(
    tenantId: string,
    settings?: StoredAuthSettings | null
  ) {
    const resolvedSettings = settings ?? (await this.getStoredAuthSettings(tenantId));
    return {
      enabled:
        this.appConfigService.forceLocalAuthEnabled || (resolvedSettings?.localAuthEnabled ?? true),
      forcedByConfig: this.appConfigService.forceLocalAuthEnabled,
      selfSignupEnabled:
        (this.appConfigService.forceLocalAuthEnabled || (resolvedSettings?.localAuthEnabled ?? true)) &&
        (resolvedSettings?.selfSignupEnabled ?? false),
      householdId: resolvedSettings?.householdId ?? null
    };
  }

  private async getEffectiveOidcConfig(
    tenantId: string,
    settings?: StoredAuthSettings | null
  ) {
    const resolvedSettings = settings ?? (await this.getStoredAuthSettings(tenantId));
    const hostedConfig = await this.hostedRuntimeConfigService.getTenantRuntimeConfig(tenantId);
    const hostedOidcConfig = hostedConfig?.hostedOidcConfig;
    if (hostedOidcConfig?.enabled && hostedOidcConfig.issuer && hostedOidcConfig.clientId) {
      return {
        enabled: true,
        authority: hostedOidcConfig.issuer,
        clientId: hostedOidcConfig.clientId,
        clientSecret: "",
        scope: hostedOidcConfig.scopes.join(" ").trim() || "openid profile email",
        source: "control_plane" as const,
        householdId: resolvedSettings?.householdId ?? null
      };
    }

    const fallback = this.appConfigService.oidcFallbackConfig;
    const uiAuthority = resolvedSettings?.oidcAuthority ?? "";
    const uiClientId = resolvedSettings?.oidcClientId ?? "";
    const uiClientSecret = resolvedSettings?.oidcClientSecret ?? "";
    const uiScope = resolvedSettings?.oidcScope ?? "openid profile email";
    const uiEnabled = Boolean(resolvedSettings?.oidcEnabled && uiAuthority && uiClientId);

    if (uiEnabled) {
      return {
        enabled: true,
        authority: uiAuthority,
        clientId: uiClientId,
        clientSecret: uiClientSecret,
        scope: uiScope,
        source: "ui" as const,
        householdId: resolvedSettings?.householdId ?? null
      };
    }

    return {
      ...fallback,
      householdId: resolvedSettings?.householdId ?? null
    };
  }

  private mapRole(role: HouseholdRole): AuthenticatedUser["role"] {
    switch (role) {
      case HouseholdRole.ADMIN:
        return "admin";
      case HouseholdRole.PARENT:
        return "parent";
      case HouseholdRole.CHILD:
        return "child";
    }
  }
}

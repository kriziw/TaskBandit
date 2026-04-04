import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { AuthProvider, HouseholdRole } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { Secret, sign, SignOptions, verify } from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { AppConfigService } from "../../common/config/app-config.service";
import { AuthenticatedUser } from "../../common/auth/authenticated-user.type";
import { I18nService } from "../../common/i18n/i18n.service";
import { SupportedLanguage } from "../../common/i18n/supported-languages";
import { PrismaService } from "../../common/prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { SignupDto } from "./dto/signup.dto";

type AuthTokenPayload = {
  sub: string;
  householdId: string;
  role: string;
  email?: string;
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
  private oidcMetadataPromise: Promise<OidcMetadata> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfigService: AppConfigService,
    private readonly i18nService: I18nService
  ) {}

  async hashPassword(password: string) {
    return hash(password, 12);
  }

  async login(dto: LoginDto, language: SupportedLanguage) {
    const localAuthConfig = await this.getEffectiveLocalAuthConfig();
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

    if (!identity || identity.provider !== AuthProvider.LOCAL || !identity.passwordHash) {
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

    return this.buildAuthResponse(identity.user.id, identity.user.householdId, identity.user.role, identity.email);
  }

  async signup(dto: SignupDto, language: SupportedLanguage) {
    const settings = await this.getStoredAuthSettings();
    if (!settings) {
      throw new ForbiddenException({
        message: this.i18nService.translate("auth.bootstrap_required", language)
      });
    }

    const localAuthConfig = await this.getEffectiveLocalAuthConfig(settings);
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

    return this.buildAuthResponse(user.id, user.householdId, user.role, normalizedEmail);
  }

  async getCurrentUser(
    authorizationHeader: string | undefined,
    language: SupportedLanguage
  ): Promise<AuthenticatedUser> {
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

      const preferredIdentity =
        user.identities.find((identity) => identity.provider === AuthProvider.LOCAL && identity.email) ??
        user.identities.find((identity) => Boolean(identity.email));

      return {
        id: user.id,
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

  async getProviders() {
    const settings = await this.getStoredAuthSettings();
    const local = await this.getEffectiveLocalAuthConfig(settings);
    const oidc = await this.getEffectiveOidcConfig(settings);

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
    state: string
  ) {
    const metadata = await this.getOidcMetadata();
    const oidcConfig = await this.getEffectiveOidcConfig();
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
    language: SupportedLanguage
  ) {
    const metadata = await this.getOidcMetadata();
    const oidcConfig = await this.getEffectiveOidcConfig();
    const tokenResponse = await fetch(metadata.token_endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: callbackUrl,
        client_id: oidcConfig.clientId,
        client_secret: oidcConfig.clientSecret
      })
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
      const settings = await this.getStoredAuthSettings();
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
        createdUser.householdId,
        createdUser.role,
        normalizedEmail
      );
    }

    const preferredEmail = normalizedEmail ?? user.email;

    return this.buildAuthResponse(
      user.user.id,
      user.user.householdId,
      user.user.role,
      preferredEmail
    );
  }

  private buildAuthResponse(userId: string, householdId: string, role: HouseholdRole, email?: string | null) {
    const accessToken = sign(
      {
        sub: userId,
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

  private async getOidcMetadata() {
    const oidcConfig = await this.getEffectiveOidcConfig();
    if (!oidcConfig.enabled) {
      throw new UnauthorizedException({
        message: this.i18nService.translate("auth.unauthorized", "en")
      });
    }

    if (!this.oidcMetadataPromise) {
      const metadataUrl = `${oidcConfig.authority.replace(/\/+$/, "")}/.well-known/openid-configuration`;
      this.oidcMetadataPromise = fetch(metadataUrl, {
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
          this.oidcMetadataPromise = null;
          throw error;
        });
    }

    return this.oidcMetadataPromise;
  }

  private async getStoredAuthSettings(): Promise<(StoredAuthSettings & { householdId: string }) | null> {
    const household = await this.prisma.household.findFirst({
      include: {
        settings: true
      }
    });

    if (!household) {
      return null;
    }

    return {
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

  private async getEffectiveLocalAuthConfig(
    settings?: (StoredAuthSettings & { householdId: string }) | null
  ) {
    const resolvedSettings = settings ?? (await this.getStoredAuthSettings());
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
    settings?: (StoredAuthSettings & { householdId: string }) | null
  ) {
    const resolvedSettings = settings ?? (await this.getStoredAuthSettings());
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

import { AuthenticatedUser } from "../../common/auth/authenticated-user.type";
import { BadRequestException, Injectable } from "@nestjs/common";
import { AppConfigService } from "../../common/config/app-config.service";
import { normalizeTenantPathPrefix } from "../../common/http/path-routing.util";
import { I18nService } from "../../common/i18n/i18n.service";
import { SupportedLanguage } from "../../common/i18n/supported-languages";
import { FeatureAccessService } from "../../common/tenancy/feature-access.service";
import { HostedRuntimeConfigService } from "../../common/tenancy/hosted-runtime-config.service";
import { TenantContextService } from "../../common/tenancy/tenant-context.service";
import { TenantRuntimePolicyService } from "../../common/tenancy/tenant-runtime-policy.service";
import { AuthService } from "../auth/auth.service";
import { HouseholdRepository } from "../household/household.repository";
import { CreateHouseholdMemberDto } from "./dto/create-household-member.dto";
import { RegisterNotificationDeviceDto } from "./dto/register-notification-device.dto";
import { TestSmtpSettingsDto } from "./dto/test-smtp-settings.dto";
import { UpdateHouseholdMemberDto } from "./dto/update-household-member.dto";
import { UpdateNotificationPreferencesDto } from "./dto/update-notification-preferences.dto";
import { UpdateSettingsDto } from "./dto/update-settings.dto";
import { SmtpService, type SmtpSettings } from "./smtp.service";

@Injectable()
export class SettingsService {
  private readonly verifiedSmtpSettings = new Map<string, string>();

  constructor(
    private readonly repository: HouseholdRepository,
    private readonly authService: AuthService,
    private readonly i18nService: I18nService,
    private readonly appConfigService: AppConfigService,
    private readonly smtpService: SmtpService,
    private readonly tenantContextService: TenantContextService,
    private readonly featureAccessService: FeatureAccessService,
    private readonly hostedRuntimeConfigService: HostedRuntimeConfigService,
    private readonly tenantRuntimePolicyService: TenantRuntimePolicyService
  ) {}

  async getHousehold(user: AuthenticatedUser) {
    const household = await this.repository.getHouseholdForViewer(user.householdId, user.role);
    return this.applyRuntimeAuthSettings(household, user);
  }

  getAuditLog(user: AuthenticatedUser) {
    return this.repository.getAuditLog(user.householdId);
  }

  getNotificationPreferences(user: AuthenticatedUser) {
    return this.repository.getNotificationPreferences(user.householdId, user.id);
  }

  getNotificationDevices(user: AuthenticatedUser) {
    return this.repository.getNotificationDevices(user.householdId, user.id);
  }

  getWebPushPublicKey(user: AuthenticatedUser) {
    return {
      supported: this.appConfigService.webPushEnabled,
      publicKey: this.appConfigService.webPushConfig?.publicKey ?? null,
      platform: "web_push" as const,
      householdId: user.householdId
    };
  }

  getHouseholdNotificationHealth(user: AuthenticatedUser) {
    return this.repository.getHouseholdNotificationHealth(user.householdId);
  }

  async getHostedSubscriptionOverview(user: AuthenticatedUser) {
    const accessState = await this.tenantRuntimePolicyService.getTenantAccessState(user.tenantId);
    if (!accessState.hostedMode) {
      return {
        hostedMode: false
      };
    }

    const [runtimeConfig, tenantContext] = await Promise.all([
      this.hostedRuntimeConfigService.getTenantRuntimeConfig(user.tenantId),
      this.tenantContextService.resolveByTenantId(user.tenantId)
    ]);
    const [household, storageBytesUsed, monthlyNotificationsUsed] = await Promise.all([
      this.repository.getHousehold(user.householdId),
      this.repository.getProofStorageUsage(user.tenantId, user.householdId),
      this.repository.getCurrentMonthNotificationCount(user.tenantId)
    ]);
    const membersUsed = household.members.length;

    return {
      hostedMode: true,
      tenantId: user.tenantId,
      tenantSlug: tenantContext.slug,
      planCode: accessState.planCode,
      packageCode: runtimeConfig?.packageCode ?? accessState.planCode,
      packageDisplayName: runtimeConfig?.packageDisplayName ?? runtimeConfig?.packageCode ?? accessState.planCode,
      lifecycleState: accessState.lifecycleState,
      entitlementState: accessState.entitlementState,
      billingStatus: accessState.billingStatus,
      suspensionReason: accessState.suspensionReason,
      trialEndsAt: accessState.trialEndsAt,
      graceEndsAt: accessState.graceEndsAt,
      quotaPolicyVersion: accessState.quotaPolicyVersion,
      configVersion: accessState.configVersion,
      updatedAt: accessState.updatedAt,
      quotas: accessState.quotas,
      usage: {
        membersUsed,
        monthlyNotificationsUsed,
        storageBytesUsed
      },
      featureAccess: this.featureAccessService.normalizeFeatureAccess(
        runtimeConfig?.featureAccess ?? user.featureAccess
      ),
      canonicalApiBaseUrl: this.buildCanonicalHostedBaseUrl(this.appConfigService.publicApiBaseUrl, tenantContext.slug),
      canonicalWebBaseUrl: this.buildCanonicalHostedBaseUrl(this.appConfigService.publicWebBaseUrl, tenantContext.slug)
    };
  }

  async updateSettings(dto: UpdateSettingsDto, user: AuthenticatedUser) {
    const currentHousehold = await this.repository.getHousehold(user.householdId);
    this.ensureHostedManagedSettingsAreNotEdited(dto);
    const nextLocalAuthEnabled = dto.localAuthEnabled ?? currentHousehold.settings.localAuthEnabled;
    const nextOidcEnabled = dto.oidcEnabled ?? currentHousehold.settings.oidcEnabled;
    const nextSmtpEnabled = dto.smtpEnabled ?? currentHousehold.settings.smtpEnabled;
    const nextOidcAuthority =
      dto.oidcAuthority !== undefined ? dto.oidcAuthority.trim() : currentHousehold.settings.oidcAuthority;
    const nextOidcClientId =
      dto.oidcClientId !== undefined ? dto.oidcClientId.trim() : currentHousehold.settings.oidcClientId;
    const uiManagedOidcAvailable =
      nextOidcEnabled && Boolean(nextOidcAuthority && nextOidcClientId);
    const fallbackOidcAvailable = this.appConfigService.oidcFallbackConfig.enabled;

    if (nextOidcEnabled && (!nextOidcAuthority || !nextOidcClientId)) {
      throw new BadRequestException("OIDC needs both an authority URL and client ID before it can be enabled.");
    }

    if (
      !this.appConfigService.forceLocalAuthEnabled &&
      !nextLocalAuthEnabled &&
      !uiManagedOidcAvailable &&
      !fallbackOidcAvailable
    ) {
      throw new BadRequestException(
        "Either local auth or OIDC must stay enabled unless local auth is forced on from config."
      );
    }

    if (!currentHousehold.settings.smtpEnabled && nextSmtpEnabled) {
      const smtpSettings = this.buildSmtpSettingsForUpdate(dto, currentHousehold.settings);
      const testedSettingsFingerprint = this.verifiedSmtpSettings.get(user.householdId);

      if (testedSettingsFingerprint !== this.getSmtpSettingsFingerprint(smtpSettings)) {
        throw new BadRequestException({
          code: "SMTP_TEST_REQUIRED",
          message: "Test the SMTP settings successfully before enabling SMTP."
        });
      }
    }

    const updatedHousehold = await this.repository.updateSettings(dto, user.householdId, user.id);
    return this.applyRuntimeAuthSettings(updatedHousehold, user);
  }

  updateNotificationPreferences(dto: UpdateNotificationPreferencesDto, user: AuthenticatedUser) {
    return this.repository.updateNotificationPreferences(dto, user.householdId, user.id);
  }

  registerNotificationDevice(dto: RegisterNotificationDeviceDto, user: AuthenticatedUser) {
    return this.repository.registerNotificationDevice(dto, user.householdId, user.id);
  }

  deleteNotificationDevice(deviceId: string, user: AuthenticatedUser) {
    return this.repository.deleteNotificationDevice(deviceId, user.householdId, user.id);
  }

  async createHouseholdMember(
    dto: CreateHouseholdMemberDto,
    user: AuthenticatedUser,
    language: SupportedLanguage,
    signInUrl?: string
  ) {
    if (dto.sendInviteEmail && !signInUrl) {
      throw new BadRequestException("A sign-in URL is required before an invite email can be sent.");
    }

    const household = await this.repository.getHousehold(user.householdId);
    await this.tenantRuntimePolicyService.assertActionAllowed(user.tenantId, "member_create");
    await this.tenantRuntimePolicyService.assertMembersLimit(user.tenantId, household.members.length, 1);
    const smtpSettings = {
      enabled: household.settings.smtpEnabled,
      host: household.settings.smtpHost,
      port: household.settings.smtpPort,
      secure: household.settings.smtpSecure,
      username: household.settings.smtpUsername,
      password: household.settings.smtpPassword,
      fromEmail: household.settings.smtpFromEmail,
      fromName: household.settings.smtpFromName,
      passwordConfigured: household.settings.smtpPasswordConfigured
    };

    if (dto.sendInviteEmail && !smtpSettings.enabled) {
      throw new BadRequestException(this.i18nService.translate("members.invite_unavailable", language));
    }

    const passwordHash = await this.authService.hashPassword(dto.password);
    const created = await this.repository.createHouseholdMember(
      dto,
      user.householdId,
      passwordHash,
      this.i18nService.translate("auth.email_in_use", language),
      user.id
    );

    if (dto.sendInviteEmail && created.createdMember && signInUrl) {
      const inviteIntro = this.i18nService.translate("members.invite_email_intro", language).replace(
        "{name}",
        created.createdMember.displayName
      );
      const inviteSignInLine = `${this.i18nService.translate("members.invite_email_sign_in", language)}: ${signInUrl}`;
      const inviteEmailLine = `${this.i18nService.translate("members.invite_email_email", language)}: ${created.createdMember.email}`;
      const invitePasswordLine = `${this.i18nService.translate("members.invite_email_password", language)}: ${dto.password}`;
      const inviteFooter = this.i18nService.translate("members.invite_email_footer", language);
      const inviteText = [
        inviteIntro,
        "",
        inviteSignInLine,
        inviteEmailLine,
        invitePasswordLine,
        "",
        inviteFooter
      ].join("\n");

      await this.smtpService.sendMail(smtpSettings, {
        to: created.createdMember.email,
        subject: this.i18nService.translate("members.invite_email_subject", language),
        text: inviteText,
        html: this.buildBrandedInviteHtml({
          intro: inviteIntro,
          signInLine: inviteSignInLine,
          emailLine: inviteEmailLine,
          passwordLine: invitePasswordLine,
          footer: inviteFooter
        })
      });
    }

    return {
      household: created.household,
      inviteEmailSent: Boolean(dto.sendInviteEmail)
    };
  }

  async updateHouseholdMember(
    memberId: string,
    dto: UpdateHouseholdMemberDto,
    user: AuthenticatedUser,
    language: SupportedLanguage
  ) {
    const passwordHash = dto.password ? await this.authService.hashPassword(dto.password) : undefined;
    return this.repository.updateHouseholdMember(
      memberId,
      dto,
      user.householdId,
      this.i18nService.translate("auth.email_in_use", language),
      user.id,
      passwordHash
    );
  }

  async testSmtp(dto: TestSmtpSettingsDto, user: AuthenticatedUser) {
    const household = await this.repository.getHousehold(user.householdId);
    const smtpSettings = this.buildSmtpSettingsForTest(dto, household.settings);
    const result = await this.smtpService.verify(smtpSettings);
    this.verifiedSmtpSettings.set(user.householdId, this.getSmtpSettingsFingerprint(smtpSettings));
    return result;
  }

  private buildSmtpSettingsForTest(
    dto: TestSmtpSettingsDto,
    settings: Awaited<ReturnType<HouseholdRepository["getHousehold"]>>["settings"]
  ): SmtpSettings {
    const smtpPassword = dto.smtpPassword !== undefined ? dto.smtpPassword : settings.smtpPassword;

    return {
      enabled: dto.smtpEnabled ?? settings.smtpEnabled,
      host: dto.smtpHost ?? settings.smtpHost,
      port: dto.smtpPort ?? settings.smtpPort,
      secure: dto.smtpSecure ?? settings.smtpSecure,
      username: dto.smtpUsername ?? settings.smtpUsername,
      password: smtpPassword,
      fromEmail: dto.smtpFromEmail ?? settings.smtpFromEmail,
      fromName: dto.smtpFromName ?? settings.smtpFromName,
      passwordConfigured:
        dto.smtpPassword !== undefined
          ? Boolean(dto.smtpPassword.trim())
          : settings.smtpPasswordConfigured
    };
  }

  private buildSmtpSettingsForUpdate(
    dto: UpdateSettingsDto,
    settings: Awaited<ReturnType<HouseholdRepository["getHousehold"]>>["settings"]
  ): SmtpSettings {
    const smtpPassword = dto.smtpPassword !== undefined ? dto.smtpPassword : settings.smtpPassword;

    return {
      enabled: dto.smtpEnabled ?? settings.smtpEnabled,
      host: dto.smtpHost ?? settings.smtpHost,
      port: dto.smtpPort ?? settings.smtpPort,
      secure: dto.smtpSecure ?? settings.smtpSecure,
      username: dto.smtpUsername ?? settings.smtpUsername,
      password: smtpPassword,
      fromEmail: dto.smtpFromEmail ?? settings.smtpFromEmail,
      fromName: dto.smtpFromName ?? settings.smtpFromName,
      passwordConfigured:
        dto.smtpPassword !== undefined
          ? Boolean(dto.smtpPassword.trim())
          : settings.smtpPasswordConfigured
    };
  }

  private getSmtpSettingsFingerprint(settings: SmtpSettings) {
    return JSON.stringify({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      username: settings.username,
      password: settings.password,
      fromEmail: settings.fromEmail,
      fromName: settings.fromName
    });
  }

  private buildCanonicalHostedBaseUrl(baseUrl: string, tenantSlug: string) {
    if (!baseUrl) {
      return null;
    }

    if (!this.appConfigService.hostedModeEnabled) {
      return baseUrl;
    }

    if (this.appConfigService.hostedTenantRoutingMode !== "path") {
      return baseUrl;
    }

    const normalizedSlug = tenantSlug.trim().toLowerCase();
    if (!normalizedSlug) {
      return baseUrl;
    }

    const normalizedPrefix = normalizeTenantPathPrefix(this.appConfigService.tenantPathPrefix);
    const parsedBaseUrl = new URL(baseUrl);
    const normalizedPathname = parsedBaseUrl.pathname.replace(/\/+$/, "");
    parsedBaseUrl.pathname = `${normalizedPathname}${normalizedPrefix}/${normalizedSlug}`.replace(
      /\/+/g,
      "/"
    );
    parsedBaseUrl.search = "";
    parsedBaseUrl.hash = "";
    return parsedBaseUrl.toString().replace(/\/$/, "");
  }

  private async applyRuntimeAuthSettings(
    household: Awaited<ReturnType<HouseholdRepository["getHousehold"]>>,
    user: AuthenticatedUser
  ) {
    const localAuthForcedByConfig = this.appConfigService.forceLocalAuthEnabled;
    const localAuthEffective = localAuthForcedByConfig || household.settings.localAuthEnabled;
    const hostedRuntimeConfig = await this.hostedRuntimeConfigService.getTenantRuntimeConfig(user.tenantId);
    const hostedOidcConfig = hostedRuntimeConfig?.hostedOidcConfig;
    const controlPlaneManagedOidc =
      Boolean(hostedOidcConfig?.enabled && hostedOidcConfig.issuer && hostedOidcConfig.clientId);
    const oidcSource = controlPlaneManagedOidc
      ? "control_plane"
      : household.settings.oidcEnabled && household.settings.oidcAuthority && household.settings.oidcClientId
        ? "ui"
        : this.appConfigService.oidcFallbackConfig.enabled
          ? "env"
          : "none";
    const oidcEffective = oidcSource !== "none";
    const oidcConfig =
      oidcSource === "control_plane"
        ? {
            oidcEnabled: Boolean(hostedOidcConfig?.enabled),
            oidcAuthority: hostedOidcConfig?.issuer ?? "",
            oidcClientId: hostedOidcConfig?.clientId ?? "",
            oidcClientSecret: "",
            oidcClientSecretConfigured: Boolean(hostedOidcConfig?.clientSecretRef),
            oidcScope: hostedOidcConfig?.scopes.join(" ").trim() || "openid profile email"
          }
        : oidcSource === "ui"
        ? {
            oidcEnabled: household.settings.oidcEnabled,
            oidcAuthority: household.settings.oidcAuthority,
            oidcClientId: household.settings.oidcClientId,
            oidcClientSecret: household.settings.oidcClientSecret,
            oidcClientSecretConfigured: household.settings.oidcClientSecretConfigured,
            oidcScope: household.settings.oidcScope
          }
        : {
            oidcEnabled: this.appConfigService.oidcFallbackConfig.enabled,
            oidcAuthority: this.appConfigService.oidcFallbackConfig.authority,
            oidcClientId: this.appConfigService.oidcFallbackConfig.clientId,
            oidcClientSecret:
              user.role === "admin" ? this.appConfigService.oidcFallbackConfig.clientSecret : "",
            oidcClientSecretConfigured: Boolean(this.appConfigService.oidcFallbackConfig.clientSecret),
            oidcScope: this.appConfigService.oidcFallbackConfig.scope
          };

    return {
      ...household,
      settings: {
        ...household.settings,
        localAuthForcedByConfig,
        localAuthEffective,
        oidcEffective,
        oidcSource,
        ...oidcConfig,
        oidcClientSecret: user.role === "admin" ? oidcConfig.oidcClientSecret : ""
      }
    };
  }

  private buildBrandedInviteHtml({
    intro,
    signInLine,
    emailLine,
    passwordLine,
    footer
  }: {
    intro: string;
    signInLine: string;
    emailLine: string;
    passwordLine: string;
    footer: string;
  }) {
    return [
      "<!doctype html>",
      "<html>",
      "<body style=\"margin:0;background:#f6efe4;padding:24px;font-family:Arial,sans-serif;color:#2b2318;\">",
      "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:620px;margin:0 auto;background:#fffdf8;border:1px solid #e3d6c3;border-radius:16px;overflow:hidden;\">",
      "<tr><td style=\"padding:18px 24px;background:linear-gradient(135deg,#f2dec2,#e8cfab);\">",
      "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>",
      "<td style=\"width:58px;vertical-align:middle;\"><img src=\"https://my.taskbandit.app/taskbandit-icon.png\" alt=\"TaskBandit mascot\" width=\"42\" height=\"42\" style=\"display:block;border-radius:12px;background:#fff7ea;border:1px solid #d9c4a4;padding:4px;\"></td>",
      "<td style=\"vertical-align:middle;\"><p style=\"margin:0;color:#3f2f1c;font-size:18px;font-weight:800;\">TaskBandit</p></td>",
      "</tr></table>",
      "</td></tr>",
      "<tr><td style=\"padding:24px;\">",
      `<p style=\"margin:0 0 14px 0;color:#2b2318;font-size:14px;line-height:1.6;\">${this.escapeHtml(intro)}</p>`,
      `<p style=\"margin:0 0 10px 0;color:#2b2318;font-size:14px;line-height:1.6;\">${this.escapeHtml(signInLine)}</p>`,
      `<p style=\"margin:0 0 10px 0;color:#2b2318;font-size:14px;line-height:1.6;\">${this.escapeHtml(emailLine)}</p>`,
      `<p style=\"margin:0 0 14px 0;color:#2b2318;font-size:14px;line-height:1.6;\">${this.escapeHtml(passwordLine)}</p>`,
      `<p style=\"margin:0;color:#6a5a46;font-size:13px;line-height:1.5;\">${this.escapeHtml(footer)}</p>`,
      "<p style=\"margin:24px 0 0 0;color:#4f3f2c;font-size:14px;\">Thanks,<br>TaskBandit</p>",
      "</td></tr>",
      "</table>",
      "</body>",
      "</html>"
    ].join("");
  }

  private escapeHtml(value: string) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#39;");
  }

  private ensureHostedManagedSettingsAreNotEdited(dto: UpdateSettingsDto) {
    if (!this.appConfigService.hostedModeEnabled) {
      return;
    }

    const hostedManagedFieldNames = [
      "oidcEnabled",
      "oidcAuthority",
      "oidcClientId",
      "oidcClientSecret",
      "oidcScope",
      "smtpEnabled",
      "smtpHost",
      "smtpPort",
      "smtpSecure",
      "smtpUsername",
      "smtpPassword",
      "smtpFromEmail",
      "smtpFromName"
    ] as const;

    if (hostedManagedFieldNames.some((fieldName) => dto[fieldName] !== undefined)) {
      throw new BadRequestException(
        "Hosted identity and delivery settings are managed by the control plane for SaaS tenants."
      );
    }
  }
}

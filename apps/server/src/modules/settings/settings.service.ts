import { AuthenticatedUser } from "../../common/auth/authenticated-user.type";
import { BadRequestException, Injectable } from "@nestjs/common";
import { AppConfigService } from "../../common/config/app-config.service";
import { I18nService } from "../../common/i18n/i18n.service";
import { SupportedLanguage } from "../../common/i18n/supported-languages";
import { AuthService } from "../auth/auth.service";
import { HouseholdRepository } from "../household/household.repository";
import { CreateHouseholdMemberDto } from "./dto/create-household-member.dto";
import { RegisterNotificationDeviceDto } from "./dto/register-notification-device.dto";
import { SmtpService } from "./smtp.service";
import { UpdateHouseholdMemberDto } from "./dto/update-household-member.dto";
import { UpdateNotificationPreferencesDto } from "./dto/update-notification-preferences.dto";
import { UpdateSettingsDto } from "./dto/update-settings.dto";

@Injectable()
export class SettingsService {
  constructor(
    private readonly repository: HouseholdRepository,
    private readonly authService: AuthService,
    private readonly i18nService: I18nService,
    private readonly appConfigService: AppConfigService,
    private readonly smtpService: SmtpService
  ) {}

  async getHousehold(user: AuthenticatedUser) {
    const household = await this.repository.getHouseholdForViewer(user.householdId, user.role);
    return this.applyRuntimeAuthSettings(household, user.role);
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

  getHouseholdNotificationHealth(user: AuthenticatedUser) {
    return this.repository.getHouseholdNotificationHealth(user.householdId);
  }

  async updateSettings(dto: UpdateSettingsDto, user: AuthenticatedUser) {
    const currentHousehold = await this.repository.getHousehold(user.householdId);
    const nextLocalAuthEnabled = dto.localAuthEnabled ?? currentHousehold.settings.localAuthEnabled;
    const nextOidcEnabled = dto.oidcEnabled ?? currentHousehold.settings.oidcEnabled;
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

    const updatedHousehold = await this.repository.updateSettings(dto, user.householdId, user.id);
    return this.applyRuntimeAuthSettings(updatedHousehold, user.role);
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
      await this.smtpService.sendMail(smtpSettings, {
        to: created.createdMember.email,
        subject: this.i18nService.translate("members.invite_email_subject", language),
        text: [
          this.i18nService.translate("members.invite_email_intro", language).replace(
            "{name}",
            created.createdMember.displayName
          ),
          "",
          `${this.i18nService.translate("members.invite_email_sign_in", language)}: ${signInUrl}`,
          `${this.i18nService.translate("members.invite_email_email", language)}: ${created.createdMember.email}`,
          `${this.i18nService.translate("members.invite_email_password", language)}: ${dto.password}`,
          "",
          this.i18nService.translate("members.invite_email_footer", language)
        ].join("\n")
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

  async testSmtp(user: AuthenticatedUser) {
    const household = await this.repository.getHousehold(user.householdId);
    return this.smtpService.verify({
      enabled: household.settings.smtpEnabled,
      host: household.settings.smtpHost,
      port: household.settings.smtpPort,
      secure: household.settings.smtpSecure,
      username: household.settings.smtpUsername,
      password: household.settings.smtpPassword,
      fromEmail: household.settings.smtpFromEmail,
      fromName: household.settings.smtpFromName,
      passwordConfigured: household.settings.smtpPasswordConfigured
    });
  }

  private applyRuntimeAuthSettings(
    household: Awaited<ReturnType<HouseholdRepository["getHousehold"]>>,
    role: AuthenticatedUser["role"]
  ) {
    const localAuthForcedByConfig = this.appConfigService.forceLocalAuthEnabled;
    const localAuthEffective = localAuthForcedByConfig || household.settings.localAuthEnabled;
    const oidcSource =
      household.settings.oidcEnabled && household.settings.oidcAuthority && household.settings.oidcClientId
        ? "ui"
        : this.appConfigService.oidcFallbackConfig.enabled
          ? "env"
          : "none";
    const oidcEffective = oidcSource !== "none";
    const oidcConfig =
      oidcSource === "ui"
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
            oidcClientSecret: role === "admin" ? this.appConfigService.oidcFallbackConfig.clientSecret : "",
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
        oidcClientSecret: role === "admin" ? oidcConfig.oidcClientSecret : ""
      }
    };
  }
}

import { Body, Controller, Delete, Get, Headers, Param, Post, Put, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/authenticated-user.type";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import { AppConfigService } from "../../common/config/app-config.service";
import { buildRequestOrigin, resolveMountedAppPath } from "../../common/http/request-url.util";
import { I18nService } from "../../common/i18n/i18n.service";
import { SettingsService } from "./settings.service";
import { CreateHouseholdMemberDto } from "./dto/create-household-member.dto";
import { RegisterNotificationDeviceDto } from "./dto/register-notification-device.dto";
import { TestSmtpSettingsDto } from "./dto/test-smtp-settings.dto";
import { UpdateNotificationPreferencesDto } from "./dto/update-notification-preferences.dto";
import { UpdateHouseholdMemberDto } from "./dto/update-household-member.dto";
import { UpdateSettingsDto } from "./dto/update-settings.dto";

@ApiTags("settings")
@Controller("api/settings")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly i18nService: I18nService,
    private readonly appConfigService: AppConfigService
  ) {}

  @Get("household")
  getHousehold(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getHousehold(user);
  }

  @Get("audit-log")
  @Roles("admin", "parent")
  getAuditLog(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getAuditLog(user);
  }

  @Get("notifications")
  getNotificationPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getNotificationPreferences(user);
  }

  @Get("notification-devices")
  getNotificationDevices(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getNotificationDevices(user);
  }

  @Get("notification-devices/web-push/public-key")
  getWebPushPublicKey(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getWebPushPublicKey(user);
  }

  @Get("notification-health")
  @Roles("admin")
  getHouseholdNotificationHealth(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getHouseholdNotificationHealth(user);
  }

  @Put("household")
  @Roles("admin")
  updateHousehold(@Body() dto: UpdateSettingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.updateSettings(dto, user);
  }

  @Put("notifications")
  updateNotificationPreferences(
    @Body() dto: UpdateNotificationPreferencesDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.settingsService.updateNotificationPreferences(dto, user);
  }

  @Post("notification-devices/register")
  registerNotificationDevice(
    @Body() dto: RegisterNotificationDeviceDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.settingsService.registerNotificationDevice(dto, user);
  }

  @Delete("notification-devices/:deviceId")
  deleteNotificationDevice(
    @Param("deviceId") deviceId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.settingsService.deleteNotificationDevice(deviceId, user);
  }

  @Post("smtp/test")
  @Roles("admin")
  testSmtp(@Body() dto: TestSmtpSettingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.testSmtp(dto, user);
  }

  @Post("household/members")
  @Roles("admin")
  createHouseholdMember(
    @Body() dto: CreateHouseholdMemberDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers("accept-language") acceptLanguage?: string
  ) {
    return this.settingsService.createHouseholdMember(
      dto,
      user,
      this.i18nService.resolveLanguage(acceptLanguage),
      this.buildSignInUrl(request)
    );
  }

  @Put("household/members/:memberId")
  @Roles("admin")
  updateHouseholdMember(
    @Param("memberId") memberId: string,
    @Body() dto: UpdateHouseholdMemberDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers("accept-language") acceptLanguage?: string
  ) {
    return this.settingsService.updateHouseholdMember(
      memberId,
      dto,
      user,
      this.i18nService.resolveLanguage(acceptLanguage)
    );
  }

  private buildSignInUrl(request: Request) {
    const origin =
      this.appConfigService.hostedModeEnabled &&
      this.appConfigService.hostedTenantRoutingMode === "path" &&
      this.appConfigService.publicWebBaseUrl
        ? this.appConfigService.publicWebBaseUrl
        : buildRequestOrigin(request);
    const appPath = resolveMountedAppPath(request, "/api/settings/");
    return new URL(appPath, origin).toString();
  }
}

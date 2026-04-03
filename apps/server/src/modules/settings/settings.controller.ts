import { Body, Controller, Get, Headers, Post, Put, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/authenticated-user.type";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import { I18nService } from "../../common/i18n/i18n.service";
import { SettingsService } from "./settings.service";
import { CreateHouseholdMemberDto } from "./dto/create-household-member.dto";
import { UpdateSettingsDto } from "./dto/update-settings.dto";

@ApiTags("settings")
@Controller("api/settings")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly i18nService: I18nService
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

  @Put("household")
  @Roles("admin")
  updateHousehold(@Body() dto: UpdateSettingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.updateSettings(dto, user);
  }

  @Post("household/members")
  @Roles("admin")
  createHouseholdMember(
    @Body() dto: CreateHouseholdMemberDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers("accept-language") acceptLanguage?: string
  ) {
    return this.settingsService.createHouseholdMember(
      dto,
      user,
      this.i18nService.resolveLanguage(acceptLanguage)
    );
  }
}

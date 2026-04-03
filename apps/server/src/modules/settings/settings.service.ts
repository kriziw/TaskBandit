import { AuthenticatedUser } from "../../common/auth/authenticated-user.type";
import { Injectable } from "@nestjs/common";
import { I18nService } from "../../common/i18n/i18n.service";
import { SupportedLanguage } from "../../common/i18n/supported-languages";
import { AuthService } from "../auth/auth.service";
import { HouseholdRepository } from "../household/household.repository";
import { CreateHouseholdMemberDto } from "./dto/create-household-member.dto";
import { UpdateSettingsDto } from "./dto/update-settings.dto";

@Injectable()
export class SettingsService {
  constructor(
    private readonly repository: HouseholdRepository,
    private readonly authService: AuthService,
    private readonly i18nService: I18nService
  ) {}

  getHousehold(user: AuthenticatedUser) {
    return this.repository.getHousehold(user.householdId);
  }

  updateSettings(dto: UpdateSettingsDto, user: AuthenticatedUser) {
    return this.repository.updateSettings(dto, user.householdId);
  }

  async createHouseholdMember(
    dto: CreateHouseholdMemberDto,
    user: AuthenticatedUser,
    language: SupportedLanguage
  ) {
    const passwordHash = await this.authService.hashPassword(dto.password);
    return this.repository.createHouseholdMember(
      dto,
      user.householdId,
      passwordHash,
      this.i18nService.translate("auth.email_in_use", language)
    );
  }
}

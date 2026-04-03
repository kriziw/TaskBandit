import { ConflictException, Injectable, OnModuleInit } from "@nestjs/common";
import { AppConfigService } from "../../common/config/app-config.service";
import { I18nService } from "../../common/i18n/i18n.service";
import { SupportedLanguage } from "../../common/i18n/supported-languages";
import { AuthService } from "../auth/auth.service";
import { HouseholdRepository } from "../household/household.repository";
import { BootstrapHouseholdDto } from "./dto/bootstrap-household.dto";

@Injectable()
export class BootstrapService implements OnModuleInit {
  constructor(
    private readonly repository: HouseholdRepository,
    private readonly appConfigService: AppConfigService,
    private readonly i18nService: I18nService,
    private readonly authService: AuthService
  ) {}

  async onModuleInit() {
    await this.repository.seedDemoDataIfNeeded(this.appConfigService.seedDemoData);
  }

  getStatus() {
    return this.repository.getBootstrapStatus();
  }

  async bootstrapHousehold(dto: BootstrapHouseholdDto, language: SupportedLanguage) {
    const status = await this.repository.getBootstrapStatus();
    if (status.isBootstrapped) {
      throw new ConflictException({
        message: this.i18nService.translate("bootstrap.already_initialized", language)
      });
    }

    const passwordHash = await this.authService.hashPassword(dto.ownerPassword);

    return this.repository.bootstrapHousehold(
      dto.householdName,
      dto.ownerDisplayName,
      dto.ownerEmail,
      passwordHash,
      dto.selfSignupEnabled
    );
  }
}

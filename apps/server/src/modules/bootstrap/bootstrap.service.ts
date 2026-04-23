import { ConflictException, ForbiddenException, Injectable, OnModuleInit } from "@nestjs/common";
import { AppConfigService } from "../../common/config/app-config.service";
import { I18nService } from "../../common/i18n/i18n.service";
import { SupportedLanguage } from "../../common/i18n/supported-languages";
import { AuthService } from "../auth/auth.service";
import { HouseholdRepository } from "../household/household.repository";
import { BootstrapHouseholdDto } from "./dto/bootstrap-household.dto";
import { getStarterTemplateOptionCatalog } from "./starter-templates.catalog";

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

  async getStatus() {
    if (this.appConfigService.hostedModeEnabled) {
      return {
        isBootstrapped: true,
        householdCount: 1
      };
    }

    return this.repository.getBootstrapStatus();
  }

  getStarterTemplateOptions(language: SupportedLanguage) {
    if (this.appConfigService.hostedModeEnabled) {
      return [];
    }

    return getStarterTemplateOptionCatalog(language);
  }

  async bootstrapHousehold(dto: BootstrapHouseholdDto, language: SupportedLanguage) {
    if (this.appConfigService.hostedModeEnabled) {
      throw new ForbiddenException({
        message: "Hosted households are provisioned through the control plane."
      });
    }

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
      dto.selfSignupEnabled,
      dto.starterTemplateKeys,
      language
    );
  }
}

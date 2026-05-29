import { ConflictException, ForbiddenException, Injectable, OnModuleInit } from '@nestjs/common';
import { AppConfigService } from '../../common/config/app-config.service';
import { I18nService } from '../../common/i18n/i18n.service';
import { SupportedLanguage } from '../../common/i18n/supported-languages';
import { AuthService } from '../auth/auth.service';
import { HouseholdRepository } from '../household/household.repository';
import { BootstrapHouseholdDto } from './dto/bootstrap-household.dto';
import { getStarterTemplateOptionCatalog } from './starter-templates.catalog';

@Injectable()
export class BootstrapService implements OnModuleInit {
  constructor(
    private readonly repository: HouseholdRepository,
    private readonly appConfigService: AppConfigService,
    private readonly i18nService: I18nService,
    private readonly authService: AuthService,
  ) {}

  async onModuleInit() {
    await this.repository.seedDemoDataIfNeeded(this.appConfigService.seedDemoData);
    await this.repository.seedCatalogRewardsForAllHouseholds();
  }

  async getStatus() {
    const betaSignupEnabled = this.appConfigService.betaSignupEnabled;
    if (this.appConfigService.hostedModeEnabled) {
      return {
        isBootstrapped: true,
        householdCount: 1,
        betaSignupEnabled,
      };
    }

    const status = await this.repository.getBootstrapStatus();
    return { ...status, betaSignupEnabled };
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
        message: 'Hosted households are provisioned through the control plane.',
      });
    }

    const status = await this.repository.getBootstrapStatus();
    if (status.isBootstrapped) {
      throw new ConflictException({
        message: this.i18nService.translate('bootstrap.already_initialized', language),
      });
    }

    return this.provisionHousehold(dto, language);
  }

  /**
   * Provisions a new tenant + household without the self-hosted-mode guards.
   * Intended for internal callers such as the beta signup approval flow.
   */
  async provisionHostedHousehold(dto: BootstrapHouseholdDto, language: SupportedLanguage) {
    return this.provisionHousehold(dto, language);
  }

  private async provisionHousehold(dto: BootstrapHouseholdDto, language: SupportedLanguage) {
    const passwordHash = await this.authService.hashPassword(dto.ownerPassword);

    return this.repository.bootstrapHousehold(
      dto.householdName,
      dto.ownerDisplayName,
      dto.ownerEmail,
      passwordHash,
      dto.selfSignupEnabled,
      dto.starterTemplateKeys,
      language,
    );
  }
}

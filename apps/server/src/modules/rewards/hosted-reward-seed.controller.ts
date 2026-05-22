import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  Param,
  Post,
  ServiceUnavailableException
} from "@nestjs/common";
import { AppConfigService } from "../../common/config/app-config.service";
import { I18nService } from "../../common/i18n/i18n.service";
import { AppLogService } from "../../common/logging/app-log.service";
import { RewardsService } from "./rewards.service";
import { RewardsRepository } from "./rewards.repository";
import { getStarterRewardDefinitionsByKey } from "../bootstrap/starter-rewards.catalog";
import { ImportOperatorRewardsDto } from "./dto/import-operator-rewards.dto";

@Controller("internal/runtime")
export class HostedRewardSeedController {
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly rewardsService: RewardsService,
    private readonly rewardsRepository: RewardsRepository,
    private readonly i18nService: I18nService,
    private readonly appLogService: AppLogService
  ) {}

  @Post("tenants/:tenantId/default-rewards/seed")
  async seedTenantDefaultRewards(
    @Param("tenantId") tenantId: string,
    @Headers("accept-language") acceptLanguage?: string,
    @Headers("x-internal-service-token") token?: string
  ) {
    this.assertInternalServiceToken(token);
    const language = this.i18nService.resolveLanguage(acceptLanguage);
    const household = await this.rewardsRepository.getHouseholdByTenantId(tenantId);
    if (!household) {
      throw new ForbiddenException({ code: "household_not_found", message: "Household not found for this tenant." });
    }

    const existing = await this.rewardsRepository.getRewardsForHousehold(household.id, false);
    if (existing.length > 0) {
      return { seeded: false, rewardCount: existing.length, tenantId };
    }

    const definitions = getStarterRewardDefinitionsByKey();
    await this.rewardsRepository.seedStarterRewards(household.id, definitions, language);

    this.appLogService.warn(
      `[hosted-reward-seed] ${JSON.stringify({ reason: "hosted_default_rewards_seed", rewardCount: definitions.length, tenantId })}`,
      "HostedRewardSeedController"
    );
    return { seeded: true, rewardCount: definitions.length, tenantId };
  }

  @Post("tenants/:tenantId/rewards/import")
  async importOperatorRewards(
    @Param("tenantId") tenantId: string,
    @Body() dto: ImportOperatorRewardsDto,
    @Headers("accept-language") acceptLanguage?: string,
    @Headers("x-internal-service-token") token?: string
  ) {
    this.assertInternalServiceToken(token);
    const language = this.i18nService.resolveLanguage(acceptLanguage);
    const household = await this.rewardsRepository.getHouseholdByTenantId(tenantId);
    if (!household) {
      throw new ForbiddenException({ code: "household_not_found", message: "Household not found for this tenant." });
    }

    const result = await this.rewardsService.importOperatorRewards(household.id, dto.rewards, language);

    this.appLogService.log(
      `[hosted-reward-seed] ${JSON.stringify({ reason: "operator_rewards_import", upserted: result.upserted, tenantId })}`,
      "HostedRewardSeedController"
    );
    return { upserted: result.upserted, tenantId };
  }

  private assertInternalServiceToken(requestToken?: string) {
    const configuredToken = this.appConfigService.controlPlaneInternalServiceToken;
    if (!configuredToken) {
      throw new ServiceUnavailableException({
        code: "internal_service_token_not_configured",
        message: "Internal service token is not configured."
      });
    }
    const normalizedToken = String(requestToken ?? "").trim();
    if (!normalizedToken || normalizedToken !== configuredToken) {
      throw new ForbiddenException({
        code: "internal_service_token_invalid",
        message: "Internal service token is invalid."
      });
    }
  }
}

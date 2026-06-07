import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  Param,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AppConfigService } from '../../common/config/app-config.service';
import { I18nService } from '../../common/i18n/i18n.service';
import { AppLogService } from '../../common/logging/app-log.service';
import { HouseholdRepository } from '../household/household.repository';
import { ImportOperatorTemplatesDto } from './dto/import-operator-templates.dto';

@Controller('internal/runtime')
export class HostedTemplateSeedController {
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly householdRepository: HouseholdRepository,
    private readonly i18nService: I18nService,
    private readonly appLogService: AppLogService,
  ) {}

  @Post('tenants/:tenantId/default-templates/seed')
  async seedTenantDefaultTemplates(
    @Param('tenantId') tenantId: string,
    @Headers('accept-language') acceptLanguage?: string,
    @Headers('x-internal-service-token') token?: string,
  ) {
    this.assertInternalServiceToken(token);
    const language = this.i18nService.resolveLanguage(acceptLanguage);
    const result = await this.householdRepository.ensureDefaultTemplatesForTenant(
      tenantId,
      language,
    );
    this.appLogService.warn(
      `[hosted-template-seed] ${JSON.stringify({
        reason: 'hosted_default_templates_seed',
        seeded: result.seeded,
        templateCount: result.templateCount,
        tenantId,
      })}`,
      'HostedTemplateSeedController',
    );
    return {
      seeded: result.seeded,
      templateCount: result.templateCount,
      tenantId,
    };
  }

  @Post('tenants/:tenantId/default-templates/reset')
  async resetTenantDefaultTemplates(
    @Param('tenantId') tenantId: string,
    @Headers('accept-language') acceptLanguage?: string,
    @Headers('x-internal-service-token') token?: string,
  ) {
    this.assertInternalServiceToken(token);
    const language = this.i18nService.resolveLanguage(acceptLanguage);
    const result = await this.householdRepository.resetDefaultTemplatesForTenant(
      tenantId,
      language,
    );
    this.appLogService.warn(
      `[hosted-template-seed] ${JSON.stringify({
        reason: 'hosted_default_templates_reset',
        reset: result.reset,
        templateCount: result.templateCount,
        tenantId,
      })}`,
      'HostedTemplateSeedController',
    );
    return {
      reset: result.reset,
      templateCount: result.templateCount,
      tenantId,
    };
  }

  @Post('tenants/:tenantId/templates/restore-catalog-variants')
  async restoreMissingCatalogVariants(
    @Param('tenantId') tenantId: string,
    @Headers('x-internal-service-token') token?: string,
  ) {
    this.assertInternalServiceToken(token);
    const result = await this.householdRepository.restoreMissingCatalogVariantsForTenant(tenantId);
    this.appLogService.warn(
      `[hosted-template-seed] ${JSON.stringify({
        reason: 'restore_catalog_variants',
        restored: result.restored,
        alreadyHasVariants: result.alreadyHasVariants,
        tenantId,
      })}`,
      'HostedTemplateSeedController',
    );
    return {
      restored: result.restored,
      alreadyHasVariants: result.alreadyHasVariants,
      tenantId,
    };
  }

  @Post('tenants/:tenantId/templates/import')
  async importOperatorTemplates(
    @Param('tenantId') tenantId: string,
    @Body() dto: ImportOperatorTemplatesDto,
    @Headers('accept-language') acceptLanguage?: string,
    @Headers('x-internal-service-token') token?: string,
  ) {
    this.assertInternalServiceToken(token);
    const language = this.i18nService.resolveLanguage(acceptLanguage);
    const result = await this.householdRepository.importOperatorTemplatesForTenant(
      tenantId,
      dto.templates,
      language,
      dto.overrideCustomized ?? false,
    );
    this.appLogService.log(
      `[hosted-template-seed] ${JSON.stringify({
        reason: 'operator_templates_import',
        overrideCustomized: dto.overrideCustomized ?? false,
        skipped: result.skipped,
        upserted: result.upserted,
        tenantId,
      })}`,
      'HostedTemplateSeedController',
    );
    return {
      skipped: result.skipped,
      upserted: result.upserted,
      tenantId,
    };
  }

  private assertInternalServiceToken(requestToken?: string) {
    const configuredToken = this.appConfigService.controlPlaneInternalServiceToken;
    if (!configuredToken) {
      throw new ServiceUnavailableException({
        code: 'internal_service_token_not_configured',
        message: 'Internal service token is not configured.',
      });
    }

    const normalizedToken = String(requestToken ?? '').trim();
    if (!normalizedToken || normalizedToken !== configuredToken) {
      throw new ForbiddenException({
        code: 'internal_service_token_invalid',
        message: 'Internal service token is invalid.',
      });
    }
  }
}

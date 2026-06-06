import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AppConfigService } from '../../common/config/app-config.service';
import { AnalyticsService } from './analytics.service';

@ApiTags('internal-analytics')
@Controller('internal/analytics')
export class AnalyticsController {
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get('summary')
  async getPlatformSummary(@Headers('x-internal-service-token') token?: string) {
    this.assertInternalServiceToken(token);
    return this.analyticsService.getPlatformSummary();
  }

  @Get('tenants')
  async getAllTenantSnapshots(@Headers('x-internal-service-token') token?: string) {
    this.assertInternalServiceToken(token);
    return this.analyticsService.getAllTenantSnapshots();
  }

  @Get('tenants/:tenantId')
  async getTenantSnapshot(
    @Param('tenantId') tenantId: string,
    @Headers('x-internal-service-token') token?: string,
  ) {
    this.assertInternalServiceToken(token);
    return this.analyticsService.getTenantSnapshot(tenantId);
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

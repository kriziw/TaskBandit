import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  ServiceUnavailableException,
  Headers,
} from '@nestjs/common';
import { AppConfigService } from '../../common/config/app-config.service';
import { BetaSignupService } from './beta-signup.service';
import { GraduateBetaTenantsDto } from './dto/graduate-beta-tenants.dto';
import { ReviewBetaSignupDto } from './dto/review-beta-signup.dto';
import { SubmitBetaSignupDto } from './dto/submit-beta-signup.dto';
import { UpdateBetaSignupSettingsDto } from './dto/update-beta-signup-settings.dto';
import { UpdateTenantPackageDto } from './dto/update-tenant-package.dto';

@Controller('api/beta-signup')
export class BetaSignupController {
  constructor(
    private readonly betaSignupService: BetaSignupService,
    private readonly appConfigService: AppConfigService,
  ) {}

  // ---------------------------------------------------------------------------
  // Public — submit a beta signup request
  // ---------------------------------------------------------------------------

  @Post()
  @HttpCode(201)
  submitRequest(@Body() dto: SubmitBetaSignupDto) {
    return this.betaSignupService.submitRequest(dto);
  }

  // ---------------------------------------------------------------------------
  // Admin (internal service token) — list requests
  // ---------------------------------------------------------------------------

  @Get()
  listRequests(
    @Headers('x-internal-service-token') token: string | undefined,
    @Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED',
  ) {
    this.assertInternalServiceToken(token);
    const safeStatus =
      status === 'PENDING' || status === 'APPROVED' || status === 'REJECTED' ? status : undefined;
    return this.betaSignupService.listRequests(safeStatus);
  }

  // ---------------------------------------------------------------------------
  // Admin — review (approve / reject) a specific request
  // ---------------------------------------------------------------------------

  @Post(':id/review')
  @HttpCode(200)
  reviewRequest(
    @Param('id') id: string,
    @Body() dto: ReviewBetaSignupDto,
    @Headers('x-internal-service-token') token: string | undefined,
  ) {
    this.assertInternalServiceToken(token);
    return this.betaSignupService.reviewRequest(id, dto);
  }

  // ---------------------------------------------------------------------------
  // Admin — settings
  // ---------------------------------------------------------------------------

  @Get('settings')
  getSettings(@Headers('x-internal-service-token') token: string | undefined) {
    this.assertInternalServiceToken(token);
    return this.betaSignupService.getSettings();
  }

  @Patch('settings')
  updateSettings(
    @Body() dto: UpdateBetaSignupSettingsDto,
    @Headers('x-internal-service-token') token: string | undefined,
  ) {
    this.assertInternalServiceToken(token);
    return this.betaSignupService.updateSettings(dto);
  }

  // ---------------------------------------------------------------------------
  // Admin — graduate all (or selected) beta tenants to a new package
  // ---------------------------------------------------------------------------

  @Post('graduate')
  @HttpCode(200)
  graduateBetaTenants(
    @Body() dto: GraduateBetaTenantsDto,
    @Headers('x-internal-service-token') token: string | undefined,
  ) {
    this.assertInternalServiceToken(token);
    return this.betaSignupService.graduateBetaTenants(dto);
  }

  // ---------------------------------------------------------------------------
  // Admin — change package for a single beta signup request's provisioned tenant
  // ---------------------------------------------------------------------------

  @Patch(':id/package')
  updateTenantPackage(
    @Param('id') id: string,
    @Body() dto: UpdateTenantPackageDto,
    @Headers('x-internal-service-token') token: string | undefined,
  ) {
    this.assertInternalServiceToken(token);
    return this.betaSignupService.updateTenantPackage(id, dto);
  }

  // ---------------------------------------------------------------------------
  // Internal helper
  // ---------------------------------------------------------------------------

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
        message: 'Invalid or missing internal service token.',
      });
    }
  }
}

import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Post,
  Body,
  ServiceUnavailableException
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AppConfigService } from "../../common/config/app-config.service";
import { InternalDevicePushTestDto } from "./dto/internal-device-push-test.dto";
import { HostedPushDiagnosticsService } from "./hosted-push-diagnostics.service";

@ApiTags("internal-runtime")
@Controller("internal/runtime")
export class HostedPushDiagnosticsController {
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly hostedPushDiagnosticsService: HostedPushDiagnosticsService
  ) {}

  @Get("tenants/:tenantId/users/:userId/notification-devices")
  async listTenantUserNotificationDevices(
    @Param("tenantId") tenantId: string,
    @Param("userId") userId: string,
    @Headers("x-internal-service-token") token?: string
  ) {
    this.assertInternalServiceToken(token);
    return this.hostedPushDiagnosticsService.listTenantUserNotificationDevices(tenantId, userId);
  }

  @Post("tenants/:tenantId/push/device-tests")
  async triggerTenantDeviceTestPush(
    @Param("tenantId") tenantId: string,
    @Body() dto: InternalDevicePushTestDto,
    @Headers("x-internal-service-token") token?: string
  ) {
    this.assertInternalServiceToken(token);
    return this.hostedPushDiagnosticsService.triggerTenantDeviceTestPush(tenantId, dto);
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

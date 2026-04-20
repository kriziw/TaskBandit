import { Global, Module } from "@nestjs/common";
import { AppConfigService } from "./app-config.service";
import { HostedRuntimeConfigService } from "../tenancy/hosted-runtime-config.service";
import { TenantContextService } from "../tenancy/tenant-context.service";

@Global()
@Module({
  providers: [AppConfigService, TenantContextService, HostedRuntimeConfigService],
  exports: [AppConfigService, TenantContextService, HostedRuntimeConfigService]
})
export class AppConfigModule {}

import { Global, Module } from "@nestjs/common";
import { AppConfigService } from "./app-config.service";
import { HostedRuntimeConfigService } from "../tenancy/hosted-runtime-config.service";
import { TenantRuntimePolicyService } from "../tenancy/tenant-runtime-policy.service";
import { TenantContextService } from "../tenancy/tenant-context.service";

@Global()
@Module({
  providers: [
    AppConfigService,
    TenantContextService,
    HostedRuntimeConfigService,
    TenantRuntimePolicyService
  ],
  exports: [
    AppConfigService,
    TenantContextService,
    HostedRuntimeConfigService,
    TenantRuntimePolicyService
  ]
})
export class AppConfigModule {}

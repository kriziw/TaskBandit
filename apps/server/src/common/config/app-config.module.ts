import { Global, Module } from "@nestjs/common";
import { AppConfigService } from "./app-config.service";
import { FeatureAccessService } from "../tenancy/feature-access.service";
import { HostedRuntimeConfigService } from "../tenancy/hosted-runtime-config.service";
import { TenantRuntimePolicyService } from "../tenancy/tenant-runtime-policy.service";
import { TenantContextService } from "../tenancy/tenant-context.service";

@Global()
@Module({
  providers: [
    AppConfigService,
    TenantContextService,
    HostedRuntimeConfigService,
    FeatureAccessService,
    TenantRuntimePolicyService
  ],
  exports: [
    AppConfigService,
    TenantContextService,
    HostedRuntimeConfigService,
    FeatureAccessService,
    TenantRuntimePolicyService
  ]
})
export class AppConfigModule {}

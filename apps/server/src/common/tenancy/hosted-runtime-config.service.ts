import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { AppConfigService } from "../config/app-config.service";
import { TenantContextService } from "./tenant-context.service";

export type HostedTenantRuntimeConfig = {
  configVersion: string;
  graceEndsAt: string | null;
  billingStatus: string;
  entitlementState: string;
  hostedOidcConfig: {
    enabled: boolean;
    issuer: string | null;
    clientId: string | null;
    clientSecretRef: string | null;
    scopes: string[];
    allowedDomains: string[];
  };
  lifecycleState: string;
  planCode: string;
  providerConfigRefs: Array<{
    id: string;
    kind: string;
    environment: string;
    secretRef: string;
    active: boolean;
  }>;
  quotaPolicy: Record<string, unknown>;
  quotaPolicyVersion: string;
  suspensionReason: string | null;
  tenantId: string;
  trialEndsAt: string | null;
  updatedAt: string;
};

type CachedRuntimeConfig = {
  expiresAt: number;
  value: HostedTenantRuntimeConfig;
};

@Injectable()
export class HostedRuntimeConfigService {
  private readonly cache = new Map<string, CachedRuntimeConfig>();

  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly tenantContextService: TenantContextService
  ) {}

  async getTenantRuntimeConfigForHost(hostHeader?: string | null) {
    if (!this.appConfigService.hostedModeEnabled) {
      return null;
    }

    const tenant = await this.tenantContextService.resolveFromRequestHost(hostHeader);
    return this.getTenantRuntimeConfig(tenant.tenantId);
  }

  async getTenantRuntimeConfig(tenantId: string) {
    if (!this.appConfigService.hostedModeEnabled) {
      return null;
    }

    const cached = this.cache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const baseUrl = this.appConfigService.controlPlaneRuntimeBaseUrl;
    const token = this.appConfigService.controlPlaneInternalServiceToken;
    if (!baseUrl || !token) {
      throw new ServiceUnavailableException("Hosted runtime config is not fully configured.");
    }

    const response = await fetch(`${baseUrl}/internal/runtime/tenants/${encodeURIComponent(tenantId)}/config`, {
      headers: {
        accept: "application/json",
        "x-internal-service-token": token
      }
    });

    if (!response.ok) {
      throw new ServiceUnavailableException("Hosted runtime config could not be loaded from the control plane.");
    }

    const payload = (await response.json()) as { tenantConfig?: HostedTenantRuntimeConfig };
    if (!payload.tenantConfig) {
      throw new ServiceUnavailableException("Hosted runtime config response was incomplete.");
    }

    this.cache.set(tenantId, {
      expiresAt: Date.now() + this.appConfigService.hostedRuntimeConfigCacheTtlMs,
      value: payload.tenantConfig
    });

    return payload.tenantConfig;
  }
}

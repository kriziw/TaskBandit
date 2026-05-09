import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { AppConfigService } from "../config/app-config.service";
import { AppLogService } from "../logging/app-log.service";
import { TenantContextService } from "./tenant-context.service";
import { TenantRequestContext } from "../http/request-url.util";

export type HostedTenantRuntimeConfig = {
  compatibilityMode: string;
  configVersion: string;
  contractVersion: string;
  graceEndsAt: string | null;
  billingStatus: string;
  entitlementState: string;
  featureAccess: Record<string, boolean>;
  hostedOidcConfig: {
    enabled: boolean;
    issuer: string | null;
    clientId: string | null;
    clientSecretRef: string | null;
    scopes: string[];
    allowedDomains: string[];
  };
  lifecycleState: string;
  packageCode: string;
  packageDisplayName: string | null;
  packageRevisionId: string | null;
  packageRevisionNumber: number | null;
  planCode: string;
  integrations: Array<{
    active: boolean;
    category: string | null;
    health: {
      basic: {
        checks: Array<{
          depth: "basic" | "deep";
          detail: string;
          label: string;
          status: string;
        }>;
        status: string;
      };
      deep: {
        checks: Array<{
          depth: "basic" | "deep";
          detail: string;
          label: string;
          status: string;
        }>;
        status: string;
      };
    };
    lastValidatedAt: string | null;
    pluginId: string;
    providerId: string | null;
    providerKey: string | null;
    status: string;
    updatedAt: string | null;
    validation: {
      lastResult: string;
      message: string | null;
      summary: string | null;
    };
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

type ControlPlaneRuntimeErrorPayload = {
  code?: string;
  details?: {
    reason?: string;
  };
  error?: {
    code?: string;
    details?: {
      reason?: string;
    };
    message?: string;
  };
  message?: string;
};

type RuntimeConfigFailureContext = {
  reason: string;
  statusCode: number;
  upstreamCode: string | null;
};

@Injectable()
export class HostedRuntimeConfigService {
  private readonly cache = new Map<string, CachedRuntimeConfig>();

  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly tenantContextService: TenantContextService,
    private readonly appLogService: AppLogService
  ) {}

  async getTenantRuntimeConfigForHost(hostHeader?: string | null) {
    return this.getTenantRuntimeConfigForRequest({
      hostHeader
    });
  }

  async getTenantRuntimeConfigForRequest(request?: TenantRequestContext | null) {
    if (!this.appConfigService.hostedModeEnabled) {
      return null;
    }

    const tenant = await this.tenantContextService.resolveFromRequest(request);
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
      throw this.buildServiceUnavailableError(
        "Hosted runtime config is not fully configured.",
        {
          reason: "control_plane_config_missing",
          statusCode: 503,
          upstreamCode: null
        }
      );
    }

    const response = await fetch(`${baseUrl}/internal/runtime/tenants/${encodeURIComponent(tenantId)}/config`, {
      headers: {
        accept: "application/json",
        "x-internal-service-token": token,
        [runtimeConfigContractVersionHeader]: runtimeConfigContractVersion
      }
    });

    if (!response.ok) {
      const failure = await this.readControlPlaneFailureContext(response);
      this.logRuntimeConfigFailure(tenantId, failure);
      throw this.buildServiceUnavailableError(
        "Hosted runtime config could not be loaded from the control plane.",
        failure
      );
    }

    const payload = (await response.json()) as { tenantConfig?: HostedTenantRuntimeConfig };
    if (!payload.tenantConfig) {
      const failure = {
        reason: "control_plane_payload_incomplete",
        statusCode: 503,
        upstreamCode: null
      };
      this.logRuntimeConfigFailure(tenantId, failure);
      throw this.buildServiceUnavailableError(
        "Hosted runtime config response was incomplete.",
        failure
      );
    }

    this.cache.set(tenantId, {
      expiresAt: Date.now() + this.appConfigService.hostedRuntimeConfigCacheTtlMs,
      value: payload.tenantConfig
    });

    return payload.tenantConfig;
  }

  private async readControlPlaneFailureContext(response: Response): Promise<RuntimeConfigFailureContext> {
    const payload = (await response.json().catch(() => null)) as ControlPlaneRuntimeErrorPayload | null;
    const topLevelCode = this.normalizeString(payload?.code);
    const nestedCode = this.normalizeString(payload?.error?.code);
    const upstreamCode = nestedCode ?? topLevelCode ?? null;
    const topLevelReason = this.normalizeString(payload?.details?.reason);
    const nestedReason = this.normalizeString(payload?.error?.details?.reason);
    const upstreamReason = nestedReason ?? topLevelReason ?? null;

    return {
      reason: this.normalizeFailureReason(upstreamReason, response.status),
      statusCode: response.status,
      upstreamCode
    };
  }

  private normalizeFailureReason(upstreamReason: string | null, statusCode: number) {
    if (upstreamReason && allowedControlPlaneReasonCodes.has(upstreamReason)) {
      return upstreamReason;
    }

    if (statusCode === 404) {
      return "runtime_tenant_not_mapped";
    }
    if (statusCode === 403) {
      return "control_plane_forbidden";
    }
    if (statusCode === 401) {
      return "control_plane_unauthorized";
    }
    if (statusCode === 409) {
      return "runtime_contract_version_incompatible";
    }
    if (statusCode >= 500) {
      return "control_plane_unavailable";
    }
    return "control_plane_rejected_request";
  }

  private buildServiceUnavailableError(message: string, failure: RuntimeConfigFailureContext) {
    return new ServiceUnavailableException({
      code: "hosted_runtime_config_unavailable",
      details: {
        reason: failure.reason,
        upstreamCode: failure.upstreamCode,
        upstreamStatusCode: failure.statusCode
      },
      message
    });
  }

  private logRuntimeConfigFailure(tenantId: string, failure: RuntimeConfigFailureContext) {
    this.appLogService.warn(
      `[hosted-runtime-config] ${JSON.stringify({
        reason: failure.reason,
        statusCode: failure.statusCode,
        tenantId,
        upstreamCode: failure.upstreamCode
      })}`,
      "HostedRuntimeConfigService"
    );
  }

  private normalizeString(value: unknown) {
    if (typeof value !== "string") {
      return null;
    }

    const normalized = value.trim();
    return normalized === "" ? null : normalized;
  }
}

const allowedControlPlaneReasonCodes = new Set([
  "internal_service_token_not_configured",
  "runtime_contract_version_incompatible",
  "runtime_tenant_not_mapped",
  "token_invalid",
  "token_missing"
]);

const runtimeConfigContractVersion = "1.0.0";
const runtimeConfigContractVersionHeader = "x-taskbandit-runtime-contract-version";

import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { AppLogService } from '../logging/app-log.service';
import { TenantContextService } from './tenant-context.service';
import { TenantRequestContext } from '../http/request-url.util';

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
  hostedPushConfig?: {
    fcm?: {
      enabled: boolean;
      serviceAccountBase64: string | null;
    };
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
          depth: 'basic' | 'deep';
          detail: string;
          label: string;
          status: string;
        }>;
        status: string;
      };
      deep: {
        checks: Array<{
          depth: 'basic' | 'deep';
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
  betaStatus: {
    isBeta: boolean;
    endDate: string | null;
    tenantBetaEndsAt: string | null;
  } | null;
};

type CachedRuntimeConfig = {
  cachedAt: number;
  expiresAt: number;
  value: HostedTenantRuntimeConfig;
};

type ControlPlaneRuntimeErrorPayload = {
  code?: string;
  details?: {
    hint?: string;
    reason?: string;
  };
  error?: {
    code?: string;
    details?: {
      hint?: string;
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
  upstreamHint: string | null;
  upstreamMessage: string | null;
};

@Injectable()
export class HostedRuntimeConfigService {
  private readonly cache = new Map<string, CachedRuntimeConfig>();

  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly tenantContextService: TenantContextService,
    private readonly appLogService: AppLogService,
  ) {}

  async getTenantRuntimeConfigForHost(hostHeader?: string | null) {
    return this.getTenantRuntimeConfigForRequest({
      hostHeader,
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

    const now = Date.now();
    const cached = this.cache.get(tenantId);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const baseUrl = this.appConfigService.controlPlaneRuntimeBaseUrl;
    const token = this.appConfigService.controlPlaneInternalServiceToken;
    if (!baseUrl || !token) {
      throw this.buildServiceUnavailableError('Hosted runtime config is not fully configured.', {
        reason: 'control_plane_config_missing',
        statusCode: 503,
        upstreamCode: null,
        upstreamHint: null,
        upstreamMessage: null,
      });
    }

    let response: Response;
    try {
      response = await fetch(
        `${baseUrl}/internal/runtime/tenants/${encodeURIComponent(tenantId)}/config`,
        {
          headers: {
            accept: 'application/json',
            'x-internal-service-token': token,
            [runtimeConfigContractVersionHeader]: runtimeConfigContractVersion,
          },
        },
      );
    } catch (error) {
      const failure = {
        reason: 'control_plane_unavailable',
        statusCode: 503,
        upstreamCode: null,
        upstreamHint: 'network_request_failed',
        upstreamMessage: error instanceof Error ? error.message : String(error ?? ''),
      } satisfies RuntimeConfigFailureContext;
      this.logRuntimeConfigFailure(tenantId, failure);
      return this.resolveWithStaleCacheOrThrow({
        cached,
        failure,
        message: 'Hosted runtime config could not be loaded from the control plane.',
        tenantId,
      });
    }

    if (!response.ok) {
      const failure = await this.readControlPlaneFailureContext(response);
      this.logRuntimeConfigFailure(tenantId, failure);
      return this.resolveWithStaleCacheOrThrow({
        cached,
        failure,
        message: 'Hosted runtime config could not be loaded from the control plane.',
        tenantId,
      });
    }

    const payload = (await response.json()) as { tenantConfig?: HostedTenantRuntimeConfig };
    if (!payload.tenantConfig) {
      const failure = {
        reason: 'control_plane_payload_incomplete',
        statusCode: 503,
        upstreamCode: null,
        upstreamHint: null,
        upstreamMessage: null,
      } satisfies RuntimeConfigFailureContext;
      this.logRuntimeConfigFailure(tenantId, failure);
      return this.resolveWithStaleCacheOrThrow({
        cached,
        failure,
        message: 'Hosted runtime config response was incomplete.',
        tenantId,
      });
    }

    this.cache.set(tenantId, {
      cachedAt: now,
      expiresAt: now + this.appConfigService.hostedRuntimeConfigCacheTtlMs,
      value: payload.tenantConfig,
    });

    return payload.tenantConfig;
  }

  private async readControlPlaneFailureContext(
    response: Response,
  ): Promise<RuntimeConfigFailureContext> {
    const payload = (await response
      .json()
      .catch(() => null)) as ControlPlaneRuntimeErrorPayload | null;
    const topLevelCode = this.normalizeString(payload?.code);
    const nestedCode = this.normalizeString(payload?.error?.code);
    const upstreamCode = nestedCode ?? topLevelCode ?? null;
    const topLevelReason = this.normalizeString(payload?.details?.reason);
    const nestedReason = this.normalizeString(payload?.error?.details?.reason);
    const upstreamReason = nestedReason ?? topLevelReason ?? null;
    const nestedMessage = this.normalizeString(payload?.error?.message);
    const topLevelMessage = this.normalizeString(payload?.message);
    const upstreamMessage = nestedMessage ?? topLevelMessage ?? null;
    const nestedHint = this.normalizeString(payload?.error?.details?.hint);
    const topLevelHint = this.normalizeString(payload?.details?.hint);
    const upstreamHint = nestedHint ?? topLevelHint ?? null;

    return {
      reason: this.normalizeFailureReason(upstreamReason, response.status),
      statusCode: response.status,
      upstreamCode,
      upstreamHint,
      upstreamMessage,
    };
  }

  private normalizeFailureReason(upstreamReason: string | null, statusCode: number) {
    if (upstreamReason && allowedControlPlaneReasonCodes.has(upstreamReason)) {
      return upstreamReason;
    }

    if (statusCode === 404) {
      return 'runtime_tenant_not_mapped';
    }
    if (statusCode === 403) {
      return 'control_plane_forbidden';
    }
    if (statusCode === 401) {
      return 'control_plane_unauthorized';
    }
    if (statusCode === 409) {
      return 'runtime_contract_version_incompatible';
    }
    if (statusCode >= 500) {
      return 'control_plane_unavailable';
    }
    return 'control_plane_rejected_request';
  }

  private buildServiceUnavailableError(message: string, failure: RuntimeConfigFailureContext) {
    return new ServiceUnavailableException({
      code: 'hosted_runtime_config_unavailable',
      details: {
        reason: failure.reason,
        upstreamCode: failure.upstreamCode,
        upstreamStatusCode: failure.statusCode,
      },
      message,
    });
  }

  private logRuntimeConfigFailure(tenantId: string, failure: RuntimeConfigFailureContext) {
    this.appLogService.warn(
      `[hosted-runtime-config] ${JSON.stringify({
        reason: failure.reason,
        statusCode: failure.statusCode,
        tenantId,
        upstreamCode: failure.upstreamCode,
        upstreamHint: failure.upstreamHint,
        upstreamMessage: failure.upstreamMessage,
      })}`,
      'HostedRuntimeConfigService',
    );
  }

  private resolveWithStaleCacheOrThrow(input: {
    cached?: CachedRuntimeConfig;
    failure: RuntimeConfigFailureContext;
    message: string;
    tenantId: string;
  }) {
    const cached = input.cached;
    if (cached) {
      const staleAgeMs = Date.now() - cached.expiresAt;
      if (staleAgeMs >= 0 && staleAgeMs <= hostedRuntimeConfigStaleCacheWindowMs) {
        this.appLogService.warn(
          `[hosted-runtime-config] using_stale_cache ${JSON.stringify({
            reason: input.failure.reason,
            staleAgeMs,
            tenantId: input.tenantId,
            upstreamCode: input.failure.upstreamCode,
            upstreamHint: input.failure.upstreamHint,
            upstreamStatusCode: input.failure.statusCode,
          })}`,
          'HostedRuntimeConfigService',
        );
        return cached.value;
      }
    }

    throw this.buildServiceUnavailableError(input.message, input.failure);
  }

  private normalizeString(value: unknown) {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim();
    return normalized === '' ? null : normalized;
  }
}

const allowedControlPlaneReasonCodes = new Set([
  'internal_service_token_not_configured',
  'runtime_contract_version_incompatible',
  'runtime_tenant_not_mapped',
  'token_invalid',
  'token_missing',
]);

const runtimeConfigContractVersion = '1.0.0';
const runtimeConfigContractVersionHeader = 'x-taskbandit-runtime-contract-version';
const hostedRuntimeConfigStaleCacheWindowMs = 5 * 60_000;

import { ForbiddenException, Injectable } from "@nestjs/common";
import { HostedRuntimeConfigService } from "./hosted-runtime-config.service";

export const packageFeatureIds = [
  "templates_manage",
  "chores_manage",
  "reassignment",
  "takeover_direct",
  "takeover_requests",
  "approvals",
  "proof_uploads",
  "follow_up_automation",
  "external_completion",
  "deferred_follow_up_control"
] as const;

export type PackageFeatureId = (typeof packageFeatureIds)[number];

export type FeatureAccess = Record<PackageFeatureId, boolean>;

const fullFeatureAccess = Object.freeze(
  Object.fromEntries(packageFeatureIds.map((featureId) => [featureId, true])) as FeatureAccess
);

@Injectable()
export class FeatureAccessService {
  constructor(private readonly hostedRuntimeConfigService: HostedRuntimeConfigService) {}

  async getFeatureAccessForTenant(tenantId: string): Promise<FeatureAccess> {
    const config = await this.hostedRuntimeConfigService.getTenantRuntimeConfig(tenantId);
    return this.normalizeFeatureAccess(config?.featureAccess);
  }

  normalizeFeatureAccess(input: Record<string, unknown> | null | undefined): FeatureAccess {
    const next = { ...fullFeatureAccess };
    if (!input || typeof input !== "object") {
      return next;
    }

    for (const featureId of packageFeatureIds) {
      if (Object.prototype.hasOwnProperty.call(input, featureId)) {
        next[featureId] = Boolean(input[featureId]);
      }
    }

    return next;
  }

  assertEnabled(featureAccess: FeatureAccess, featureId: PackageFeatureId) {
    if (featureAccess[featureId]) {
      return;
    }

    throw new ForbiddenException({
      code: "package_feature_disabled",
      message: `The ${featureId} feature is not enabled for this package.`
    });
  }
}

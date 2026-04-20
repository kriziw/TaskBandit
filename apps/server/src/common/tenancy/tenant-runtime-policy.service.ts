import { ForbiddenException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { AppConfigService } from "../config/app-config.service";
import {
  HostedRuntimeConfigService,
  type HostedTenantRuntimeConfig
} from "./hosted-runtime-config.service";

export type TenantRuntimeAction =
  | "member_create"
  | "proof_upload"
  | "notification_enqueue"
  | "notification_delivery"
  | "notification_retry"
  | "runtime_logs";

export type TenantRuntimeQuotaPolicy = {
  membersLimit: number | null;
  storageBytesLimit: number | null;
  monthlyNotificationLimit: number | null;
  exportRetentionDays: number | null;
  proofRetentionDays: number | null;
  auditRetentionDays: number | null;
  customDomainEnabled: boolean | null;
  brandingEnabled: boolean | null;
};

export type TenantRuntimeAccessState = {
  tenantId: string;
  hostedMode: boolean;
  lifecycleState: string;
  entitlementState: string;
  billingStatus: string;
  suspensionReason: string | null;
  trialEndsAt: string | null;
  graceEndsAt: string | null;
  planCode: string;
  quotaPolicyVersion: string;
  configVersion: string;
  updatedAt: string | null;
  quotas: TenantRuntimeQuotaPolicy;
};

type TenantRuntimeDecision = {
  allowed: boolean;
  reason: string | null;
};

const defaultQuotaPolicy: TenantRuntimeQuotaPolicy = {
  membersLimit: null,
  storageBytesLimit: null,
  monthlyNotificationLimit: null,
  exportRetentionDays: null,
  proofRetentionDays: null,
  auditRetentionDays: null,
  customDomainEnabled: null,
  brandingEnabled: null
};

@Injectable()
export class TenantRuntimePolicyService {
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly hostedRuntimeConfigService: HostedRuntimeConfigService
  ) {}

  async getTenantAccessState(tenantId: string): Promise<TenantRuntimeAccessState> {
    if (!this.appConfigService.hostedModeEnabled) {
      return {
        tenantId,
        hostedMode: false,
        lifecycleState: "self_hosted",
        entitlementState: "self_hosted",
        billingStatus: "none",
        suspensionReason: null,
        trialEndsAt: null,
        graceEndsAt: null,
        planCode: "self-hosted",
        quotaPolicyVersion: "self-hosted",
        configVersion: "self-hosted",
        updatedAt: null,
        quotas: defaultQuotaPolicy
      };
    }

    const config = await this.loadHostedConfig(tenantId);
    return {
      tenantId,
      hostedMode: true,
      lifecycleState: config.lifecycleState,
      entitlementState: config.entitlementState,
      billingStatus: config.billingStatus,
      suspensionReason: config.suspensionReason,
      trialEndsAt: config.trialEndsAt,
      graceEndsAt: config.graceEndsAt,
      planCode: config.planCode,
      quotaPolicyVersion: config.quotaPolicyVersion,
      configVersion: config.configVersion,
      updatedAt: config.updatedAt,
      quotas: this.parseQuotaPolicy(config.quotaPolicy)
    };
  }

  async assertActionAllowed(tenantId: string, action: TenantRuntimeAction) {
    const decision = await this.getActionDecision(tenantId, action);
    if (!decision.allowed) {
      throw new ForbiddenException({
        message: decision.reason ?? "That tenant action is blocked by the hosted runtime policy."
      });
    }
  }

  async getActionDecision(
    tenantId: string,
    action: TenantRuntimeAction
  ): Promise<TenantRuntimeDecision> {
    const state = await this.getTenantAccessState(tenantId);

    if (!state.hostedMode) {
      return {
        allowed: true,
        reason: null
      };
    }

    const blockingMessage = this.resolveLifecycleBlockMessage(state, action);
    if (blockingMessage) {
      return {
        allowed: false,
        reason: blockingMessage
      };
    }

    return {
      allowed: true,
      reason: null
    };
  }

  async assertMembersLimit(tenantId: string, currentMembers: number, additionalMembers = 1) {
    const state = await this.getTenantAccessState(tenantId);
    const limit = state.quotas.membersLimit;
    if (limit === null) {
      return;
    }

    if (currentMembers + additionalMembers > limit) {
      throw new ForbiddenException({
        message: `This hosted tenant has reached the current household member limit of ${limit}.`
      });
    }
  }

  async assertStorageBytesLimit(tenantId: string, currentBytes: number, incomingBytes = 0) {
    const state = await this.getTenantAccessState(tenantId);
    const limit = state.quotas.storageBytesLimit;
    if (limit === null) {
      return;
    }

    if (currentBytes + incomingBytes > limit) {
      throw new ForbiddenException({
        message: "This hosted tenant has reached the current proof storage limit."
      });
    }
  }

  async assertMonthlyNotificationLimit(tenantId: string, currentCount: number, additionalCount = 1) {
    const state = await this.getTenantAccessState(tenantId);
    const limit = state.quotas.monthlyNotificationLimit;
    if (limit === null) {
      return;
    }

    if (currentCount + additionalCount > limit) {
      throw new ForbiddenException({
        message: "This hosted tenant has reached the current monthly notification limit."
      });
    }
  }

  private async loadHostedConfig(tenantId: string) {
    try {
      const config = await this.hostedRuntimeConfigService.getTenantRuntimeConfig(tenantId);
      if (!config) {
        throw new ServiceUnavailableException(
          "Hosted tenant runtime state is missing for a hosted deployment."
        );
      }

      return config;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new ServiceUnavailableException(
        "Hosted tenant runtime state could not be loaded for runtime enforcement."
      );
    }
  }

  private parseQuotaPolicy(quotaPolicy: Record<string, unknown>): TenantRuntimeQuotaPolicy {
    return {
      membersLimit: this.readInteger(quotaPolicy.membersLimit),
      storageBytesLimit: this.readInteger(quotaPolicy.storageBytesLimit),
      monthlyNotificationLimit: this.readInteger(quotaPolicy.monthlyNotificationLimit),
      exportRetentionDays: this.readInteger(quotaPolicy.exportRetentionDays),
      proofRetentionDays: this.readInteger(quotaPolicy.proofRetentionDays),
      auditRetentionDays: this.readInteger(quotaPolicy.auditRetentionDays),
      customDomainEnabled: this.readBoolean(quotaPolicy.customDomainEnabled),
      brandingEnabled: this.readBoolean(quotaPolicy.brandingEnabled)
    };
  }

  private readInteger(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }

  private readBoolean(value: unknown) {
    return typeof value === "boolean" ? value : null;
  }

  private resolveLifecycleBlockMessage(
    state: TenantRuntimeAccessState,
    action: TenantRuntimeAction
  ) {
    switch (state.lifecycleState) {
      case "provisioning":
        return "This hosted tenant is still provisioning, so runtime side effects are not available yet.";
      case "archived":
      case "deleting":
      case "deleted":
        return "This hosted tenant is no longer active for runtime write or delivery actions.";
      case "suspended":
        return this.resolveSuspensionMessage(state, action);
      default:
        break;
    }

    if (state.entitlementState === "suspended") {
      return this.resolveSuspensionMessage(state, action);
    }

    return null;
  }

  private resolveSuspensionMessage(
    state: TenantRuntimeAccessState,
    action: TenantRuntimeAction
  ) {
    switch (action) {
      case "runtime_logs":
        return "Runtime log access is not available for hosted tenants.";
      case "member_create":
        return `This tenant is suspended${this.formatSuspensionReason(state.suspensionReason)}, so new invites and members are blocked.`;
      case "proof_upload":
        return `This tenant is suspended${this.formatSuspensionReason(state.suspensionReason)}, so proof uploads are blocked.`;
      case "notification_enqueue":
      case "notification_delivery":
      case "notification_retry":
        return `This tenant is suspended${this.formatSuspensionReason(state.suspensionReason)}, so non-essential notifications are blocked.`;
      default:
        return `This tenant is suspended${this.formatSuspensionReason(state.suspensionReason)}.`;
    }
  }

  private formatSuspensionReason(reason: string | null) {
    return reason ? ` (${reason})` : "";
  }
}

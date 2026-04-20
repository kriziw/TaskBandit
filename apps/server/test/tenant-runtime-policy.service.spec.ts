import { ForbiddenException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TenantRuntimePolicyService } from "../src/common/tenancy/tenant-runtime-policy.service";

describe("TenantRuntimePolicyService", () => {
  let appConfigService: {
    hostedModeEnabled: boolean;
  };
  let hostedRuntimeConfigService: {
    getTenantRuntimeConfig: ReturnType<typeof vi.fn>;
  };
  let service: TenantRuntimePolicyService;

  beforeEach(() => {
    appConfigService = {
      hostedModeEnabled: true
    };
    hostedRuntimeConfigService = {
      getTenantRuntimeConfig: vi.fn().mockResolvedValue({
        tenantId: "tenant-1",
        lifecycleState: "active",
        entitlementState: "active",
        billingStatus: "active",
        suspensionReason: null,
        trialEndsAt: null,
        graceEndsAt: null,
        planCode: "family",
        quotaPolicyVersion: "quota-v1",
        configVersion: "config-v1",
        updatedAt: new Date().toISOString(),
        hostedOidcConfig: {
          enabled: false,
          issuer: null,
          clientId: null,
          clientSecretRef: null,
          scopes: [],
          allowedDomains: []
        },
        providerConfigRefs: [],
        quotaPolicy: {
          membersLimit: 5,
          storageBytesLimit: 1024,
          monthlyNotificationLimit: 10
        }
      })
    };

    service = new TenantRuntimePolicyService(appConfigService as never, hostedRuntimeConfigService as never);
  });

  it("allows self-hosted tenants to bypass hosted quota enforcement", async () => {
    appConfigService.hostedModeEnabled = false;

    await expect(service.assertMembersLimit("tenant-1", 999, 1)).resolves.toBeUndefined();
    await expect(service.assertActionAllowed("tenant-1", "proof_upload")).resolves.toBeUndefined();
  });

  it("blocks suspended tenants from proof uploads", async () => {
    hostedRuntimeConfigService.getTenantRuntimeConfig.mockResolvedValue({
      ...(await hostedRuntimeConfigService.getTenantRuntimeConfig()),
      lifecycleState: "suspended",
      entitlementState: "suspended",
      suspensionReason: "payment overdue"
    });

    await expect(service.assertActionAllowed("tenant-1", "proof_upload")).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });

  it("enforces member and notification quotas from the hosted runtime contract", async () => {
    await expect(service.assertMembersLimit("tenant-1", 5, 1)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.assertMonthlyNotificationLimit("tenant-1", 10, 1)).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });
});

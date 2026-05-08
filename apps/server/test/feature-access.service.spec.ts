import { describe, expect, it, vi } from "vitest";
import { FeatureAccessService } from "../src/common/tenancy/feature-access.service";

describe("FeatureAccessService", () => {
  const service = new FeatureAccessService({
    getTenantRuntimeConfig: vi.fn()
  } as never);

  it("keeps defaults when legacy values are null or undefined", () => {
    const normalized = service.normalizeFeatureAccess({
      templates_manage: null,
      chores_manage: undefined
    });

    expect(normalized.templates_manage).toBe(true);
    expect(normalized.chores_manage).toBe(true);
  });

  it("coerces explicit string and numeric flags", () => {
    const normalized = service.normalizeFeatureAccess({
      templates_manage: "off",
      chores_manage: "yes",
      approvals: 0,
      follow_up_automation: 1
    });

    expect(normalized.templates_manage).toBe(false);
    expect(normalized.chores_manage).toBe(true);
    expect(normalized.approvals).toBe(false);
    expect(normalized.follow_up_automation).toBe(true);
  });
});

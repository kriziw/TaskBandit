import { ForbiddenException, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsController } from "../src/modules/analytics/analytics.controller";

describe("AnalyticsController", () => {
  let analyticsService: {
    getPlatformSummary: ReturnType<typeof vi.fn>;
    getAllTenantSnapshots: ReturnType<typeof vi.fn>;
    getTenantSnapshot: ReturnType<typeof vi.fn>;
  };
  let appConfigService: {
    controlPlaneInternalServiceToken: string;
  };
  let controller: AnalyticsController;

  const SUMMARY = {
    generatedAt: "2026-01-01T00:00:00.000Z",
    households: { total: 3, withOnboardingCompleted: 2, withAtLeastOneChoreCompleted: 2, withRewardRedemption: 1, withRegisteredDevices: 2, byPlatform: { android: 2 } },
    choreActivity: { completedLast7Days: 10, completedLast30Days: 40, pendingApproval: 1 },
    rewardActivity: { redeemedLast7Days: 3, redeemedLast30Days: 12 },
  };

  const SNAPSHOTS = {
    generatedAt: "2026-01-01T00:00:00.000Z",
    tenants: [
      { runtimeTenantId: "rt-1", memberCount: 4, childCount: 2, onboardingCompleted: true, lastActivityAt: "2026-01-01T00:00:00.000Z" },
    ],
  };

  const SINGLE_SNAPSHOT = {
    runtimeTenantId: "rt-1",
    memberCount: 4,
    childCount: 2,
    onboardingCompleted: true,
    choreCompletedCount30d: 15,
    lastActivityAt: "2026-01-01T00:00:00.000Z",
  };

  beforeEach(() => {
    analyticsService = {
      getPlatformSummary: vi.fn().mockResolvedValue(SUMMARY),
      getAllTenantSnapshots: vi.fn().mockResolvedValue(SNAPSHOTS),
      getTenantSnapshot: vi.fn().mockResolvedValue(SINGLE_SNAPSHOT),
    };
    appConfigService = {
      controlPlaneInternalServiceToken: "internal-token",
    };

    controller = new AnalyticsController(
      appConfigService as never,
      analyticsService as never,
    );
  });

  // ─── Auth ──────────────────────────────────────────────────────────────────

  it("rejects summary when token is invalid", async () => {
    await expect(controller.getPlatformSummary("bad-token")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects tenant list when token is invalid", async () => {
    await expect(controller.getAllTenantSnapshots("bad-token")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects tenant detail when token is invalid", async () => {
    await expect(controller.getTenantSnapshot("rt-1", "bad-token")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects requests when internal service token is not configured", async () => {
    appConfigService.controlPlaneInternalServiceToken = "";
    await expect(controller.getPlatformSummary("any-token")).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  // ─── Summary ───────────────────────────────────────────────────────────────

  it("returns platform summary when token is valid", async () => {
    await expect(controller.getPlatformSummary("internal-token")).resolves.toMatchObject({
      households: { total: 3 },
      choreActivity: { completedLast30Days: 40 },
    });
    expect(analyticsService.getPlatformSummary).toHaveBeenCalledOnce();
  });

  // ─── All Tenant Snapshots ──────────────────────────────────────────────────

  it("returns all tenant snapshots when token is valid", async () => {
    const result = await controller.getAllTenantSnapshots("internal-token");
    expect(result).toMatchObject({ tenants: expect.arrayContaining([expect.objectContaining({ runtimeTenantId: "rt-1" })]) });
    expect(analyticsService.getAllTenantSnapshots).toHaveBeenCalledOnce();
  });

  // ─── Single Tenant Snapshot ────────────────────────────────────────────────

  it("returns single tenant snapshot when tenant exists", async () => {
    const result = await controller.getTenantSnapshot("rt-1", "internal-token");
    expect(result).toMatchObject({ memberCount: 4, onboardingCompleted: true });
    expect(analyticsService.getTenantSnapshot).toHaveBeenCalledWith("rt-1");
  });

  it("propagates NotFoundException when tenant is not found", async () => {
    analyticsService.getTenantSnapshot.mockRejectedValue(new NotFoundException({ code: "tenant_not_found" }));
    await expect(controller.getTenantSnapshot("missing", "internal-token")).rejects.toBeInstanceOf(NotFoundException);
  });
});

import { ForbiddenException, ServiceUnavailableException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HostedPushDiagnosticsController } from "../src/modules/dashboard/hosted-push-diagnostics.controller";

describe("HostedPushDiagnosticsController", () => {
  let hostedPushDiagnosticsService: {
    listTenantUserNotificationDevices: ReturnType<typeof vi.fn>;
    triggerTenantDeviceTestPush: ReturnType<typeof vi.fn>;
  };
  let appConfigService: {
    controlPlaneInternalServiceToken: string;
  };
  let controller: HostedPushDiagnosticsController;

  beforeEach(() => {
    hostedPushDiagnosticsService = {
      listTenantUserNotificationDevices: vi.fn().mockResolvedValue({
        user: { id: "user-1", displayName: "Alex", householdId: "home-1" },
        devices: []
      }),
      triggerTenantDeviceTestPush: vi.fn().mockResolvedValue({
        tenantId: "tenant-1",
        deliveryId: "delivery-1",
        notificationId: "notification-1"
      })
    };
    appConfigService = {
      controlPlaneInternalServiceToken: "internal-token"
    };

    controller = new HostedPushDiagnosticsController(
      appConfigService as never,
      hostedPushDiagnosticsService as never
    );
  });

  it("lists notification devices when the internal token is valid", async () => {
    await expect(
      controller.listTenantUserNotificationDevices("tenant-1", "user-1", "internal-token")
    ).resolves.toMatchObject({
      user: { id: "user-1" }
    });

    expect(hostedPushDiagnosticsService.listTenantUserNotificationDevices).toHaveBeenCalledWith(
      "tenant-1",
      "user-1"
    );
  });

  it("triggers device tests when the internal token is valid", async () => {
    await expect(
      controller.triggerTenantDeviceTestPush(
        "tenant-1",
        { userId: "user-1", deviceId: "device-1" },
        "internal-token"
      )
    ).resolves.toMatchObject({
      deliveryId: "delivery-1"
    });
    expect(hostedPushDiagnosticsService.triggerTenantDeviceTestPush).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({ deviceId: "device-1", userId: "user-1" })
    );
  });

  it("rejects requests when token is invalid", async () => {
    await expect(
      controller.listTenantUserNotificationDevices("tenant-1", "user-1", "bad-token")
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects requests when internal service token is not configured", async () => {
    appConfigService.controlPlaneInternalServiceToken = "";

    await expect(
      controller.triggerTenantDeviceTestPush(
        "tenant-1",
        { userId: "user-1", deviceId: "device-1" },
        "any-token"
      )
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

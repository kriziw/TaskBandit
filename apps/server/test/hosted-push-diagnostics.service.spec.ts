import { beforeEach, describe, expect, it, vi } from "vitest";
import { HostedPushDiagnosticsService } from "../src/modules/dashboard/hosted-push-diagnostics.service";

describe("HostedPushDiagnosticsService", () => {
  let repository: {
    listNotificationDevicesForTenantUser: ReturnType<typeof vi.fn>;
    enqueueTargetedDeviceTestPush: ReturnType<typeof vi.fn>;
    getPushDeliveryById: ReturnType<typeof vi.fn>;
  };
  let pushDeliveryWorkerService: {
    runOnceForDelivery: ReturnType<typeof vi.fn>;
  };
  let runtimeTenantScopeResolverService: {
    resolveTenantIdForDiagnostics: ReturnType<typeof vi.fn>;
  };
  let service: HostedPushDiagnosticsService;

  beforeEach(() => {
    repository = {
      listNotificationDevicesForTenantUser: vi.fn().mockResolvedValue({
        user: { id: "user-1" },
        devices: []
      }),
      enqueueTargetedDeviceTestPush: vi.fn().mockResolvedValue({
        queuedAt: "2026-05-11T00:00:00.000Z",
        notificationId: "notification-1",
        deliveryId: "delivery-1",
        userId: "user-1",
        userDisplayName: "Alex",
        device: { id: "device-1" }
      }),
      getPushDeliveryById: vi.fn().mockResolvedValue({ id: "delivery-1", status: "pending" })
    };

    pushDeliveryWorkerService = {
      runOnceForDelivery: vi.fn().mockResolvedValue({ processed: true })
    };

    runtimeTenantScopeResolverService = {
      resolveTenantIdForDiagnostics: vi.fn().mockResolvedValue("41f9cc5d-9b31-4a57-9b30-ec2f52236ab7")
    };

    service = new HostedPushDiagnosticsService(
      repository as never,
      pushDeliveryWorkerService as never,
      runtimeTenantScopeResolverService as never
    );
  });

  it("resolves tenant scope before listing user notification devices", async () => {
    await service.listTenantUserNotificationDevices("tenant_31", "  user-1  ");

    expect(runtimeTenantScopeResolverService.resolveTenantIdForDiagnostics).toHaveBeenCalledWith({
      tenantScope: "tenant_31",
      userId: "user-1"
    });
    expect(repository.listNotificationDevicesForTenantUser).toHaveBeenCalledWith(
      "41f9cc5d-9b31-4a57-9b30-ec2f52236ab7",
      "user-1"
    );
  });

  it("resolves tenant scope before queuing and dispatching targeted push tests", async () => {
    const result = await service.triggerTenantDeviceTestPush("tenant_31", {
      userId: " user-1 ",
      deviceId: " device-1 ",
      reason: "debug"
    });

    expect(runtimeTenantScopeResolverService.resolveTenantIdForDiagnostics).toHaveBeenCalledWith({
      tenantScope: "tenant_31",
      userId: "user-1",
      deviceId: "device-1"
    });
    expect(repository.enqueueTargetedDeviceTestPush).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "41f9cc5d-9b31-4a57-9b30-ec2f52236ab7",
        userId: "user-1",
        deviceId: "device-1"
      })
    );
    expect(pushDeliveryWorkerService.runOnceForDelivery).toHaveBeenCalledWith(
      "41f9cc5d-9b31-4a57-9b30-ec2f52236ab7",
      "delivery-1"
    );
    expect(repository.getPushDeliveryById).toHaveBeenCalledWith(
      "delivery-1",
      "41f9cc5d-9b31-4a57-9b30-ec2f52236ab7"
    );
    expect(result).toMatchObject({
      tenantId: "41f9cc5d-9b31-4a57-9b30-ec2f52236ab7",
      requestedTenantId: "tenant_31"
    });
  });
});

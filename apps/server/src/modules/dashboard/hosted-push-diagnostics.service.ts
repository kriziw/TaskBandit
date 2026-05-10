import { Injectable } from "@nestjs/common";
import { HouseholdRepository } from "../household/household.repository";
import { InternalDevicePushTestDto } from "./dto/internal-device-push-test.dto";
import { PushDeliveryWorkerService } from "./push-delivery-worker.service";

@Injectable()
export class HostedPushDiagnosticsService {
  constructor(
    private readonly repository: HouseholdRepository,
    private readonly pushDeliveryWorkerService: PushDeliveryWorkerService
  ) {}

  listTenantUserNotificationDevices(tenantId: string, userId: string) {
    return this.repository.listNotificationDevicesForTenantUser(tenantId, userId);
  }

  async triggerTenantDeviceTestPush(tenantId: string, dto: InternalDevicePushTestDto) {
    const title = dto.title?.trim() || "TaskBandit targeted push test";
    const message =
      dto.message?.trim() ||
      "This targeted push test was sent by a workspace operator. If this reached your device, direct push routing is healthy.";
    const queued = await this.repository.enqueueTargetedDeviceTestPush({
      tenantId,
      userId: dto.userId.trim(),
      deviceId: dto.deviceId.trim(),
      requestedBy: dto.requestedBy?.trim() || "control-plane-operator",
      reason: dto.reason?.trim() || null,
      title,
      message
    });

    const runWorkerOnce = dto.runWorkerOnce !== false;
    let workerResult: Awaited<ReturnType<PushDeliveryWorkerService["runOnceForDelivery"]>> | null = null;
    if (runWorkerOnce) {
      workerResult = await this.pushDeliveryWorkerService.runOnceForDelivery(
        tenantId,
        queued.deliveryId
      );
    }

    const delivery = await this.repository.getPushDeliveryById(queued.deliveryId, tenantId);
    return {
      tenantId,
      notificationId: queued.notificationId,
      deliveryId: queued.deliveryId,
      queuedAt: queued.queuedAt,
      runWorkerOnce,
      workerResult,
      delivery,
      target: {
        userId: queued.userId,
        userDisplayName: queued.userDisplayName,
        device: queued.device
      }
    };
  }
}

import { Injectable } from "@nestjs/common";
import { HouseholdRepository } from "../household/household.repository";
import { InternalDevicePushTestDto } from "./dto/internal-device-push-test.dto";
import { PushDeliveryWorkerService } from "./push-delivery-worker.service";
import { RuntimeTenantScopeResolverService } from "./runtime-tenant-scope-resolver.service";

@Injectable()
export class HostedPushDiagnosticsService {
  constructor(
    private readonly repository: HouseholdRepository,
    private readonly pushDeliveryWorkerService: PushDeliveryWorkerService,
    private readonly runtimeTenantScopeResolverService: RuntimeTenantScopeResolverService
  ) {}

  async listTenantUserNotificationDevices(tenantId: string, userId: string) {
    const normalizedUserId = userId.trim();
    const canonicalTenantId = await this.runtimeTenantScopeResolverService.resolveTenantIdForDiagnostics({
      tenantScope: tenantId,
      userId: normalizedUserId
    });

    return this.repository.listNotificationDevicesForTenantUser(canonicalTenantId, normalizedUserId);
  }

  async triggerTenantDeviceTestPush(tenantId: string, dto: InternalDevicePushTestDto) {
    const normalizedUserId = dto.userId.trim();
    const normalizedDeviceId = dto.deviceId.trim();
    const canonicalTenantId = await this.runtimeTenantScopeResolverService.resolveTenantIdForDiagnostics({
      tenantScope: tenantId,
      userId: normalizedUserId,
      deviceId: normalizedDeviceId
    });

    const title = dto.title?.trim() || "TaskBandit targeted push test";
    const message =
      dto.message?.trim() ||
      "This targeted push test was sent by a workspace operator. If this reached your device, direct push routing is healthy.";
    const queued = await this.repository.enqueueTargetedDeviceTestPush({
      tenantId: canonicalTenantId,
      userId: normalizedUserId,
      deviceId: normalizedDeviceId,
      requestedBy: dto.requestedBy?.trim() || "control-plane-operator",
      reason: dto.reason?.trim() || null,
      title,
      message
    });

    const runWorkerOnce = dto.runWorkerOnce !== false;
    let workerResult: Awaited<ReturnType<PushDeliveryWorkerService["runOnceForDelivery"]>> | null = null;
    if (runWorkerOnce) {
      workerResult = await this.pushDeliveryWorkerService.runOnceForDelivery(
        canonicalTenantId,
        queued.deliveryId
      );
    }

    const delivery = await this.repository.getPushDeliveryById(queued.deliveryId, canonicalTenantId);
    return {
      tenantId: canonicalTenantId,
      requestedTenantId: tenantId,
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

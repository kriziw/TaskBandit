import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { AppConfigService } from "../../common/config/app-config.service";
import { PushDeliveryService } from "../../common/push/push-delivery.service";
import { TenantRuntimePolicyService } from "../../common/tenancy/tenant-runtime-policy.service";
import { HouseholdRepository } from "../household/household.repository";

@Injectable()
export class PushDeliveryWorkerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(PushDeliveryWorkerService.name);
  private timer: NodeJS.Timeout | null = null;
  private activeRun: Promise<{ sentCount: number; failedCount: number }> | null = null;
  private rerunRequested = false;

  constructor(
    private readonly repository: HouseholdRepository,
    private readonly pushDeliveryService: PushDeliveryService,
    private readonly appConfigService: AppConfigService,
    private readonly tenantRuntimePolicyService: TenantRuntimePolicyService
  ) {}

  async onApplicationBootstrap() {
    if (this.appConfigService.pushDeliveryIntervalMs <= 0) {
      this.logger.log("Push delivery worker is disabled.");
      return;
    }

    await this.runOnce();
    this.timer = setInterval(() => {
      void this.runOnce();
    }, this.appConfigService.pushDeliveryIntervalMs);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runOnce(limit = 25): Promise<{ sentCount: number; failedCount: number }> {
    if (this.activeRun) {
      this.rerunRequested = true;
      return this.activeRun.then(() => this.runOnce(limit));
    }

    const runPromise = this.runLoop(limit);
    this.activeRun = runPromise;

    try {
      return await runPromise;
    } finally {
      if (this.activeRun === runPromise) {
        this.activeRun = null;
      }
    }
  }

  async runOnceForTenant(tenantId: string, limit = 25) {
    return this.runInternal(limit, tenantId);
  }

  private async runLoop(limit: number): Promise<{ sentCount: number; failedCount: number }> {
    const aggregate = {
      sentCount: 0,
      failedCount: 0
    };

    do {
      this.rerunRequested = false;
      const result = await this.runInternal(limit);
      aggregate.sentCount += result.sentCount;
      aggregate.failedCount += result.failedCount;
    } while (this.rerunRequested);

    return aggregate;
  }

  private async runInternal(limit = 25, tenantId?: string): Promise<{ sentCount: number; failedCount: number }> {
    const pendingDeliveries = await this.repository.getPendingPushDeliveries(limit, tenantId);
    if (pendingDeliveries.length === 0) {
      return {
        sentCount: 0,
        failedCount: 0
      };
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const delivery of pendingDeliveries) {
      const decision = await this.tenantRuntimePolicyService.getActionDecision(
        delivery.tenantId,
        "notification_delivery"
      );
      if (!decision.allowed) {
        failedCount += 1;
        await this.repository.markPushDeliveryFailed(
          delivery.id,
          delivery.tenantId,
          decision.reason ?? "Push delivery blocked."
        );
        continue;
      }

      const result = await this.pushDeliveryService.deliver({
        provider: delivery.provider,
        pushToken: delivery.pushToken,
        webPushP256dh: delivery.webPushP256dh,
        webPushAuth: delivery.webPushAuth,
        title: delivery.title,
        message: delivery.message,
        entityType: delivery.entityType,
        entityId: delivery.entityId,
        notificationId: delivery.notificationId,
        deviceId: delivery.notificationDeviceId
      });

      if (result.status === "sent") {
        sentCount += 1;
        await this.repository.markPushDeliverySent(delivery.id, delivery.tenantId, result.providerMessageId);
      } else {
        failedCount += 1;
        await this.repository.markPushDeliveryFailed(delivery.id, delivery.tenantId, result.errorMessage);
      }
    }

    if (sentCount > 0 || failedCount > 0) {
      this.logger.log(
        `Processed ${pendingDeliveries.length} push delivery job(s): ${sentCount} sent, ${failedCount} failed.`
      );
    }

    return {
      sentCount,
      failedCount
    };
  }
}

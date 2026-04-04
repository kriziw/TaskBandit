import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { AppConfigService } from "../../common/config/app-config.service";
import { PushDeliveryService } from "../../common/push/push-delivery.service";
import { HouseholdRepository } from "../household/household.repository";

@Injectable()
export class PushDeliveryWorkerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(PushDeliveryWorkerService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly repository: HouseholdRepository,
    private readonly pushDeliveryService: PushDeliveryService,
    private readonly appConfigService: AppConfigService
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

  async runOnce(limit = 25) {
    const pendingDeliveries = await this.repository.getPendingPushDeliveries(limit);
    if (pendingDeliveries.length === 0) {
      return {
        sentCount: 0,
        failedCount: 0
      };
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const delivery of pendingDeliveries) {
      const result = await this.pushDeliveryService.deliver({
        provider: delivery.provider,
        pushToken: delivery.pushToken,
        title: delivery.title,
        message: delivery.message,
        entityType: delivery.entityType,
        entityId: delivery.entityId,
        notificationId: delivery.notificationId,
        deviceId: delivery.notificationDeviceId
      });

      if (result.status === "sent") {
        sentCount += 1;
        await this.repository.markPushDeliverySent(delivery.id, result.providerMessageId);
      } else {
        failedCount += 1;
        await this.repository.markPushDeliveryFailed(delivery.id, result.errorMessage);
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

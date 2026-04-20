import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { AppConfigService } from "../../common/config/app-config.service";
import { TenantRuntimePolicyService } from "../../common/tenancy/tenant-runtime-policy.service";
import { HouseholdRepository } from "../household/household.repository";
import { SmtpService } from "../settings/smtp.service";

@Injectable()
export class EmailDeliveryWorkerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(EmailDeliveryWorkerService.name);
  private timer: NodeJS.Timeout | null = null;
  private activeRun: Promise<{
    sentCount: number;
    failedCount: number;
    skippedCount: number;
  }> | null = null;
  private rerunRequested = false;

  constructor(
    private readonly repository: HouseholdRepository,
    private readonly smtpService: SmtpService,
    private readonly appConfigService: AppConfigService,
    private readonly tenantRuntimePolicyService: TenantRuntimePolicyService
  ) {}

  async onApplicationBootstrap() {
    if (this.appConfigService.emailDeliveryIntervalMs <= 0) {
      this.logger.log("Notification email fallback worker is disabled.");
      return;
    }

    await this.runOnce();
    this.timer = setInterval(() => {
      void this.runOnce();
    }, this.appConfigService.emailDeliveryIntervalMs);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runOnce(
    limit = 25
  ): Promise<{ sentCount: number; failedCount: number; skippedCount: number }> {
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

  private async runLoop(
    limit: number
  ): Promise<{ sentCount: number; failedCount: number; skippedCount: number }> {
    const aggregate = {
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0
    };

    do {
      this.rerunRequested = false;
      const result = await this.runInternal(limit);
      aggregate.sentCount += result.sentCount;
      aggregate.failedCount += result.failedCount;
      aggregate.skippedCount += result.skippedCount;
    } while (this.rerunRequested);

    return aggregate;
  }

  private async runInternal(
    limit = 25,
    tenantId?: string
  ): Promise<{ sentCount: number; failedCount: number; skippedCount: number }> {
    const pendingNotifications = await this.repository.getPendingEmailNotifications(limit, tenantId);
    if (pendingNotifications.length === 0) {
      return {
        sentCount: 0,
        failedCount: 0,
        skippedCount: 0
      };
    }

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const notification of pendingNotifications) {
      const decision = await this.tenantRuntimePolicyService.getActionDecision(
        notification.tenantId,
        "notification_delivery"
      );
      if (!decision.allowed) {
        skippedCount += 1;
        await this.repository.markNotificationEmailSkipped(
          notification.id,
          notification.tenantId,
          decision.reason ?? "Email fallback blocked."
        );
        continue;
      }

      if (await this.repository.hasDeliverablePushDevice(notification.recipientUserId, notification.tenantId)) {
        skippedCount += 1;
        await this.repository.markNotificationEmailSkipped(
          notification.id,
          notification.tenantId,
          "Email fallback skipped because a push-ready mobile device is now available."
        );
        continue;
      }

      if (!notification.recipientEmail) {
        skippedCount += 1;
        await this.repository.markNotificationEmailSkipped(
          notification.id,
          notification.tenantId,
          "Email fallback skipped because the recipient does not have an email address."
        );
        continue;
      }

      if (!notification.smtpSettings.enabled) {
        skippedCount += 1;
        await this.repository.markNotificationEmailSkipped(
          notification.id,
          notification.tenantId,
          "Email fallback skipped because SMTP is currently disabled."
        );
        continue;
      }

      if (
        !notification.smtpSettings.host ||
        !notification.smtpSettings.port ||
        !notification.smtpSettings.fromEmail
      ) {
        skippedCount += 1;
        await this.repository.markNotificationEmailSkipped(
          notification.id,
          notification.tenantId,
          "Email fallback skipped because SMTP is incomplete."
        );
        continue;
      }

      try {
        await this.smtpService.sendMail(notification.smtpSettings, {
          to: notification.recipientEmail,
          subject: notification.title,
          text: notification.message
        });
        sentCount += 1;
        await this.repository.markNotificationEmailSent(notification.id, notification.tenantId);
      } catch (error) {
        failedCount += 1;
        await this.repository.markNotificationEmailFailed(
          notification.id,
          notification.tenantId,
          error instanceof Error ? error.message : "Unknown SMTP delivery error."
        );
      }
    }

    if (sentCount > 0 || failedCount > 0 || skippedCount > 0) {
      this.logger.log(
        `Processed ${pendingNotifications.length} notification email job(s): ${sentCount} sent, ${failedCount} failed, ${skippedCount} skipped.`
      );
    }

    return {
      sentCount,
      failedCount,
      skippedCount
    };
  }
}

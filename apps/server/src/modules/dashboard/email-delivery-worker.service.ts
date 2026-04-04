import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { AppConfigService } from "../../common/config/app-config.service";
import { HouseholdRepository } from "../household/household.repository";
import { SmtpService } from "../settings/smtp.service";

@Injectable()
export class EmailDeliveryWorkerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(EmailDeliveryWorkerService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly repository: HouseholdRepository,
    private readonly smtpService: SmtpService,
    private readonly appConfigService: AppConfigService
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

  async runOnce(limit = 25) {
    const pendingNotifications = await this.repository.getPendingEmailNotifications(limit);
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
      if (await this.repository.hasDeliverablePushDevice(notification.recipientUserId)) {
        skippedCount += 1;
        await this.repository.markNotificationEmailSkipped(
          notification.id,
          "Email fallback skipped because a push-ready mobile device is now available."
        );
        continue;
      }

      if (!notification.recipientEmail) {
        skippedCount += 1;
        await this.repository.markNotificationEmailSkipped(
          notification.id,
          "Email fallback skipped because the recipient does not have an email address."
        );
        continue;
      }

      if (!notification.smtpSettings.enabled) {
        skippedCount += 1;
        await this.repository.markNotificationEmailSkipped(
          notification.id,
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
        await this.repository.markNotificationEmailSent(notification.id);
      } catch (error) {
        failedCount += 1;
        await this.repository.markNotificationEmailFailed(
          notification.id,
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

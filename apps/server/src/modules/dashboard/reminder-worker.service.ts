import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { AppConfigService } from "../../common/config/app-config.service";
import { HouseholdRepository } from "../household/household.repository";

@Injectable()
export class ReminderWorkerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ReminderWorkerService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly repository: HouseholdRepository,
    private readonly appConfigService: AppConfigService
  ) {}

  async onApplicationBootstrap() {
    if (this.appConfigService.reminderIntervalMs <= 0) {
      this.logger.log("Chore reminder worker is disabled.");
      return;
    }

    await this.runOnce();
    this.timer = setInterval(() => {
      void this.runOnce();
    }, this.appConfigService.reminderIntervalMs);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async runOnce() {
    try {
      const now = new Date();
      const reminderResult = await this.repository.processReminderNotifications({
        now,
        dueSoonWindowHours: this.appConfigService.dueSoonReminderWindowHours
      });
      const dailySummaryResult = await this.repository.processDailySummaryNotifications({
        now,
        summaryHourUtc: this.appConfigService.dailySummaryHourUtc
      });
      const createdCount = reminderResult.createdCount + dailySummaryResult.createdCount;

      if (createdCount > 0) {
        this.logger.log(`Generated ${createdCount} automated notification(s).`);
      }
    } catch (error) {
      this.logger.error(
        "Failed to process chore reminders.",
        error instanceof Error ? error.stack : undefined
      );
    }
  }
}

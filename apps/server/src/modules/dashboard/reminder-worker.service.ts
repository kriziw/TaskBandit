import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { AppConfigService } from "../../common/config/app-config.service";
import { HouseholdRepository } from "../household/household.repository";

@Injectable()
export class ReminderWorkerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ReminderWorkerService.name);
  private timer: NodeJS.Timeout | null = null;
  private activeRun: Promise<{ reminderCount: number; dailySummaryCount: number }> | null = null;
  private rerunRequested = false;

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

  async runOnce(
    options?: { forceDailySummary?: boolean }
  ): Promise<{ reminderCount: number; dailySummaryCount: number }> {
    if (this.activeRun) {
      this.rerunRequested = true;
      return this.activeRun.then(() => this.runOnce(options));
    }

    const runPromise = this.runLoop(options);
    this.activeRun = runPromise;

    try {
      return await runPromise;
    } finally {
      if (this.activeRun === runPromise) {
        this.activeRun = null;
      }
    }
  }

  private async runLoop(
    options?: { forceDailySummary?: boolean }
  ): Promise<{ reminderCount: number; dailySummaryCount: number }> {
    const aggregate = {
      reminderCount: 0,
      dailySummaryCount: 0
    };

    do {
      this.rerunRequested = false;
      const result = await this.runInternal(options);
      aggregate.reminderCount += result.reminderCount;
      aggregate.dailySummaryCount += result.dailySummaryCount;
    } while (this.rerunRequested);

    return aggregate;
  }

  private async runInternal(
    options?: { forceDailySummary?: boolean }
  ): Promise<{ reminderCount: number; dailySummaryCount: number }> {
    try {
      const now = new Date();
      const reminderResult = await this.repository.processReminderNotifications({
        now,
        dueSoonWindowHours: this.appConfigService.dueSoonReminderWindowHours
      });
      const dailySummaryResult = await this.repository.processDailySummaryNotifications({
        now,
        summaryHourUtc: this.appConfigService.dailySummaryHourUtc,
        force: options?.forceDailySummary
      });
      const reminderCount = reminderResult.createdCount;
      const dailySummaryCount = dailySummaryResult.createdCount;
      const createdCount = reminderCount + dailySummaryCount;

      if (createdCount > 0) {
        this.logger.log(`Generated ${createdCount} automated notification(s).`);
      }

      return {
        reminderCount,
        dailySummaryCount
      };
    } catch (error) {
      this.logger.error(
        "Failed to process chore reminders.",
        error instanceof Error ? error.stack : undefined
      );

      return {
        reminderCount: 0,
        dailySummaryCount: 0
      };
    }
  }
}

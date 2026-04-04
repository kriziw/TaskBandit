import { AuthenticatedUser } from "../../common/auth/authenticated-user.type";
import { Injectable } from "@nestjs/common";
import { AppConfigService } from "../../common/config/app-config.service";
import { AppLogService } from "../../common/logging/app-log.service";
import { HouseholdRepository } from "../household/household.repository";
import { EmailDeliveryWorkerService } from "./email-delivery-worker.service";
import { PushDeliveryWorkerService } from "./push-delivery-worker.service";

@Injectable()
export class DashboardService {
  constructor(
    private readonly repository: HouseholdRepository,
    private readonly appConfigService: AppConfigService,
    private readonly appLogService: AppLogService,
    private readonly emailDeliveryWorkerService: EmailDeliveryWorkerService,
    private readonly pushDeliveryWorkerService: PushDeliveryWorkerService
  ) {}

  getSummary(user: AuthenticatedUser) {
    return this.repository.getDashboardSummary(user.householdId);
  }

  getPointsLedger(user: AuthenticatedUser) {
    return this.repository.getPointsLedger(user.householdId);
  }

  getNotifications(user: AuthenticatedUser) {
    return this.repository.getNotifications(user.householdId, user.id);
  }

  markNotificationRead(user: AuthenticatedUser, notificationId: string) {
    return this.repository.markNotificationRead(notificationId, user.householdId, user.id);
  }

  markAllNotificationsRead(user: AuthenticatedUser) {
    return this.repository.markAllNotificationsRead(user.householdId, user.id);
  }

  processOverduePenalties(user: AuthenticatedUser) {
    return this.repository.processOverduePenalties(user.householdId, user.id);
  }

  async processNotificationMaintenance() {
    const now = new Date();
    const [reminderResult, dailySummaryResult, pushDeliveryResult, emailDeliveryResult] = await Promise.all([
      this.repository.processReminderNotifications({
        now,
        dueSoonWindowHours: this.appConfigService.dueSoonReminderWindowHours
      }),
      this.repository.processDailySummaryNotifications({
        now,
        summaryHourUtc: this.appConfigService.dailySummaryHourUtc,
        force: true
      }),
      this.pushDeliveryWorkerService.runOnce(50),
      this.emailDeliveryWorkerService.runOnce(50)
    ]);

    return {
      reminderCount: reminderResult.createdCount,
      dailySummaryCount: dailySummaryResult.createdCount,
      pushSentCount: pushDeliveryResult.sentCount,
      pushFailedCount: pushDeliveryResult.failedCount,
      emailSentCount: emailDeliveryResult.sentCount,
      emailFailedCount: emailDeliveryResult.failedCount,
      emailSkippedCount: emailDeliveryResult.skippedCount
    };
  }

  async exportChoresCsv(user: AuthenticatedUser) {
    const [household, instances] = await Promise.all([
      this.repository.getHousehold(user.householdId),
      this.repository.getInstances(user.householdId)
    ]);

    const memberLookup = new Map(household.members.map((member) => [member.id, member.displayName]));
    const header = [
      "id",
      "title",
      "state",
      "assignee",
      "dueAt",
      "difficulty",
      "basePoints",
      "awardedPoints",
      "requirePhotoProof",
      "attachmentCount",
      "submittedAt",
      "reviewedAt"
    ];

    const rows = instances.map((instance) => [
      instance.id,
      instance.title,
      instance.state,
      instance.assigneeId ? memberLookup.get(instance.assigneeId) ?? "" : "",
      instance.dueAt,
      instance.difficulty,
      String(instance.basePoints),
      String(instance.awardedPoints),
      instance.requirePhotoProof ? "true" : "false",
      String(instance.attachmentCount),
      instance.submittedAt ?? "",
      instance.reviewedAt ?? ""
    ]);

    return [header, ...rows]
      .map((row) => row.map((value) => this.escapeCsv(String(value))).join(","))
      .join("\n");
  }

  getRuntimeLogs(limit = 200) {
    return this.appLogService.getRecentEntries(limit);
  }

  async exportRuntimeLogsText() {
    return this.appLogService.exportText();
  }

  exportRuntimeLogsJson(limit = 1000) {
    return this.appLogService.exportJson(limit);
  }

  private escapeCsv(value: string) {
    const normalized = value.replace(/"/g, '""');
    return `"${normalized}"`;
  }
}

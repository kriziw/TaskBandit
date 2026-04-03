import { AuthenticatedUser } from "../../common/auth/authenticated-user.type";
import { Injectable } from "@nestjs/common";
import { HouseholdRepository } from "../household/household.repository";

@Injectable()
export class DashboardService {
  constructor(private readonly repository: HouseholdRepository) {}

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

  private escapeCsv(value: string) {
    const normalized = value.replace(/"/g, '""');
    return `"${normalized}"`;
  }
}

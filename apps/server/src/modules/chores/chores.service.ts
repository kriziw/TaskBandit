import { Injectable } from "@nestjs/common";
import { AuthenticatedUser } from "../../common/auth/authenticated-user.type";
import { I18nService } from "../../common/i18n/i18n.service";
import { SupportedLanguage } from "../../common/i18n/supported-languages";
import { PointsService } from "../gamification/points.service";
import { HouseholdRepository } from "../household/household.repository";
import { CreateChoreTemplateDto } from "./dto/create-chore-template.dto";
import { ReviewChoreDto } from "./dto/review-chore.dto";
import { SubmitChoreDto } from "./dto/submit-chore.dto";

@Injectable()
export class ChoresService {
  constructor(
    private readonly repository: HouseholdRepository,
    private readonly pointsService: PointsService,
    private readonly i18nService: I18nService
  ) {}

  getTemplates() {
    return this.repository.getTemplates();
  }

  createTemplate(dto: CreateChoreTemplateDto) {
    return this.repository.createTemplate(dto);
  }

  getInstances() {
    return this.repository.getInstances();
  }

  async submitInstance(
    instanceId: string,
    dto: SubmitChoreDto,
    user: AuthenticatedUser,
    language: SupportedLanguage
  ) {
    const instance = await this.repository.getInstanceForHousehold(instanceId, user.householdId);
    if (!instance) {
      return this.repository.throwNotFound(this.i18nService.translate("chores.not_found", language));
    }

    if (
      user.role === "child" &&
      instance.assigneeId &&
      instance.assigneeId !== user.id
    ) {
      return this.repository.throwForbidden(
        this.i18nService.translate("chores.assignee_only_submit", language)
      );
    }

    if (
      user.role !== "child" &&
      instance.assigneeId &&
      instance.assigneeId !== user.id &&
      user.role !== "admin" &&
      user.role !== "parent"
    ) {
      return this.repository.throwForbidden(
        this.i18nService.translate("chores.assignee_only_submit", language)
      );
    }

    if (instance.state === "completed") {
      return this.repository.throwConflict(
        this.i18nService.translate("chores.already_completed", language)
      );
    }

    const shouldRequireApproval = user.role === "child";
    const awardedPoints = shouldRequireApproval
      ? 0
      : this.pointsService.calculateForApprovedCompletion(
          instance.difficulty,
          dto.completedChecklistItems ?? 0,
          instance.isOverdue
        ).finalAwardedPoints;

    return this.repository.submitInstance({
      instanceId,
      actingUserId: user.id,
      actingUserRole: user.role,
      householdId: user.householdId,
      completedChecklistItems: dto.completedChecklistItems ?? 0,
      attachmentCount: dto.attachmentCount ?? 0,
      note: dto.note,
      awardedPoints,
      nextState: shouldRequireApproval ? "pending_approval" : "completed"
    });
  }

  async approveInstance(
    instanceId: string,
    dto: ReviewChoreDto,
    user: AuthenticatedUser,
    language: SupportedLanguage
  ) {
    const instance = await this.repository.getInstanceForHousehold(instanceId, user.householdId);
    if (!instance) {
      return this.repository.throwNotFound(this.i18nService.translate("chores.not_found", language));
    }

    if (instance.state !== "pending_approval") {
      return this.repository.throwConflict(
        this.i18nService.translate("chores.invalid_review_state", language)
      );
    }

    const awardedPoints = this.pointsService.calculateForApprovedCompletion(
      instance.difficulty,
      instance.completedChecklistItems,
      instance.isOverdue
    ).finalAwardedPoints;

    return this.repository.reviewInstance({
      instanceId,
      actingUserId: user.id,
      householdId: user.householdId,
      approved: true,
      note: dto.note,
      awardedPoints
    });
  }

  async rejectInstance(
    instanceId: string,
    dto: ReviewChoreDto,
    user: AuthenticatedUser,
    language: SupportedLanguage
  ) {
    const instance = await this.repository.getInstanceForHousehold(instanceId, user.householdId);
    if (!instance) {
      return this.repository.throwNotFound(this.i18nService.translate("chores.not_found", language));
    }

    if (instance.state !== "pending_approval") {
      return this.repository.throwConflict(
        this.i18nService.translate("chores.invalid_review_state", language)
      );
    }

    return this.repository.reviewInstance({
      instanceId,
      actingUserId: user.id,
      householdId: user.householdId,
      approved: false,
      note: dto.note,
      awardedPoints: 0
    });
  }
}

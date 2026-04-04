import { BadRequestException, Injectable } from "@nestjs/common";
import { AuthenticatedUser } from "../../common/auth/authenticated-user.type";
import { I18nService } from "../../common/i18n/i18n.service";
import { SupportedLanguage } from "../../common/i18n/supported-languages";
import { PointsService } from "../gamification/points.service";
import { HouseholdRepository } from "../household/household.repository";
import { CreateChoreInstanceDto } from "./dto/create-chore-instance.dto";
import { CreateChoreTemplateDto } from "./dto/create-chore-template.dto";
import { ReviewChoreDto } from "./dto/review-chore.dto";
import { SubmitChoreDto } from "./dto/submit-chore.dto";
import { ProofStorageService } from "./proof-storage.service";

@Injectable()
export class ChoresService {
  constructor(
    private readonly repository: HouseholdRepository,
    private readonly pointsService: PointsService,
    private readonly i18nService: I18nService,
    private readonly proofStorageService: ProofStorageService
  ) {}

  getTemplates(user: AuthenticatedUser) {
    return this.repository.getTemplates(user.householdId);
  }

  createTemplate(dto: CreateChoreTemplateDto, user: AuthenticatedUser) {
    return this.repository.createTemplate(dto, user.householdId, user.id);
  }

  async updateTemplate(
    templateId: string,
    dto: CreateChoreTemplateDto,
    user: AuthenticatedUser,
    language: SupportedLanguage
  ) {
    const template = await this.repository.getTemplateForHousehold(templateId, user.householdId);
    if (!template) {
      return this.repository.throwNotFound(this.i18nService.translate("chores.template_not_found", language));
    }

    return this.repository.updateTemplate(templateId, dto, user.householdId, user.id);
  }

  createInstance(dto: CreateChoreInstanceDto, user: AuthenticatedUser) {
    return this.repository.createInstance(dto, user.householdId, user.id);
  }

  async updateInstance(
    instanceId: string,
    dto: CreateChoreInstanceDto,
    user: AuthenticatedUser,
    language: SupportedLanguage
  ) {
    const instance = await this.repository.getInstanceForHousehold(instanceId, user.householdId);
    if (!instance) {
      return this.repository.throwNotFound(this.i18nService.translate("chores.not_found", language));
    }

    if (["completed", "cancelled", "pending_approval"].includes(instance.state)) {
      return this.repository.throwConflict(
        this.i18nService.translate("chores.invalid_edit_state", language)
      );
    }

    return this.repository.updateInstance(instanceId, dto, user.householdId, user.id);
  }

  async cancelInstance(instanceId: string, user: AuthenticatedUser, language: SupportedLanguage) {
    const instance = await this.repository.getInstanceForHousehold(instanceId, user.householdId);
    if (!instance) {
      return this.repository.throwNotFound(this.i18nService.translate("chores.not_found", language));
    }

    if (instance.state === "completed" || instance.state === "cancelled") {
      return this.repository.throwConflict(
        this.i18nService.translate("chores.invalid_cancel_state", language)
      );
    }

    return this.repository.cancelInstance(instanceId, user.householdId, user.id);
  }

  async startInstance(instanceId: string, user: AuthenticatedUser, language: SupportedLanguage) {
    const instance = await this.repository.getInstanceForHousehold(instanceId, user.householdId);
    if (!instance) {
      return this.repository.throwNotFound(this.i18nService.translate("chores.not_found", language));
    }

    if (user.role === "child" && instance.assigneeId && instance.assigneeId !== user.id) {
      return this.repository.throwForbidden(
        this.i18nService.translate("chores.assignee_only_submit", language)
      );
    }

    if (["completed", "cancelled", "pending_approval", "in_progress"].includes(instance.state)) {
      return this.repository.throwConflict(
        this.i18nService.translate("chores.invalid_start_state", language)
      );
    }

    return this.repository.startInstance(instanceId, user.householdId, user.id);
  }

  getInstances(user: AuthenticatedUser) {
    return this.repository.getInstancesForViewer(user);
  }

  uploadProof(
    file: Express.Multer.File | undefined,
    user: AuthenticatedUser,
    language: SupportedLanguage
  ) {
    return this.proofStorageService.storeProofUpload(file, user, language);
  }

  async downloadAttachment(
    attachmentId: string,
    user: AuthenticatedUser,
    language: SupportedLanguage
  ) {
    const attachment = await this.repository.getAttachmentForViewer(user, attachmentId);
    if (!attachment?.storageKey) {
      return this.repository.throwNotFound(this.i18nService.translate("chores.not_found", language));
    }

    try {
      const fileBuffer = await this.proofStorageService.readProofUpload(attachment.storageKey);
      return {
        ...attachment,
        fileBuffer
      };
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        return this.repository.throwNotFound(this.i18nService.translate("chores.not_found", language));
      }

      throw error;
    }
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

    const completedChecklistItemIds = dto.completedChecklistItemIds ?? [];
    const requiredChecklistItemIds = instance.checklist
      .filter((item) => item.required)
      .map((item) => item.id);
    const hasAllRequiredChecklistItems = requiredChecklistItemIds.every((requiredId) =>
      completedChecklistItemIds.includes(requiredId)
    );

    if (!hasAllRequiredChecklistItems) {
      throw new BadRequestException({
        message: this.i18nService.translate("chores.required_checklist_missing", language)
      });
    }

    if (instance.requirePhotoProof && (dto.attachments?.length ?? 0) < 1) {
      throw new BadRequestException({
        message: this.i18nService.translate("chores.photo_proof_required", language)
      });
    }

    const shouldRequireApproval = user.role === "child";
    const awardedPoints = shouldRequireApproval
      ? 0
      : this.pointsService.calculateForApprovedCompletion(
          instance.difficulty,
          completedChecklistItemIds.length,
          instance.isOverdue
        ).finalAwardedPoints;

    return this.repository.submitInstance({
      instanceId,
      actingUserId: user.id,
      householdId: user.householdId,
      completedChecklistItemIds,
      attachments: dto.attachments ?? [],
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

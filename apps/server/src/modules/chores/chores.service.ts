import { BadRequestException, Injectable } from "@nestjs/common";
import { AuthenticatedUser } from "../../common/auth/authenticated-user.type";
import { I18nService } from "../../common/i18n/i18n.service";
import { SupportedLanguage } from "../../common/i18n/supported-languages";
import { DashboardSyncService } from "../dashboard/dashboard-sync.service";
import { PointsService } from "../gamification/points.service";
import { HouseholdRepository } from "../household/household.repository";
import { CreateChoreInstanceDto } from "./dto/create-chore-instance.dto";
import { CreateChoreTemplateDto } from "./dto/create-chore-template.dto";
import { RequestChoreTakeoverDto } from "./dto/request-chore-takeover.dto";
import { ReviewChoreDto } from "./dto/review-chore.dto";
import { RespondChoreTakeoverDto } from "./dto/respond-chore-takeover.dto";
import { SubmitChoreDto } from "./dto/submit-chore.dto";
import { ProofStorageService } from "./proof-storage.service";

@Injectable()
export class ChoresService {
  constructor(
    private readonly repository: HouseholdRepository,
    private readonly pointsService: PointsService,
    private readonly i18nService: I18nService,
    private readonly proofStorageService: ProofStorageService,
    private readonly dashboardSyncService: DashboardSyncService
  ) {}

  getTemplates(user: AuthenticatedUser, language: SupportedLanguage) {
    return this.repository.getTemplates(user.householdId, language);
  }

  async createTemplate(dto: CreateChoreTemplateDto, user: AuthenticatedUser, language: SupportedLanguage) {
    const template = await this.repository.createTemplate(dto, user.householdId, user.id, language);
    this.publishSyncEvent(user, "template.created", "template", template.id);
    return template;
  }

  async updateTemplate(
    templateId: string,
    dto: CreateChoreTemplateDto,
    user: AuthenticatedUser,
    language: SupportedLanguage
  ) {
    const template = await this.repository.getTemplateForHousehold(templateId, user.householdId, language);
    if (!template) {
      return this.repository.throwNotFound(this.i18nService.translate("chores.template_not_found", language));
    }

    const updatedTemplate = await this.repository.updateTemplate(
      templateId,
      dto,
      user.householdId,
      user.id,
      language
    );
    this.publishSyncEvent(user, "template.updated", "template", templateId);
    return updatedTemplate;
  }

  async deleteTemplate(templateId: string, user: AuthenticatedUser, language: SupportedLanguage) {
    const template = await this.repository.getTemplateForHousehold(templateId, user.householdId, language);
    if (!template) {
      return this.repository.throwNotFound(this.i18nService.translate("chores.template_not_found", language));
    }

    const deleted = await this.repository.deleteTemplate(templateId, user.householdId, user.id);
    this.publishSyncEvent(user, "template.deleted", "template", templateId);
    return deleted;
  }

  async createInstance(dto: CreateChoreInstanceDto, user: AuthenticatedUser, language: SupportedLanguage) {
    const instance = await this.repository.createInstance(dto, user.householdId, user.id, language);
    this.publishSyncEvent(user, "instance.created", "instance", instance.id);
    return instance;
  }

  async updateInstance(
    instanceId: string,
    dto: CreateChoreInstanceDto,
    user: AuthenticatedUser,
    language: SupportedLanguage
  ) {
    const instance = await this.repository.getInstanceForHousehold(instanceId, user.householdId, language);
    if (!instance) {
      return this.repository.throwNotFound(this.i18nService.translate("chores.not_found", language));
    }

    if (["completed", "cancelled", "pending_approval"].includes(instance.state)) {
      return this.repository.throwConflict(
        this.i18nService.translate("chores.invalid_edit_state", language)
      );
    }

    const updatedInstance = await this.repository.updateInstance(
      instanceId,
      dto,
      user.householdId,
      user.id,
      language
    );
    this.publishSyncEvent(user, "instance.updated", "instance", instanceId);
    return updatedInstance;
  }

  async cancelInstance(instanceId: string, user: AuthenticatedUser, language: SupportedLanguage) {
    const instance = await this.repository.getInstanceForHousehold(instanceId, user.householdId, language);
    if (!instance) {
      return this.repository.throwNotFound(this.i18nService.translate("chores.not_found", language));
    }

    if (instance.state === "completed" || instance.state === "cancelled") {
      return this.repository.throwConflict(
        this.i18nService.translate("chores.invalid_cancel_state", language)
      );
    }

    const cancelledInstance = await this.repository.cancelInstance(
      instanceId,
      user.householdId,
      user.id,
      language
    );
    this.publishSyncEvent(user, "instance.cancelled", "instance", instanceId);
    return cancelledInstance;
  }

  async startInstance(instanceId: string, user: AuthenticatedUser, language: SupportedLanguage) {
    const instance = await this.repository.getInstanceForHousehold(instanceId, user.householdId, language);
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

    const startedInstance = await this.repository.startInstance(
      instanceId,
      user.householdId,
      user.id,
      language
    );
    this.publishSyncEvent(user, "instance.started", "instance", instanceId);
    return startedInstance;
  }

  async takeOverInstance(instanceId: string, user: AuthenticatedUser, language: SupportedLanguage) {
    const instance = await this.repository.getInstanceForHousehold(instanceId, user.householdId, language);
    if (!instance) {
      return this.repository.throwNotFound(this.i18nService.translate("chores.not_found", language));
    }

    if (["completed", "cancelled", "pending_approval"].includes(instance.state)) {
      return this.repository.throwConflict(
        this.i18nService.translate("chores.invalid_start_state", language)
      );
    }

    if (instance.assigneeId === user.id) {
      return this.repository.throwConflict(
        this.i18nService.translate("chores.invalid_start_state", language)
      );
    }

    const updatedInstance = await this.repository.takeOverInstance(
      instanceId,
      user.householdId,
      user.id,
      language
    );
    this.publishSyncEvent(user, "instance.taken_over", "instance", instanceId);
    return updatedInstance;
  }

  getInstances(user: AuthenticatedUser, language: SupportedLanguage) {
    return this.repository.getInstancesForViewer(user, language);
  }

  getTakeoverRequests(user: AuthenticatedUser, language: SupportedLanguage) {
    return this.repository.getPendingTakeoverRequests(user.householdId, user.id, language);
  }

  async requestTakeover(
    instanceId: string,
    dto: RequestChoreTakeoverDto,
    user: AuthenticatedUser,
    language: SupportedLanguage
  ) {
    const instance = await this.repository.getInstanceForHousehold(instanceId, user.householdId, language);
    if (!instance) {
      return this.repository.throwNotFound(this.i18nService.translate("chores.not_found", language));
    }

    if (user.role === "child") {
      return this.repository.throwForbidden(
        this.i18nService.translate("chores.takeover_request_forbidden", language)
      );
    }

    if (instance.assigneeId !== user.id) {
      return this.repository.throwForbidden(
        this.i18nService.translate("chores.takeover_request_only_assignee", language)
      );
    }

    if (["completed", "cancelled", "pending_approval"].includes(instance.state)) {
      return this.repository.throwConflict(
        this.i18nService.translate("chores.invalid_takeover_request_state", language)
      );
    }

    const takeoverRequest = await this.repository.createTakeoverRequest({
      householdId: user.householdId,
      instanceId,
      requesterUserId: user.id,
      requestedUserId: dto.requestedUserId,
      note: dto.note,
      language,
      conflictMessage: this.i18nService.translate("chores.takeover_request_already_pending", language),
      forbiddenMessage: this.i18nService.translate("chores.takeover_request_invalid_target", language)
    });
    this.publishSyncEvent(user, "instance.takeover_requested", "instance", instanceId);
    return takeoverRequest;
  }

  async approveTakeoverRequest(
    requestId: string,
    dto: RespondChoreTakeoverDto,
    user: AuthenticatedUser,
    language: SupportedLanguage
  ) {
    const updatedInstance = await this.repository.approveTakeoverRequest({
      requestId,
      householdId: user.householdId,
      actingUserId: user.id,
      note: dto.note,
      language,
      invalidStateMessage: this.i18nService.translate("chores.invalid_takeover_request_state", language),
      notFoundMessage: this.i18nService.translate("chores.takeover_request_not_found", language),
      forbiddenMessage: this.i18nService.translate("chores.takeover_request_approval_forbidden", language)
    });
    this.publishSyncEvent(user, "instance.takeover_approved", "instance", updatedInstance.id);
    return updatedInstance;
  }

  async declineTakeoverRequest(
    requestId: string,
    dto: RespondChoreTakeoverDto,
    user: AuthenticatedUser,
    language: SupportedLanguage
  ) {
    const takeoverRequest = await this.repository.declineTakeoverRequest({
      requestId,
      householdId: user.householdId,
      actingUserId: user.id,
      note: dto.note,
      language,
      invalidStateMessage: this.i18nService.translate("chores.invalid_takeover_request_state", language),
      notFoundMessage: this.i18nService.translate("chores.takeover_request_not_found", language),
      forbiddenMessage: this.i18nService.translate("chores.takeover_request_approval_forbidden", language)
    });
    this.publishSyncEvent(user, "instance.takeover_declined", "takeover_request", takeoverRequest.id);
    return takeoverRequest;
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
    const instance = await this.repository.getInstanceForHousehold(instanceId, user.householdId, language);
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

    const submittedInstance = await this.repository.submitInstance({
      instanceId,
      actingUserId: user.id,
      householdId: user.householdId,
      completedChecklistItemIds,
      attachments: dto.attachments ?? [],
      note: dto.note,
      awardedPoints,
      language,
      nextState: shouldRequireApproval ? "pending_approval" : "completed"
    });
    this.publishSyncEvent(
      user,
      shouldRequireApproval ? "instance.submitted" : "instance.completed",
      "instance",
      instanceId
    );
    return submittedInstance;
  }

  async approveInstance(
    instanceId: string,
    dto: ReviewChoreDto,
    user: AuthenticatedUser,
    language: SupportedLanguage
  ) {
    const instance = await this.repository.getInstanceForHousehold(instanceId, user.householdId, language);
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

    const reviewedInstance = await this.repository.reviewInstance({
      instanceId,
      actingUserId: user.id,
      householdId: user.householdId,
      approved: true,
      note: dto.note,
      language,
      awardedPoints
    });
    this.publishSyncEvent(user, "instance.approved", "instance", instanceId);
    return reviewedInstance;
  }

  async rejectInstance(
    instanceId: string,
    dto: ReviewChoreDto,
    user: AuthenticatedUser,
    language: SupportedLanguage
  ) {
    const instance = await this.repository.getInstanceForHousehold(instanceId, user.householdId, language);
    if (!instance) {
      return this.repository.throwNotFound(this.i18nService.translate("chores.not_found", language));
    }

    if (instance.state !== "pending_approval") {
      return this.repository.throwConflict(
        this.i18nService.translate("chores.invalid_review_state", language)
      );
    }

    const reviewedInstance = await this.repository.reviewInstance({
      instanceId,
      actingUserId: user.id,
      householdId: user.householdId,
      approved: false,
      note: dto.note,
      language,
      awardedPoints: 0
    });
    this.publishSyncEvent(user, "instance.rejected", "instance", instanceId);
    return reviewedInstance;
  }

  private publishSyncEvent(
    user: AuthenticatedUser,
    action: string,
    entityType: "instance" | "template" | "takeover_request",
    entityId?: string
  ) {
    this.dashboardSyncService.publishChoreUpdate({
      householdId: user.householdId,
      actorUserId: user.id,
      action,
      entityType,
      entityId
    });
  }
}

import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { AuthenticatedUser } from "../../common/auth/authenticated-user.type";
import { AppConfigService } from "../../common/config/app-config.service";
import { I18nService } from "../../common/i18n/i18n.service";
import { SupportedLanguage } from "../../common/i18n/supported-languages";
import { FeatureAccessService, PackageFeatureId } from "../../common/tenancy/feature-access.service";
import { TenantRuntimePolicyService } from "../../common/tenancy/tenant-runtime-policy.service";
import { DashboardSyncService } from "../dashboard/dashboard-sync.service";
import { AchievementsService } from "../achievements/achievements.service";
import { PointsService } from "../gamification/points.service";
import { HouseholdRepository } from "../household/household.repository";
import { CompleteExternalChoreDto } from "./dto/complete-external-chore.dto";
import { CreateChoreInstanceDto } from "./dto/create-chore-instance.dto";
import { CreateChoreTemplateDto } from "./dto/create-chore-template.dto";
import { RequestChoreTakeoverDto } from "./dto/request-chore-takeover.dto";
import { ReleaseDeferredChoreDto } from "./dto/release-deferred-chore.dto";
import { ReviewChoreDto } from "./dto/review-chore.dto";
import { RespondChoreTakeoverDto } from "./dto/respond-chore-takeover.dto";
import { SnoozeDeferredChoreDto } from "./dto/snooze-deferred-chore.dto";
import { SubmitChoreDto } from "./dto/submit-chore.dto";
import { QuickLogChoreDto } from "./dto/quick-log-chore.dto";
import { ProofStorageService } from "./proof-storage.service";

@Injectable()
export class ChoresService {
  constructor(
    private readonly repository: HouseholdRepository,
    private readonly pointsService: PointsService,
    private readonly i18nService: I18nService,
    private readonly appConfigService: AppConfigService,
    private readonly featureAccessService: FeatureAccessService,
    private readonly tenantRuntimePolicyService: TenantRuntimePolicyService,
    private readonly proofStorageService: ProofStorageService,
    private readonly dashboardSyncService: DashboardSyncService,
    private readonly achievementsService: AchievementsService
  ) {}

  async getTemplates(user: AuthenticatedUser, language: SupportedLanguage) {
    if (this.appConfigService.hostedModeEnabled) {
      await this.repository.ensureDefaultTemplatesForHousehold(user.householdId, language);
    }
    return this.repository.getTemplates(user.householdId, language);
  }

  async createTemplate(dto: CreateChoreTemplateDto, user: AuthenticatedUser, language: SupportedLanguage) {
    // templates_manage enforced by FeatureGuard at the controller level
    if (this.hasFollowUpAutomation(dto)) {
      await this.requireFeature(user, "follow_up_automation");
    }
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
    // templates_manage enforced by FeatureGuard at the controller level
    if (this.hasFollowUpAutomation(dto)) {
      await this.requireFeature(user, "follow_up_automation");
    }
    const template = await this.repository.getTemplateForHousehold(templateId, user.householdId, language);
    if (!template) {
      return this.repository.throwNotFound(this.i18nService.translate("chores.template_not_found", language));
    }
    if (template.isOperatorManaged) {
      throw new ForbiddenException({
        code: "operator_managed_template",
        message: "This template is managed by the operator and cannot be edited. Use 'Save as copy' to create an editable version."
      });
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
    if (template.isOperatorManaged) {
      throw new ForbiddenException({
        code: "operator_managed_template",
        message: "This template is managed by the operator and cannot be deleted. You can disable it instead."
      });
    }

    const deleted = await this.repository.deleteTemplate(templateId, user.householdId, user.id);
    this.publishSyncEvent(user, "template.deleted", "template", templateId);
    return deleted;
  }

  async resetTemplatesToDefaults(user: AuthenticatedUser, language: SupportedLanguage) {
    const result = await this.repository.resetDefaultTemplatesForHousehold(user.householdId, language);
    this.publishSyncEvent(user, "templates.reset", "template");
    return result;
  }

  async createInstance(dto: CreateChoreInstanceDto, user: AuthenticatedUser, language: SupportedLanguage) {
    // chores_manage enforced by FeatureGuard at the controller level
    if (dto.assigneeId) {
      await this.requireFeature(user, "reassignment");
    }
    const instance = await this.repository.createInstance(dto, user.householdId, user.id, language);
    this.publishSyncEvent(user, "instance.created", "instance", instance.id);
    return instance;
  }

  async quickLog(dto: QuickLogChoreDto, user: AuthenticatedUser, language: SupportedLanguage) {
    if (!dto.instanceId && !dto.templateId && !dto.title?.trim()) {
      throw new BadRequestException({
        message: "Quick log needs an existing chore/template selection or free-text title."
      });
    }

    if (dto.createTemplateFromEntry && !dto.title?.trim()) {
      throw new BadRequestException({
        message: "A title is required when creating a template from a quick log entry."
      });
    }

    const household = await this.repository.getHousehold(user.householdId);
    const fallbackPoints = 0;
    const resolvedPoints = Math.max(
      0,
      Math.floor(
        dto.pointsOverride ??
          household.settings.quickLogPointsDefault ??
          fallbackPoints
      )
    );

    const instance = await this.repository.createQuickLogEntry({
      householdId: user.householdId,
      actorUserId: user.id,
      title: dto.title?.trim() || "Quick log entry",
      note: dto.note,
      points: resolvedPoints,
      templateId: dto.templateId,
      instanceId: dto.instanceId,
      createTemplateFromEntry: dto.createTemplateFromEntry,
      language
    });

    this.publishSyncEvent(user, "instance.quick_logged", "instance", instance.id);
    return instance;
  }

  async updateInstance(
    instanceId: string,
    dto: CreateChoreInstanceDto,
    user: AuthenticatedUser,
    language: SupportedLanguage
  ) {
    // chores_manage enforced by FeatureGuard at the controller level
    const instance = await this.repository.getInstanceForHousehold(instanceId, user.householdId, language);
    if (!instance) {
      return this.repository.throwNotFound(this.i18nService.translate("chores.not_found", language));
    }

    if (dto.assigneeId && dto.assigneeId !== instance.assigneeId) {
      await this.requireFeature(user, "reassignment");
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

  async cancelOccurrence(instanceId: string, user: AuthenticatedUser, language: SupportedLanguage) {
    const instance = await this.repository.getInstanceForHousehold(instanceId, user.householdId, language);
    if (!instance) {
      return this.repository.throwNotFound(this.i18nService.translate("chores.not_found", language));
    }

    if (instance.state === "completed" || instance.state === "cancelled") {
      return this.repository.throwConflict(
        this.i18nService.translate("chores.invalid_cancel_state", language)
      );
    }

    if (!instance.supportsOccurrenceCancellation) {
      return this.repository.throwConflict(
        this.i18nService.translate("chores.occurrence_cancel_not_available", language)
      );
    }

    const result = await this.repository.cancelOccurrence(
      instanceId,
      user.householdId,
      user.id,
      language
    );

    result.cancelledIds.forEach((cancelledId) => {
      this.publishSyncEvent(user, "instance.cancelled", "instance", cancelledId);
    });

    if (result.nextInstance) {
      this.publishSyncEvent(user, "instance.created", "instance", result.nextInstance.id);
    }

    return result;
  }

  async closeCycle(instanceId: string, user: AuthenticatedUser, language: SupportedLanguage) {
    const instance = await this.repository.getInstanceForHousehold(instanceId, user.householdId, language);
    if (!instance) {
      return this.repository.throwNotFound(this.i18nService.translate("chores.not_found", language));
    }

    if (!instance.supportsSeriesCancellation) {
      return this.repository.throwConflict(
        this.i18nService.translate("chores.cycle_close_not_available", language)
      );
    }

    const result = await this.repository.closeCycle(
      instanceId,
      user.householdId,
      user.id,
      language
    );

    result.cancelledIds.forEach((cancelledId) => {
      this.publishSyncEvent(user, "instance.cancelled", "instance", cancelledId);
    });

    return result;
  }

  async cancelSeries(instanceId: string, user: AuthenticatedUser, language: SupportedLanguage) {
    return this.closeCycle(instanceId, user, language);
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

  async getTakeoverRequests(user: AuthenticatedUser, language: SupportedLanguage) {
    return this.repository.getPendingTakeoverRequests(user.householdId, user.id, language);
  }

  async requestTakeover(
    instanceId: string,
    dto: RequestChoreTakeoverDto,
    user: AuthenticatedUser,
    language: SupportedLanguage
  ) {
    // takeover_requests enforced by FeatureGuard at the controller level
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
    return this.handleProofUpload(file, user, language);
  }

  private async handleProofUpload(
    file: Express.Multer.File | undefined,
    user: AuthenticatedUser,
    language: SupportedLanguage
  ) {
    // proof_uploads enforced by FeatureGuard at the controller level (uploadProof route)
    await this.tenantRuntimePolicyService.assertActionAllowed(user.tenantId, "proof_upload");
    const currentUsageBytes = await this.repository.getProofStorageUsage(user.tenantId, user.householdId);
    await this.tenantRuntimePolicyService.assertStorageBytesLimit(
      user.tenantId,
      currentUsageBytes,
      file?.size ?? 0
    );
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
      const fileBuffer = await this.proofStorageService.readProofUpload(attachment.storageKey, {
        tenantId: user.tenantId,
        householdId: user.householdId
      });
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
    if (user.role === "child") {
      await this.requireFeature(user, "approvals");
    }
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

    if (!shouldRequireApproval) {
      const beneficiaryId = instance.assigneeId ?? user.id;
      const newlyUnlocked = await this.achievementsService.evaluateForUser({
        userId: beneficiaryId,
        householdId: user.householdId,
        tenantId: user.tenantId,
        choreCompleted: true,
        difficulty: instance.difficulty as "easy" | "medium" | "hard",
        choreGroupTitle: instance.groupTitle ?? null,
        isPerfectDay: "completionMilestone" in submittedInstance && submittedInstance.completionMilestone?.type === "perfect_day"
      });
      if (newlyUnlocked.length > 0) {
        return { ...submittedInstance, newlyUnlockedAchievements: newlyUnlocked };
      }
    }

    return submittedInstance;
  }

  async completeInstanceExternally(
    instanceId: string,
    dto: CompleteExternalChoreDto,
    user: AuthenticatedUser,
    language: SupportedLanguage
  ) {
    const instance = await this.repository.getInstanceForHousehold(instanceId, user.householdId, language);
    if (!instance) {
      return this.repository.throwNotFound(this.i18nService.translate("chores.not_found", language));
    }

    if (user.role === "child") {
      return this.repository.throwForbidden(
        this.i18nService.translate("chores.assignee_only_submit", language)
      );
    }

    const completedChecklistItemIds = dto.completedChecklistItemIds ?? [];

    if (instance.requirePhotoProof && (dto.attachments?.length ?? 0) < 1) {
      throw new BadRequestException({
        message: this.i18nService.translate("chores.photo_proof_required", language)
      });
    }

    const completedInstance = await this.repository.submitInstance({
      instanceId,
      actingUserId: user.id,
      householdId: user.householdId,
      completedChecklistItemIds,
      attachments: dto.attachments ?? [],
      note: dto.note,
      awardedPoints: instance.basePoints,
      completedByExternal: true,
      externalCompleterName: dto.externalCompleterName,
      externalCompletionNote: dto.note,
      language,
      nextState: "completed"
    });
    this.publishSyncEvent(user, "instance.completed_external", "instance", instanceId);
    return completedInstance;
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

    const beneficiaryId = instance.assigneeId ?? null;
    if (beneficiaryId) {
      const newlyUnlocked = await this.achievementsService.evaluateForUser({
        userId: beneficiaryId,
        householdId: user.householdId,
        tenantId: user.tenantId,
        choreCompleted: true,
        difficulty: instance.difficulty as "easy" | "medium" | "hard",
        choreGroupTitle: instance.groupTitle ?? null,
        isPerfectDay: "completionMilestone" in reviewedInstance && reviewedInstance.completionMilestone?.type === "perfect_day"
      });
      if (newlyUnlocked.length > 0) {
        return { ...reviewedInstance, newlyUnlockedAchievements: newlyUnlocked };
      }
    }

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

  async releaseDeferredInstance(
    instanceId: string,
    dto: ReleaseDeferredChoreDto,
    user: AuthenticatedUser,
    language: SupportedLanguage
  ) {
    const releasedInstance = await this.repository.releaseDeferredFollowUp({
      instanceId,
      actingUserId: user.id,
      householdId: user.householdId,
      note: dto.note,
      language
    });
    this.publishSyncEvent(user, "instance.released", "instance", instanceId);
    return releasedInstance;
  }

  async snoozeDeferredInstance(
    instanceId: string,
    dto: SnoozeDeferredChoreDto,
    user: AuthenticatedUser,
    language: SupportedLanguage
  ) {
    const snoozedInstance = await this.repository.snoozeDeferredFollowUp({
      instanceId,
      actingUserId: user.id,
      householdId: user.householdId,
      notBeforeAt: dto.notBeforeAt,
      note: dto.note,
      language
    });
    this.publishSyncEvent(user, "instance.snoozed", "instance", instanceId);
    return snoozedInstance;
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

  private async requireFeature(user: AuthenticatedUser, featureId: PackageFeatureId) {
    const effectiveFeatureAccess = this.appConfigService.hostedModeEnabled
      ? await this.featureAccessService.getFeatureAccessForTenant(user.tenantId)
      : user.featureAccess;
    this.featureAccessService.assertEnabled(effectiveFeatureAccess, featureId);
  }

  private hasFollowUpAutomation(dto: CreateChoreTemplateDto) {
    return (dto.dependencyRules?.length ?? 0) > 0 || (dto.dependencyTemplateIds?.length ?? 0) > 0;
  }
}

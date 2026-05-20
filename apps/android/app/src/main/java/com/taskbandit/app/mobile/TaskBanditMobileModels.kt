package com.taskbandit.app.mobile

data class TaskBanditSession(
    val baseUrl: String,
    val token: String?
)

data class MobileLocalAuthProvider(
    val enabled: Boolean,
    val forcedByConfig: Boolean,
    val selfSignupEnabled: Boolean
)

data class MobileOidcAuthProvider(
    val enabled: Boolean,
    val authority: String,
    val clientId: String,
    val source: String
)

data class MobileAuthProviders(
    val local: MobileLocalAuthProvider,
    val oidc: MobileOidcAuthProvider
)

data class MobileSignupRequest(
    val displayName: String,
    val email: String,
    val password: String
)

data class MobileAuthTenantContext(
    val tenantId: String,
    val tenantSlug: String?,
    val hostedMode: Boolean,
    val canonicalApiBaseUrl: String?,
    val canonicalWebBaseUrl: String?
)

data class MobileLoginResult(
    val accessToken: String,
    val tenantContext: MobileAuthTenantContext? = null
)

data class MobilePublicEnrollmentSiteConfig(
    val publicEnrollmentEnabled: Boolean = false,
    val enrollmentStartPath: String? = null,
    val hostedSignupUrl: String? = null,
    val canonicalWebBaseUrl: String? = null
)

data class MobileHostedEnrollmentStartResult(
    val handoffUrl: String,
    val enrollmentId: String? = null
)

data class MobileInviteTenantContext(
    val tenantId: String,
    val tenantSlug: String,
    val tenantApiUrl: String,
    val tenantWebUrl: String
)

data class MobileResolvedInvite(
    val inviteToken: String,
    val inviteType: String,
    val status: String,
    val recipientEmail: String?,
    val tenantContext: MobileInviteTenantContext
)

data class MobileUser(
    val id: String,
    val displayName: String,
    val role: String,
    val points: Int,
    val currentStreak: Int,
    val featureAccess: MobileFeatureAccess = MobileFeatureAccess()
)

data class MobileFeatureAccess(
    val templatesManage: Boolean = true,
    val choresManage: Boolean = true,
    val reassignment: Boolean = true,
    val takeoverDirect: Boolean = true,
    val takeoverRequests: Boolean = true,
    val approvals: Boolean = true,
    val proofUploads: Boolean = true,
    val followUpAutomation: Boolean = true,
    val externalCompletion: Boolean = true,
    val deferredFollowUpControl: Boolean = true,
    val quickLog: Boolean = true
)

data class MobileHostedQuotas(
    val membersLimit: Int? = null,
    val storageBytesLimit: Long? = null,
    val monthlyNotificationLimit: Int? = null,
    val exportRetentionDays: Int? = null,
    val proofRetentionDays: Int? = null,
    val auditRetentionDays: Int? = null,
    val customDomainEnabled: Boolean? = null,
    val brandingEnabled: Boolean? = null
)

data class MobileHostedSubscriptionOverview(
    val hostedMode: Boolean = false,
    val tenantId: String? = null,
    val tenantSlug: String? = null,
    val planCode: String? = null,
    val packageCode: String? = null,
    val packageDisplayName: String? = null,
    val lifecycleState: String? = null,
    val entitlementState: String? = null,
    val billingStatus: String? = null,
    val suspensionReason: String? = null,
    val trialEndsAt: String? = null,
    val graceEndsAt: String? = null,
    val quotaPolicyVersion: String? = null,
    val configVersion: String? = null,
    val updatedAt: String? = null,
    val quotas: MobileHostedQuotas = MobileHostedQuotas(),
    val usage: MobileHostedUsage = MobileHostedUsage(),
    val featureAccess: MobileFeatureAccess = MobileFeatureAccess(),
    val canonicalApiBaseUrl: String? = null,
    val canonicalWebBaseUrl: String? = null
)

data class MobileHostedUsage(
    val membersUsed: Int? = null,
    val storageBytesUsed: Long? = null,
    val monthlyNotificationsUsed: Int? = null
)

data class MobileLeaderboardEntry(
    val displayName: String,
    val role: String,
    val points: Int,
    val currentStreak: Int,
    val isExternal: Boolean = false
)

data class MobileTriggerInfo(
    val title: String,
    val completedAt: String?,
    val completedByDisplayName: String?,
    val completedByExternal: Boolean,
    val externalCompleterName: String?
)

data class MobileCompletionMilestone(
    val type: String,
    val userId: String,
    val dayKey: String,
    val completedChoreCount: Int,
    val messageIndex: Int
)

data class MobileChore(
    val id: String,
    val cycleId: String? = null,
    val occurrenceRootId: String? = null,
    val title: String,
    val groupTitle: String,
    val typeTitle: String,
    val subtypeLabel: String? = null,
    val state: String,
    val supportsOccurrenceCancellation: Boolean = false,
    val supportsSeriesCancellation: Boolean = false,
    val assigneeId: String? = null,
    val assigneeDisplayName: String? = null,
    val assignmentReason: String? = null,
    val dueAt: String,
    val completedAt: String? = null,
    val cancelledAt: String? = null,
    val isOverdue: Boolean,
    val requirePhotoProof: Boolean,
    val basePoints: Int = 0,
    val awardedPoints: Int = 0,
    val checklist: List<MobileChecklistItem>,
    val completedChecklistIds: List<String>,
    val variantId: String? = null,
    val templateId: String? = null,
    val completionMilestone: MobileCompletionMilestone? = null,
    val newlyUnlockedAchievements: List<MobileUnlockedAchievement> = emptyList(),
    val triggerInfo: MobileTriggerInfo? = null
)

data class MobileChecklistItem(
    val id: String,
    val title: String,
    val required: Boolean
)

data class MobileUploadedProof(
    val clientFilename: String,
    val contentType: String,
    val storageKey: String,
    val sizeBytes: Long
)

data class MobileNotificationDeviceRegistration(
    val installationId: String,
    val deviceName: String,
    val provider: String = "generic",
    val pushToken: String? = null,
    val appVersion: String? = null,
    val locale: String? = null,
    val notificationsEnabled: Boolean = true
)

data class MobileChoreSubmissionDraft(
    val id: String,
    val choreId: String,
    val completedChecklistIds: List<String>,
    val proofUriStrings: List<String>,
    val note: String?,
    val queuedAtEpochMillis: Long
)

data class MobileNotification(
    val id: String,
    val type: String,
    val title: String,
    val message: String,
    val entityType: String? = null,
    val entityId: String? = null,
    val isRead: Boolean,
    val createdAt: String
)

data class MobileTakeoverRequest(
    val id: String,
    val choreId: String,
    val choreTitle: String,
    val status: String,
    val note: String? = null,
    val createdAt: String,
    val respondedAt: String? = null,
    val requester: MobileHouseholdMember,
    val requested: MobileHouseholdMember
)

data class MobileNotificationDevice(
    val id: String,
    val installationId: String,
    val provider: String,
    val pushTokenConfigured: Boolean,
    val deviceName: String?,
    val appVersion: String?,
    val locale: String?,
    val notificationsEnabled: Boolean,
    val lastSeenAt: String
)

data class MobileReleaseInfo(
    val releaseVersion: String,
    val buildNumber: String,
    val commitSha: String
)

data class MobileDashboardCompatibility(
    val takeoverRequestsSupported: Boolean = true
)

data class MobileHouseholdMember(
    val id: String,
    val displayName: String,
    val role: String
)

data class MobileTemplateRecurrence(
    val type: String,
    val intervalDays: Int?,
    val weekdays: List<String>
)

data class MobileTemplateVariant(
    val id: String,
    val label: String
)

data class MobileChoreTemplate(
    val id: String,
    val groupTitle: String,
    val title: String,
    val description: String,
    val assignmentStrategy: String,
    val recurrence: MobileTemplateRecurrence,
    val requirePhotoProof: Boolean,
    val stickyFollowUpAssignee: Boolean = false,
    val recurrenceStartStrategy: String = "due_at",
    val variants: List<MobileTemplateVariant> = emptyList()
)

data class MobileAchievement(
    val key: String,
    val name: String,
    val descriptionKey: String,
    val category: String,
    val isRepeatable: Boolean,
    val goal: Int,
    val bonusPoints: Int,
    val sortOrder: Int,
    val progress: Int,
    val earnedAt: String?,
    val timesEarned: Int
)

data class MobileUnlockedAchievement(
    val key: String,
    val name: String,
    val descriptionKey: String,
    val category: String,
    val bonusPoints: Int,
    val timesEarned: Int
)

data class MobileDashboard(
    val user: MobileUser,
    val pendingApprovals: Int,
    val activeChores: Int,
    val streakLeader: String,
    val leaderboard: List<MobileLeaderboardEntry>,
    val chores: List<MobileChore>,
    val takeoverRequests: List<MobileTakeoverRequest>,
    val notifications: List<MobileNotification>,
    val members: List<MobileHouseholdMember>,
    val templates: List<MobileChoreTemplate>,
    val quickLogPointsDefault: Int? = null,
    val compatibility: MobileDashboardCompatibility = MobileDashboardCompatibility(),
    val achievements: List<MobileAchievement> = emptyList(),
    val enableAchievements: Boolean = true
)

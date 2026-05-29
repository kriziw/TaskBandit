package com.taskbandit.app.mobile

import org.json.JSONArray
import org.json.JSONObject

// ---------------------------------------------------------------------------
// Shared JSON extension
// ---------------------------------------------------------------------------

internal fun JSONObject.optNullableString(key: String): String? =
    optString(key).trim().takeIf { it.isNotBlank() && !it.equals("null", ignoreCase = true) }

// ---------------------------------------------------------------------------
// Generic array helpers
// ---------------------------------------------------------------------------

internal fun <T> parseJsonArray(entries: JSONArray?, mapper: (JSONObject) -> T): List<T> {
    if (entries == null) return emptyList()
    return buildList {
        for (index in 0 until entries.length()) {
            val item = entries.optJSONObject(index) ?: continue
            add(mapper(item))
        }
    }
}

internal fun parseStringArray(entries: JSONArray?): List<String> {
    if (entries == null) return emptyList()
    return buildList {
        for (index in 0 until entries.length()) {
            val value = entries.optString(index).trim()
            if (value.isNotBlank()) add(value)
        }
    }
}

// ---------------------------------------------------------------------------
// User / leaderboard
// ---------------------------------------------------------------------------

internal fun parseUser(entry: JSONObject): MobileUser = MobileUser(
    id = entry.optString("id"),
    displayName = entry.optString("displayName"),
    role = entry.optString("role"),
    points = entry.optInt("points"),
    currentStreak = entry.optInt("currentStreak"),
    featureAccess = entry.optJSONObject("featureAccess")
        ?.let(::parseFeatureAccessCached) ?: MobileFeatureAccess()
)

internal fun parseLeaderboardEntry(entry: JSONObject): MobileLeaderboardEntry = MobileLeaderboardEntry(
    displayName = entry.optString("displayName"),
    role = entry.optString("role"),
    points = entry.optInt("points"),
    currentStreak = entry.optInt("currentStreak"),
    isExternal = entry.optBoolean("isExternal", false)
)

// ---------------------------------------------------------------------------
// Feature access — two variants because of different key conventions
// "Cached" uses camelCase (written by us in dashboardToJson)
// "Api"    uses snake_case (received from the server)
// ---------------------------------------------------------------------------

internal fun parseFeatureAccessCached(entry: JSONObject): MobileFeatureAccess = MobileFeatureAccess(
    templatesManage = entry.optBoolean("templatesManage", true),
    choresManage = entry.optBoolean("choresManage", true),
    reassignment = entry.optBoolean("reassignment", true),
    takeoverDirect = entry.optBoolean("takeoverDirect", true),
    takeoverRequests = entry.optBoolean("takeoverRequests", true),
    approvals = entry.optBoolean("approvals", true),
    proofUploads = entry.optBoolean("proofUploads", true),
    followUpAutomation = entry.optBoolean("followUpAutomation", true),
    externalCompletion = entry.optBoolean("externalCompletion", true),
    deferredFollowUpControl = entry.optBoolean("deferredFollowUpControl", true),
    quickLog = entry.optBoolean("quickLog", false),
    rewardsManage = entry.optBoolean("rewardsManage", false)
)

internal fun parseFeatureAccessFromApi(entry: JSONObject?): MobileFeatureAccess {
    if (entry == null) return MobileFeatureAccess(quickLog = false, rewardsManage = false)
    return MobileFeatureAccess(
        templatesManage = entry.optBoolean("templates_manage", true),
        choresManage = entry.optBoolean("chores_manage", true),
        reassignment = entry.optBoolean("reassignment", true),
        takeoverDirect = entry.optBoolean("takeover_direct", true),
        takeoverRequests = entry.optBoolean("takeover_requests", true),
        approvals = entry.optBoolean("approvals", true),
        proofUploads = entry.optBoolean("proof_uploads", true),
        followUpAutomation = entry.optBoolean("follow_up_automation", true),
        externalCompletion = entry.optBoolean("external_completion", true),
        deferredFollowUpControl = entry.optBoolean("deferred_follow_up_control", true),
        quickLog = entry.optBoolean("quick_log", false),
        rewardsManage = entry.optBoolean("rewards_manage", false)
    )
}

// ---------------------------------------------------------------------------
// Chore instance
// ---------------------------------------------------------------------------

internal fun parseCompletionMilestone(entry: JSONObject?): MobileCompletionMilestone? {
    if (entry == null) return null
    val type = entry.optString("type")
    val userId = entry.optString("userId")
    val dayKey = entry.optString("dayKey")
    if (type.isBlank() || userId.isBlank() || dayKey.isBlank()) return null
    return MobileCompletionMilestone(
        type = type,
        userId = userId,
        dayKey = dayKey,
        completedChoreCount = entry.optInt("completedChoreCount"),
        messageIndex = entry.optInt("messageIndex")
    )
}

internal fun parseChecklistItem(entry: JSONObject): MobileChecklistItem = MobileChecklistItem(
    id = entry.optString("id"),
    title = entry.optString("title"),
    required = entry.optBoolean("required")
)

/** Parses a chore from the live API response (includes triggerInfo; checklist IDs key is
 *  `checklistCompletionIds`). */
internal fun parseChoreFromApi(entry: JSONObject): MobileChore = MobileChore(
    id = entry.optString("id"),
    cycleId = entry.optNullableString("cycleId"),
    occurrenceRootId = entry.optNullableString("occurrenceRootId"),
    title = entry.optString("title"),
    groupTitle = entry.optString("groupTitle").ifBlank { "General" },
    typeTitle = entry.optString("typeTitle").ifBlank { entry.optString("title") },
    subtypeLabel = entry.optNullableString("subtypeLabel"),
    state = entry.optString("state"),
    supportsOccurrenceCancellation = entry.optBoolean("supportsOccurrenceCancellation"),
    supportsSeriesCancellation = entry.optBoolean("supportsSeriesCancellation"),
    assigneeId = entry.optNullableString("assigneeId"),
    assigneeDisplayName = entry.optNullableString("assigneeDisplayName"),
    assignmentReason = entry.optNullableString("assignmentReason"),
    dueAt = entry.optString("dueAt"),
    completedAt = entry.optNullableString("completedAt"),
    cancelledAt = entry.optNullableString("cancelledAt"),
    isOverdue = entry.optBoolean("isOverdue"),
    requirePhotoProof = entry.optBoolean("requirePhotoProof"),
    basePoints = entry.optInt("basePoints"),
    awardedPoints = entry.optInt("awardedPoints"),
    checklist = parseJsonArray(entry.optJSONArray("checklist"), ::parseChecklistItem),
    completedChecklistIds = parseStringArray(entry.optJSONArray("checklistCompletionIds")),
    variantId = entry.optNullableString("variantId"),
    templateId = entry.optNullableString("templateId"),
    completionMilestone = parseCompletionMilestone(entry.optJSONObject("completionMilestone")),
    triggerInfo = entry.optJSONObject("triggerInfo")?.let { tj ->
        MobileTriggerInfo(
            title = tj.optString("title"),
            completedAt = tj.optNullableString("completedAt"),
            completedByDisplayName = tj.optNullableString("completedByDisplayName"),
            completedByExternal = tj.optBoolean("completedByExternal"),
            externalCompleterName = tj.optNullableString("externalCompleterName")
        )
    }
)

/** Parses a chore from the dashboard cache (checklist IDs key is `completedChecklistIds`). */
internal fun parseChoreFromCache(entry: JSONObject): MobileChore = MobileChore(
    id = entry.optString("id"),
    cycleId = entry.optNullableString("cycleId"),
    occurrenceRootId = entry.optNullableString("occurrenceRootId"),
    title = entry.optString("title"),
    groupTitle = entry.optString("groupTitle").ifBlank { "General" },
    typeTitle = entry.optString("typeTitle").ifBlank { entry.optString("title") },
    subtypeLabel = entry.optNullableString("subtypeLabel"),
    state = entry.optString("state"),
    supportsOccurrenceCancellation = entry.optBoolean("supportsOccurrenceCancellation"),
    supportsSeriesCancellation = entry.optBoolean("supportsSeriesCancellation"),
    assigneeId = entry.optNullableString("assigneeId"),
    assigneeDisplayName = entry.optNullableString("assigneeDisplayName"),
    assignmentReason = entry.optNullableString("assignmentReason"),
    dueAt = entry.optString("dueAt"),
    completedAt = entry.optNullableString("completedAt"),
    cancelledAt = entry.optNullableString("cancelledAt"),
    isOverdue = entry.optBoolean("isOverdue"),
    requirePhotoProof = entry.optBoolean("requirePhotoProof"),
    basePoints = entry.optInt("basePoints"),
    awardedPoints = entry.optInt("awardedPoints"),
    checklist = parseJsonArray(entry.optJSONArray("checklist"), ::parseChecklistItem),
    completedChecklistIds = parseStringArray(entry.optJSONArray("completedChecklistIds")),
    variantId = entry.optNullableString("variantId"),
    templateId = entry.optNullableString("templateId"),
    completionMilestone = parseCompletionMilestone(entry.optJSONObject("completionMilestone"))
)

// ---------------------------------------------------------------------------
// Household members / takeover / notifications
// ---------------------------------------------------------------------------

internal fun parseMember(entry: JSONObject): MobileHouseholdMember = MobileHouseholdMember(
    id = entry.optString("id"),
    displayName = entry.optString("displayName"),
    role = entry.optString("role")
)

internal fun parseMembers(entries: JSONArray?): List<MobileHouseholdMember> {
    if (entries == null) return emptyList()
    return buildList {
        for (index in 0 until entries.length()) {
            val item = entries.optJSONObject(index) ?: continue
            val id = item.optString("id")
            val displayName = item.optString("displayName")
            if (id.isBlank() || displayName.isBlank()) continue
            add(MobileHouseholdMember(id = id, displayName = displayName, role = item.optString("role")))
        }
    }
}

internal fun parseTakeoverRequest(entry: JSONObject): MobileTakeoverRequest {
    val requester = entry.optJSONObject("requester")?.let(::parseMember)
        ?: MobileHouseholdMember(id = "", displayName = "", role = "")
    val requested = entry.optJSONObject("requested")?.let(::parseMember)
        ?: MobileHouseholdMember(id = "", displayName = "", role = "")
    return MobileTakeoverRequest(
        id = entry.optString("id"),
        choreId = entry.optString("choreId"),
        choreTitle = entry.optString("choreTitle"),
        status = entry.optString("status"),
        note = entry.optNullableString("note"),
        createdAt = entry.optString("createdAt"),
        respondedAt = entry.optNullableString("respondedAt"),
        requester = requester,
        requested = requested
    )
}

internal fun parseNotification(entry: JSONObject): MobileNotification = MobileNotification(
    id = entry.optString("id"),
    type = entry.optString("type"),
    title = entry.optString("title"),
    message = entry.optString("message"),
    entityType = entry.optNullableString("entityType"),
    entityId = entry.optNullableString("entityId"),
    isRead = entry.optBoolean("isRead"),
    createdAt = entry.optString("createdAt")
)

internal fun parseNotificationDevices(entries: JSONArray?): List<MobileNotificationDevice> {
    if (entries == null) return emptyList()
    return buildList {
        for (index in 0 until entries.length()) {
            val item = entries.optJSONObject(index) ?: continue
            add(MobileNotificationDevice(
                id = item.optString("id"),
                installationId = item.optString("installationId"),
                provider = item.optString("provider"),
                pushTokenConfigured = item.optBoolean("pushTokenConfigured"),
                deviceName = item.optString("deviceName").ifBlank { null },
                appVersion = item.optString("appVersion").ifBlank { null },
                locale = item.optString("locale").ifBlank { null },
                notificationsEnabled = item.optBoolean("notificationsEnabled"),
                lastSeenAt = item.optString("lastSeenAt")
            ))
        }
    }
}

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

internal fun parseTemplateRecurrence(entry: JSONObject): MobileTemplateRecurrence = MobileTemplateRecurrence(
    type = entry.optString("type").ifBlank { "none" },
    intervalDays = if (entry.has("intervalDays") && !entry.isNull("intervalDays"))
        entry.optInt("intervalDays") else null,
    weekdays = parseStringArray(entry.optJSONArray("weekdays"))
)

internal fun parseTemplateVariant(item: JSONObject): MobileTemplateVariant {
    val id = item.optString("id")
    val label = item.optString("label").trim()
        .takeIf { it.isNotBlank() && !it.equals("null", ignoreCase = true) }
        ?: return MobileTemplateVariant(id = id, label = "")
    val vtArr = item.optJSONArray("translations")
    val translations = buildList {
        for (j in 0 until (vtArr?.length() ?: 0)) {
            val vt = vtArr?.optJSONObject(j) ?: continue
            add(MobileVariantLabelTranslation(
                locale = vt.optString("locale").ifBlank { "en" },
                label = vt.optString("label").ifBlank { null }
            ))
        }
    }
    return MobileTemplateVariant(id = id, label = label, translations = translations)
}

internal fun parseTemplateChecklist(entries: JSONArray?): List<MobileTemplateChecklistItem> =
    parseJsonArray(entries) { item ->
        MobileTemplateChecklistItem(
            id = item.optString("id"),
            title = item.optString("title"),
            required = item.optBoolean("required")
        )
    }

internal fun parseTemplateTranslations(entries: JSONArray?): List<MobileTemplateTranslation> =
    parseJsonArray(entries) { item ->
        MobileTemplateTranslation(
            locale = item.optString("locale").ifBlank { "en" },
            groupTitle = item.optString("groupTitle").ifBlank { null },
            title = item.optString("title").ifBlank { null },
            description = item.optString("description").ifBlank { null }
        )
    }

internal fun parseTemplateDependencyRules(entries: JSONArray?): List<MobileTemplateDependencyRule> =
    parseJsonArray(entries) { item ->
        MobileTemplateDependencyRule(
            templateId = item.optString("templateId"),
            delayValue = item.optInt("delayValue", 1),
            delayUnit = item.optString("delayUnit").ifBlank { "days" }
        )
    }

/** Full template parse — includes difficulty, basePoints, translations, checklist, dependencyRules. */
internal fun parseFullTemplate(item: JSONObject): MobileChoreTemplate {
    val recurrence = item.optJSONObject("recurrence") ?: JSONObject()
    return MobileChoreTemplate(
        id = item.optString("id"),
        groupTitle = item.optString("groupTitle").ifBlank { "General" },
        title = item.optString("title"),
        description = item.optString("description"),
        difficulty = item.optString("difficulty").ifBlank { "medium" },
        basePoints = item.optInt("basePoints"),
        assignmentStrategy = item.optString("assignmentStrategy").ifBlank { "round_robin" },
        recurrence = parseTemplateRecurrence(recurrence),
        requirePhotoProof = item.optBoolean("requirePhotoProof"),
        stickyFollowUpAssignee = item.optBoolean("stickyFollowUpAssignee"),
        recurrenceStartStrategy = item.optString("recurrenceStartStrategy").ifBlank { "due_at" },
        defaultLocale = item.optString("defaultLocale").ifBlank { "en" },
        variants = parseJsonArray(item.optJSONArray("variants")) { v ->
            parseTemplateVariant(v).takeIf { it.label.isNotBlank() && it.id.isNotBlank() }
                ?: MobileTemplateVariant(id = v.optString("id"), label = v.optString("label"))
        },
        checklist = parseTemplateChecklist(item.optJSONArray("checklist")),
        translations = parseTemplateTranslations(item.optJSONArray("translations")),
        dependencyRules = parseTemplateDependencyRules(item.optJSONArray("dependencyRules"))
    )
}

internal fun parseFullTemplates(entries: JSONArray?): List<MobileChoreTemplate> {
    if (entries == null) return emptyList()
    return buildList {
        for (i in 0 until entries.length()) {
            val item = entries.optJSONObject(i) ?: continue
            if (item.optString("id").isBlank() || item.optString("title").isBlank()) continue
            add(parseFullTemplate(item))
        }
    }
}

// ---------------------------------------------------------------------------
// Compatibility
// ---------------------------------------------------------------------------

internal fun parseCompatibility(entry: JSONObject): MobileDashboardCompatibility =
    MobileDashboardCompatibility(
        takeoverRequestsSupported = entry.optBoolean("takeoverRequestsSupported", true)
    )

// ---------------------------------------------------------------------------
// Achievements & rewards
// ---------------------------------------------------------------------------

internal fun parseAchievement(json: JSONObject): MobileAchievement = MobileAchievement(
    key = json.optString("key"),
    name = json.optString("name"),
    descriptionKey = json.optString("descriptionKey"),
    category = json.optString("category"),
    isRepeatable = json.optBoolean("isRepeatable"),
    goal = json.optInt("goal"),
    bonusPoints = json.optInt("bonusPoints"),
    sortOrder = json.optInt("sortOrder"),
    progress = json.optInt("progress"),
    earnedAt = json.optString("earnedAt").ifBlank { null },
    timesEarned = json.optInt("timesEarned")
)

internal fun parseReward(json: JSONObject): MobileReward {
    val upcomingClaimsJson = json.optJSONArray("upcomingClaims")
    val upcomingClaims = buildList {
        if (upcomingClaimsJson != null) {
            for (i in 0 until upcomingClaimsJson.length()) {
                val c = upcomingClaimsJson.optJSONObject(i) ?: continue
                add(MobileUpcomingClaim(
                    redemptionId = c.optString("redemptionId"),
                    userId = c.optString("userId"),
                    displayName = c.optString("displayName"),
                    targetDate = c.optString("targetDate")
                ))
            }
        }
    }
    return MobileReward(
        id = json.optString("id"),
        catalogKey = json.optString("catalogKey").ifBlank { null },
        isOperatorManaged = json.optBoolean("isOperatorManaged"),
        isEnabled = json.optBoolean("isEnabled"),
        title = json.optString("title"),
        description = json.optString("description").ifBlank { null },
        category = json.optString("category"),
        icon = json.optString("icon").ifBlank { null },
        pointCost = json.optInt("pointCost"),
        maxRedemptionsPerChild = json.optInt("maxRedemptionsPerChild")
            .takeIf { json.has("maxRedemptionsPerChild") && !json.isNull("maxRedemptionsPerChild") },
        cooldownDays = json.optInt("cooldownDays")
            .takeIf { json.has("cooldownDays") && !json.isNull("cooldownDays") },
        eligibility = json.optString("eligibility").ifBlank { "ALL" },
        workflowType = json.optString("workflowType").ifBlank { "STANDARD" },
        upcomingClaims = upcomingClaims
    )
}

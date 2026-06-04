package com.taskbandit.app.mobile

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import org.json.JSONTokener
import java.io.IOException
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

class TaskBanditUnauthorizedException : IllegalStateException()
class TaskBanditApiException(
    val status: Int,
    message: String,
    val code: String? = null
) : IllegalStateException(message)
class TaskBanditTransportException(message: String, cause: Throwable? = null) :
    IllegalStateException(message, cause)

private data class TaskBanditErrorDetails(
    val message: String,
    val code: String? = null
)

class TaskBanditMobileApi {
    private val httpClient = OkHttpClient()
    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()
    private val hostedEnrollmentStartPaths = listOf(
        "/api/public/enrollment/start",
        "/api/public/signup/start"
    )

    fun login(baseUrl: String, email: String, password: String): MobileLoginResult {
        val payload = JSONObject()
            .put("email", email.trim())
            .put("password", password)

        val responseJson = requestJson(
            baseUrl = baseUrl,
            path = "/api/auth/login",
            method = "POST",
            body = payload
        )

        return parseLoginResult(responseJson)
    }

    fun signup(baseUrl: String, request: MobileSignupRequest): MobileLoginResult {
        val payload = JSONObject()
            .put("displayName", request.displayName.trim())
            .put("email", request.email.trim())
            .put("password", request.password)

        val responseJson = requestJson(
            baseUrl = baseUrl,
            path = "/api/auth/signup",
            method = "POST",
            body = payload
        )

        return parseLoginResult(responseJson)
    }

    fun getAuthProviders(baseUrl: String): MobileAuthProviders {
        val responseJson = requestJson(baseUrl, "/api/auth/providers")
        val localJson = responseJson.optJSONObject("local") ?: JSONObject()
        val oidcJson = responseJson.optJSONObject("oidc") ?: JSONObject()

        return MobileAuthProviders(
            local = MobileLocalAuthProvider(
                enabled = localJson.optBoolean("enabled"),
                forcedByConfig = localJson.optBoolean("forcedByConfig"),
                selfSignupEnabled = localJson.optBoolean("selfSignupEnabled")
            ),
            oidc = MobileOidcAuthProvider(
                enabled = oidcJson.optBoolean("enabled"),
                authority = oidcJson.optString("authority"),
                clientId = oidcJson.optString("clientId"),
                source = oidcJson.optString("source")
            )
        )
    }

    fun getPublicEnrollmentSiteConfig(baseUrl: String): MobilePublicEnrollmentSiteConfig? {
        val responseJson = requestOptionalJsonObject(baseUrl, "/api/public/site-config") ?: return null
        val enrollmentJson = responseJson.optJSONObject("enrollment")
            ?: responseJson.optJSONObject("publicEnrollment")
            ?: responseJson
        val enabled = enrollmentJson.optBoolean("enabled") ||
            enrollmentJson.optBoolean("publicEnrollmentEnabled") ||
            enrollmentJson.optBoolean("signupEnabled")
        val hostedSignupUrl = enrollmentJson.optNullableString("hostedSignupUrl")
            ?: enrollmentJson.optNullableString("signupUrl")
            ?: enrollmentJson.optNullableString("registrationUrl")
        val enrollmentStartPath = enrollmentJson.optNullableString("enrollmentStartPath")
            ?: enrollmentJson.optNullableString("enrollmentStartEndpoint")
        val canonicalWebBaseUrl = enrollmentJson.optNullableString("canonicalWebBaseUrl")
            ?: responseJson.optNullableString("canonicalWebBaseUrl")

        return MobilePublicEnrollmentSiteConfig(
            publicEnrollmentEnabled = enabled,
            enrollmentStartPath = enrollmentStartPath,
            hostedSignupUrl = hostedSignupUrl,
            canonicalWebBaseUrl = canonicalWebBaseUrl
        )
    }

    fun startHostedEnrollment(
        baseUrl: String,
        request: MobileSignupRequest,
        languageTag: String? = null,
        siteConfig: MobilePublicEnrollmentSiteConfig? = null
    ): MobileHostedEnrollmentStartResult? {
        val payload = JSONObject()
            .put("displayName", request.displayName.trim())
            .put("email", request.email.trim())
            .put("password", request.password)
            .put("source", "android")
            .put("client", "android-mobile")
        if (!languageTag.isNullOrBlank()) {
            payload.put("language", languageTag)
        }

        val candidatePaths = buildList {
            siteConfig?.enrollmentStartPath?.trim()?.takeIf { it.startsWith("/") }?.let(::add)
            addAll(hostedEnrollmentStartPaths)
        }.distinct()

        for (path in candidatePaths) {
            val responseJson = try {
                requestJson(
                    baseUrl = baseUrl,
                    path = path,
                    method = "POST",
                    body = payload
                )
            } catch (exception: TaskBanditApiException) {
                if (exception.status in setOf(404, 405, 501)) {
                    continue
                }
                throw exception
            }

            val handoffUrl = responseJson.optNullableString("handoffUrl")
                ?: responseJson.optNullableString("nextUrl")
                ?: responseJson.optNullableString("redirectUrl")
                ?: responseJson.optNullableString("checkoutUrl")
            if (!handoffUrl.isNullOrBlank()) {
                return MobileHostedEnrollmentStartResult(
                    handoffUrl = handoffUrl,
                    enrollmentId = responseJson.optNullableString("enrollmentId")
                )
            }
        }

        return null
    }

    fun buildHostedSignupFallbackUrl(
        baseUrl: String,
        email: String? = null,
        displayName: String? = null,
        siteConfig: MobilePublicEnrollmentSiteConfig? = null
    ): String? {
        // Keep `baseUrl` for call-site compatibility, but do not derive a web URL from it.
        // If public site-config is unavailable, fail closed instead of guessing.
        @Suppress("UNUSED_VARIABLE")
        val ignoredBaseUrl = baseUrl

        val configuredUrl = siteConfig?.hostedSignupUrl
            ?.trim()
            ?.takeIf { it.isNotBlank() }
        val canonicalWebBaseUrl = siteConfig?.canonicalWebBaseUrl
            ?.trim()
            ?.takeIf { it.isNotBlank() }
        val signupBaseUrl = when {
            configuredUrl.isNullOrBlank() -> {
                canonicalWebBaseUrl?.trimEnd('/')?.let { "$it/signup" }
            }
            configuredUrl.startsWith("/") && !canonicalWebBaseUrl.isNullOrBlank() -> {
                "${canonicalWebBaseUrl.trimEnd('/')}$configuredUrl"
            }
            else -> configuredUrl
        } ?: return null

        val queryParts = buildList {
            email?.trim()?.takeIf { it.isNotBlank() }?.let {
                add("email=${URLEncoder.encode(it, StandardCharsets.UTF_8)}")
            }
            displayName?.trim()?.takeIf { it.isNotBlank() }?.let {
                add("name=${URLEncoder.encode(it, StandardCharsets.UTF_8)}")
            }
        }
        val joiner = if (signupBaseUrl.contains('?')) "&" else "?"
        return if (queryParts.isEmpty()) signupBaseUrl else "$signupBaseUrl$joiner${queryParts.joinToString("&")}"
    }

    fun resolveTenantInvite(
        controlPlaneBaseUrl: String,
        inviteToken: String,
        expectedTenantSlug: String? = null
    ): MobileResolvedInvite {
        val encodedToken = URLEncoder.encode(inviteToken.trim(), StandardCharsets.UTF_8)
        val encodedTenantSlug = expectedTenantSlug
            ?.trim()
            ?.takeIf { it.isNotBlank() }
            ?.let { URLEncoder.encode(it, StandardCharsets.UTF_8) }
        val tenantSlugQuery = encodedTenantSlug?.let { "&tenantSlug=$it" } ?: ""
        val responseJson = requestJson(
            baseUrl = controlPlaneBaseUrl,
            path = "/api/public/tenant-invites/resolve?token=$encodedToken$tenantSlugQuery"
        )
        return parseResolvedInvite(responseJson)
    }

    fun activateTenantInvite(
        controlPlaneBaseUrl: String,
        inviteToken: String,
        email: String,
        password: String,
        expectedTenantSlug: String? = null,
        displayName: String? = null
    ): MobileResolvedInvite {
        val payload = JSONObject()
            .put("token", inviteToken.trim())
            .put("email", email.trim())
            .put("password", password)
            .put("displayName", displayName?.trim().takeUnless { it.isNullOrBlank() } ?: deriveDisplayNameFromEmail(email))
        expectedTenantSlug
            ?.trim()
            ?.takeIf { it.isNotBlank() }
            ?.let { payload.put("expectedTenantSlug", it) }
        val responseJson = requestJson(
            baseUrl = controlPlaneBaseUrl,
            path = "/api/public/tenant-invites/activate",
            method = "POST",
            body = payload
        )
        return parseResolvedInvite(responseJson)
    }

    fun getOidcStartUrl(baseUrl: String, languageTag: String? = null, returnTo: String? = null): String {
        val normalizedBaseUrl = baseUrl.trim().trimEnd('/')
        val queryParts = buildList {
            if (!languageTag.isNullOrBlank()) {
                add("language=${URLEncoder.encode(languageTag, StandardCharsets.UTF_8)}")
            }
            if (!returnTo.isNullOrBlank()) {
                add("returnTo=${URLEncoder.encode(returnTo, StandardCharsets.UTF_8)}")
            }
        }
        val query = if (queryParts.isEmpty()) "" else "?${queryParts.joinToString("&")}"
        return "$normalizedBaseUrl/api/auth/oidc/start$query"
    }

    fun getReleaseInfo(baseUrl: String): MobileReleaseInfo {
        val releaseJson = requestJson(baseUrl, "/api/meta/release")
        return MobileReleaseInfo(
            releaseVersion = releaseJson.optString("releaseVersion"),
            buildNumber = releaseJson.optString("buildNumber"),
            commitSha = releaseJson.optString("commitSha")
        )
    }

    fun getHostedSubscriptionOverview(baseUrl: String, token: String): MobileHostedSubscriptionOverview {
        val responseJson = requestJson(baseUrl, "/api/settings/subscription", token = token)
        val quotasJson = responseJson.optJSONObject("quotas") ?: JSONObject()
        val usageJson = responseJson.optJSONObject("usage") ?: JSONObject()
        return MobileHostedSubscriptionOverview(
            hostedMode = responseJson.optBoolean("hostedMode"),
            tenantId = responseJson.optNullableString("tenantId"),
            tenantSlug = responseJson.optNullableString("tenantSlug"),
            planCode = responseJson.optNullableString("planCode"),
            packageCode = responseJson.optNullableString("packageCode"),
            packageDisplayName = responseJson.optNullableString("packageDisplayName"),
            lifecycleState = responseJson.optNullableString("lifecycleState"),
            entitlementState = responseJson.optNullableString("entitlementState"),
            billingStatus = responseJson.optNullableString("billingStatus"),
            suspensionReason = responseJson.optNullableString("suspensionReason"),
            trialEndsAt = responseJson.optNullableString("trialEndsAt"),
            graceEndsAt = responseJson.optNullableString("graceEndsAt"),
            quotaPolicyVersion = responseJson.optNullableString("quotaPolicyVersion"),
            configVersion = responseJson.optNullableString("configVersion"),
            updatedAt = responseJson.optNullableString("updatedAt"),
            quotas = MobileHostedQuotas(
                membersLimit = quotasJson.optInt("membersLimit").takeIf { !quotasJson.isNull("membersLimit") },
                storageBytesLimit = quotasJson.optLong("storageBytesLimit").takeIf { !quotasJson.isNull("storageBytesLimit") },
                monthlyNotificationLimit = quotasJson.optInt("monthlyNotificationLimit").takeIf { !quotasJson.isNull("monthlyNotificationLimit") },
                exportRetentionDays = quotasJson.optInt("exportRetentionDays").takeIf { !quotasJson.isNull("exportRetentionDays") },
                proofRetentionDays = quotasJson.optInt("proofRetentionDays").takeIf { !quotasJson.isNull("proofRetentionDays") },
                auditRetentionDays = quotasJson.optInt("auditRetentionDays").takeIf { !quotasJson.isNull("auditRetentionDays") },
                customDomainEnabled = quotasJson.optBoolean("customDomainEnabled").takeIf { !quotasJson.isNull("customDomainEnabled") },
                brandingEnabled = quotasJson.optBoolean("brandingEnabled").takeIf { !quotasJson.isNull("brandingEnabled") }
            ),
            usage = MobileHostedUsage(
                membersUsed = usageJson.optInt("membersUsed").takeIf { !usageJson.isNull("membersUsed") },
                storageBytesUsed = usageJson.optLong("storageBytesUsed").takeIf { !usageJson.isNull("storageBytesUsed") },
                monthlyNotificationsUsed = usageJson.optInt("monthlyNotificationsUsed").takeIf { !usageJson.isNull("monthlyNotificationsUsed") }
            ),
            featureAccess = parseFeatureAccessFromApi(responseJson.optJSONObject("featureAccess")),
            canonicalApiBaseUrl = responseJson.optNullableString("canonicalApiBaseUrl"),
            canonicalWebBaseUrl = responseJson.optNullableString("canonicalWebBaseUrl"),
            betaStatus = responseJson.optJSONObject("betaStatus")?.let { b ->
                MobileBetaStatus(
                    isBeta = b.optBoolean("isBeta", false),
                    endDate = b.optNullableString("endDate"),
                    tenantBetaEndsAt = b.optNullableString("tenantBetaEndsAt")
                )
            }
        )
    }

    fun loadDashboard(baseUrl: String, token: String): MobileDashboard {
        val userJson = requestJson(baseUrl, "/api/auth/me", token = token)
        val summaryJson = requestJson(baseUrl, "/api/dashboard/summary", token = token)
        val choresJson = requestJsonArray(baseUrl, "/api/chores/instances", token = token)
        val (takeoverRequestsJson, takeoverRequestsSupported) = requestOptionalJsonArray(
            baseUrl = baseUrl,
            path = "/api/chores/takeover-requests",
            token = token
        )
        val notificationsJson = requestJsonArray(baseUrl, "/api/dashboard/notifications", token = token)

        val user = MobileUser(
            id = userJson.optString("id"),
            displayName = userJson.optString("displayName"),
            role = userJson.optString("role"),
            points = userJson.optInt("points"),
            currentStreak = userJson.optInt("currentStreak"),
            featureAccess = parseFeatureAccessFromApi(userJson.optJSONObject("featureAccess"))
        )

        val leaderboard = parseJsonArray(summaryJson.optJSONArray("leaderboard"), ::parseLeaderboardEntry)

        val chores = parseJsonArray(choresJson, ::parseChoreFromApi)

        val notifications = parseJsonArray(notificationsJson, ::parseNotification)

        val takeoverRequests = parseJsonArray(takeoverRequestsJson, ::parseTakeoverRequest)

        val templates = if (user.role == "admin" || user.role == "parent") {
            runCatching {
                requestJsonArray(baseUrl, "/api/chores/templates", token = token)
            }.getOrNull()?.let(::parseFullTemplates).orEmpty()
        } else {
            emptyList()
        }

        val householdSettingsJson = if (user.role == "admin" || user.role == "parent") {
            runCatching { requestJson(baseUrl, "/api/settings/household", token = token) }.getOrNull()
        } else {
            null
        }
        val members = householdSettingsJson?.optJSONArray("members")?.let(::parseMembers).orEmpty()
        val householdSettings = householdSettingsJson?.optJSONObject("settings")
        val enableAchievements = householdSettings?.optBoolean("enableAchievements", true) ?: true
        val onboardingCompleted = householdSettings?.optBoolean("onboardingCompleted", true) ?: true
        val onboardingDraft = householdSettings?.optJSONObject("onboardingAnswers")?.let { d ->
            MobileOnboardingAnswers(
                householdType = d.optString("householdType"),
                homeType = d.optString("homeType"),
                cookingStyle = d.optString("cookingStyle"),
                choreSplit = d.optString("choreSplit").ifBlank { "shared_evenly" },
                gamificationStyle = d.optString("gamificationStyle"),
                appliances = parseStringArray(d.optJSONArray("appliances")),
                pets = parseStringArray(d.optJSONArray("pets"))
            )
        }
        val profileSuggestions = buildList {
            val store = householdSettings?.optJSONObject("profileSuggestions")
            val pending = store?.optJSONArray("pending")
            if (pending != null) {
                for (i in 0 until pending.length()) {
                    val s = pending.optJSONObject(i) ?: continue
                    add(MobileProfileSuggestion(
                        id = s.optString("id"),
                        type = s.optString("type"),
                        templateKeys = parseStringArray(s.optJSONArray("templateKeys")),
                        affectedCount = s.optInt("affectedCount")
                    ))
                }
            }
        }
        val leaderboardResetMode = householdSettings?.optString("leaderboardResetMode", "never") ?: "never"
        val lastLeaderboardResetAt = householdSettings?.takeIf { it.has("lastLeaderboardResetAt") && !it.isNull("lastLeaderboardResetAt") }
            ?.optString("lastLeaderboardResetAt")

        val achievementsJson = if (enableAchievements) {
            runCatching { requestJsonArray(baseUrl, "/api/achievements", token = token) }.getOrNull()
        } else {
            null
        }
        val achievements = parseJsonArray(achievementsJson, ::parseAchievement)

        val rewardsJson = runCatching { requestJsonArray(baseUrl, "/api/rewards", token = token) }.getOrNull()
        val redemptionsJson = runCatching { requestJsonArray(baseUrl, "/api/rewards/redemptions", token = token) }.getOrNull()
        val holidayBlocksJson = runCatching { requestJsonArray(baseUrl, "/api/holiday-blocks", token = token) }.getOrNull()

        val rewards = parseJsonArray(rewardsJson, ::parseReward)
        val holidayBlocks = parseJsonArray(holidayBlocksJson, ::parseHolidayBlock)

        val redemptions = buildList {
            val arr = redemptionsJson ?: JSONArray()
            for (index in 0 until arr.length()) {
                val r = arr.optJSONObject(index) ?: continue
                val reward = r.optJSONObject("reward")
                val requestedBy = r.optJSONObject("requestedBy")
                add(MobileRedemption(
                    id = r.optString("id"),
                    rewardId = reward?.optString("id").orEmpty(),
                    rewardTitle = reward?.optString("title").orEmpty(),
                    requestedById = requestedBy?.optString("id").orEmpty(),
                    requestedByName = requestedBy?.optString("displayName").orEmpty(),
                    status = r.optString("status"),
                    requestedAtUtc = r.optString("requestedAtUtc"),
                    resolvedAtUtc = r.optString("resolvedAtUtc").ifBlank { null },
                    adminNote = r.optString("adminNote").ifBlank { null },
                    pointsDeducted = r.optInt("pointsDeducted"),
                    targetDate = r.optString("targetDate").ifBlank { null }
                ))
            }
        }

        return MobileDashboard(
            user = user,
            pendingApprovals = summaryJson.optInt("pendingApprovals"),
            activeChores = summaryJson.optInt("activeChores"),
            streakLeader = summaryJson.optString("streakLeader"),
            leaderboard = leaderboard,
            chores = chores,
            takeoverRequests = takeoverRequests,
            notifications = notifications,
            members = members,
            templates = templates,
            compatibility = MobileDashboardCompatibility(
                takeoverRequestsSupported = takeoverRequestsSupported
            ),
            achievements = achievements,
            enableAchievements = enableAchievements,
            leaderboardResetMode = leaderboardResetMode,
            lastLeaderboardResetAt = lastLeaderboardResetAt,
            rewards = rewards,
            redemptions = redemptions,
            holidayBlocks = holidayBlocks,
            onboardingCompleted = onboardingCompleted,
            onboardingDraft = onboardingDraft,
            profileSuggestions = profileSuggestions
        )
    }

    fun fetchAchievements(baseUrl: String, token: String): List<MobileAchievement> =
        parseJsonArray(requestJsonArray(baseUrl, "/api/achievements", token = token), ::parseAchievement)

    fun quickLog(
        baseUrl: String,
        token: String,
        instanceId: String? = null,
        templateId: String? = null,
        title: String? = null,
        note: String? = null,
        createTemplateFromEntry: Boolean = false,
        difficulty: String = "easy"
    ): MobileChore {
        val payload = JSONObject()
        if (!instanceId.isNullOrBlank()) {
            payload.put("instanceId", instanceId)
        }
        if (!templateId.isNullOrBlank()) {
            payload.put("templateId", templateId)
        }
        if (!title.isNullOrBlank()) {
            payload.put("title", title.trim())
        }
        if (!note.isNullOrBlank()) {
            payload.put("note", note.trim())
        }
        if (createTemplateFromEntry) {
            payload.put("createTemplateFromEntry", true)
        }
        payload.put("difficulty", difficulty.uppercase())

        return parseChoreFromApi(
            requestJson(
                baseUrl = baseUrl,
                path = "/api/chores/quick-log",
                token = token,
                method = "POST",
                body = payload
            )
        )
    }

    fun approveChore(baseUrl: String, token: String, instanceId: String, note: String? = null): MobileChore {
        return reviewChore(baseUrl, token, "/api/chores/instances/$instanceId/approve", note)
    }

    fun rejectChore(baseUrl: String, token: String, instanceId: String, note: String? = null): MobileChore {
        return reviewChore(baseUrl, token, "/api/chores/instances/$instanceId/reject", note)
    }

    fun saveOnboardingDraft(baseUrl: String, token: String, answers: MobileOnboardingAnswers) {
        val appliancesArr = JSONArray().also { arr -> answers.appliances.forEach { arr.put(it) } }
        val petsArr = JSONArray().also { arr -> answers.pets.forEach { arr.put(it) } }
        val childAgesArr = JSONArray().also { arr -> answers.childAges.forEach { arr.put(it) } }
        val draftBody = JSONObject()
        val answersObj = JSONObject()
            .put("householdType", answers.householdType)
            .put("homeType", answers.homeType)
            .put("cookingStyle", answers.cookingStyle)
            .put("choreSplit", answers.choreSplit)
            .put("gamificationStyle", answers.gamificationStyle)
            .put("appliances", appliancesArr)
            .put("pets", petsArr)
            .put("childAges", childAgesArr)
        draftBody.put("answers", answersObj)
        runCatching {
            requestJson(
                baseUrl = baseUrl,
                path = "/api/settings/onboarding/draft",
                token = token,
                method = "PATCH",
                body = draftBody
            )
        }
        // Silently discard errors — draft save is best-effort
    }

    fun submitOnboarding(baseUrl: String, token: String, answers: MobileOnboardingAnswers) {
        val appliancesArr = JSONArray().also { arr -> answers.appliances.forEach { arr.put(it) } }
        val petsArr = JSONArray().also { arr -> answers.pets.forEach { arr.put(it) } }
        val childAgesArr = JSONArray().also { arr -> answers.childAges.forEach { arr.put(it) } }
        val body = JSONObject()
            .put("householdType", answers.householdType)
            .put("homeType", answers.homeType)
            .put("cookingStyle", answers.cookingStyle)
            .put("choreSplit", answers.choreSplit)
            .put("gamificationStyle", answers.gamificationStyle)
            .put("appliances", appliancesArr)
            .put("pets", petsArr)
            .put("childAges", childAgesArr)
        requestJson(
            baseUrl = baseUrl,
            path = "/api/settings/onboarding",
            token = token,
            method = "POST",
            body = body
        )
    }

    fun updateHouseholdProfile(baseUrl: String, token: String, answers: MobileOnboardingAnswers): List<MobileProfileSuggestion> {
        val appliancesArr = JSONArray().also { arr -> answers.appliances.forEach { arr.put(it) } }
        val petsArr = JSONArray().also { arr -> answers.pets.forEach { arr.put(it) } }
        val childAgesArr = JSONArray().also { arr -> answers.childAges.forEach { arr.put(it) } }
        val body = JSONObject()
            .put("householdType", answers.householdType)
            .put("homeType", answers.homeType)
            .put("cookingStyle", answers.cookingStyle)
            .put("choreSplit", answers.choreSplit)
            .put("gamificationStyle", answers.gamificationStyle)
            .put("appliances", appliancesArr)
            .put("pets", petsArr)
            .put("childAges", childAgesArr)
        val result = requestJson(
            baseUrl = baseUrl,
            path = "/api/settings/profile",
            token = token,
            method = "PATCH",
            body = body
        )
        return buildList {
            val arr = result.optJSONArray("suggestions")
            if (arr != null) {
                for (i in 0 until arr.length()) {
                    val s = arr.optJSONObject(i) ?: continue
                    add(MobileProfileSuggestion(
                        id = s.optString("id"),
                        type = s.optString("type"),
                        templateKeys = parseStringArray(s.optJSONArray("templateKeys")),
                        affectedCount = s.optInt("affectedCount")
                    ))
                }
            }
        }
    }

    fun acceptProfileSuggestion(baseUrl: String, token: String, suggestionId: String) {
        requestJson(
            baseUrl = baseUrl,
            path = "/api/settings/profile/suggestions/${java.net.URLEncoder.encode(suggestionId, "UTF-8")}/accept",
            token = token,
            method = "POST",
            body = JSONObject()
        )
    }

    fun dismissProfileSuggestion(baseUrl: String, token: String, suggestionId: String) {
        requestJson(
            baseUrl = baseUrl,
            path = "/api/settings/profile/suggestions/${java.net.URLEncoder.encode(suggestionId, "UTF-8")}",
            token = token,
            method = "DELETE",
            body = null
        )
    }

    fun joinCoComplete(baseUrl: String, token: String, instanceId: String) {
        requestJson(
            baseUrl = baseUrl,
            path = "/api/chores/instances/$instanceId/co-complete",
            token = token,
            method = "POST",
            body = JSONObject()
        )
    }

    fun leaveCoComplete(baseUrl: String, token: String, instanceId: String) {
        requestJson(
            baseUrl = baseUrl,
            path = "/api/chores/instances/$instanceId/co-complete",
            token = token,
            method = "DELETE",
            body = null
        )
    }

    fun markSupervised(baseUrl: String, token: String, instanceId: String, note: String? = null) {
        val body = JSONObject()
        if (note != null) body.put("note", note)
        requestJson(
            baseUrl = baseUrl,
            path = "/api/chores/instances/$instanceId/supervised",
            token = token,
            method = "POST",
            body = body
        )
    }

    fun markNotificationRead(baseUrl: String, token: String, notificationId: String) {
        requestJson(
            baseUrl = baseUrl,
            path = "/api/dashboard/notifications/$notificationId/read",
            token = token,
            method = "POST",
            body = JSONObject()
        )
    }

    fun registerNotificationDevice(
        baseUrl: String,
        token: String,
        registration: MobileNotificationDeviceRegistration
    ) {
        val payload = JSONObject()
            .put("installationId", registration.installationId)
            .put("platform", "android")
            .put("provider", registration.provider)
            .put("pushToken", registration.pushToken ?: "")
            .put("deviceName", registration.deviceName)
            .put("appVersion", registration.appVersion ?: "")
            .put("locale", registration.locale ?: "")
            .put("notificationsEnabled", registration.notificationsEnabled)

        requestJson(
            baseUrl = baseUrl,
            path = "/api/settings/notification-devices/register",
            token = token,
            method = "POST",
            body = payload
        )
    }

    fun startChore(baseUrl: String, token: String, instanceId: String) {
        requestJson(
            baseUrl = baseUrl,
            path = "/api/chores/instances/$instanceId/start",
            token = token,
            method = "POST",
            body = JSONObject()
        )
    }

    fun takeOverChore(baseUrl: String, token: String, instanceId: String) {
        requestJson(
            baseUrl = baseUrl,
            path = "/api/chores/instances/$instanceId/takeover",
            token = token,
            method = "POST",
            body = JSONObject()
        )
    }

    fun closeChoreCycle(baseUrl: String, token: String, instanceId: String) {
        requestJson(
            baseUrl = baseUrl,
            path = "/api/chores/instances/$instanceId/close-cycle",
            token = token,
            method = "POST",
            body = JSONObject()
        )
    }

    fun cancelChore(baseUrl: String, token: String, instanceId: String) {
        requestJson(
            baseUrl = baseUrl,
            path = "/api/chores/instances/$instanceId/cancel",
            token = token,
            method = "POST",
            body = JSONObject()
        )
    }

    fun cancelChoreOccurrence(baseUrl: String, token: String, instanceId: String) {
        requestJson(
            baseUrl = baseUrl,
            path = "/api/chores/instances/$instanceId/cancel-occurrence",
            token = token,
            method = "POST",
            body = JSONObject()
        )
    }

    fun cancelChoreSeries(baseUrl: String, token: String, instanceId: String) {
        requestJson(
            baseUrl = baseUrl,
            path = "/api/chores/instances/$instanceId/cancel-series",
            token = token,
            method = "POST",
            body = JSONObject()
        )
    }

    fun requestTakeover(
        baseUrl: String,
        token: String,
        instanceId: String,
        requestedUserId: String,
        note: String? = null
    ) {
        val body = JSONObject()
            .put("requestedUserId", requestedUserId)
            .put("note", note ?: "")
        requestJson(
            baseUrl = baseUrl,
            path = "/api/chores/instances/$instanceId/takeover-request",
            token = token,
            method = "POST",
            body = body
        )
    }

    fun approveTakeoverRequest(baseUrl: String, token: String, requestId: String, note: String? = null) {
        requestJson(
            baseUrl = baseUrl,
            path = "/api/chores/takeover-requests/$requestId/approve",
            token = token,
            method = "POST",
            body = JSONObject().put("note", note ?: "")
        )
    }

    fun declineTakeoverRequest(baseUrl: String, token: String, requestId: String, note: String? = null) {
        requestJson(
            baseUrl = baseUrl,
            path = "/api/chores/takeover-requests/$requestId/decline",
            token = token,
            method = "POST",
            body = JSONObject().put("note", note ?: "")
        )
    }

    fun getNotificationDevices(baseUrl: String, token: String): List<MobileNotificationDevice> {
        return parseNotificationDevices(
            requestJsonArray(
                baseUrl = baseUrl,
                path = "/api/settings/notification-devices",
                token = token
            )
        )
    }

    fun deleteNotificationDevice(baseUrl: String, token: String, deviceId: String): List<MobileNotificationDevice> {
        return parseNotificationDevices(
            requestJsonArray(
                baseUrl = baseUrl,
                path = "/api/settings/notification-devices/$deviceId",
                token = token,
                method = "DELETE"
            )
        )
    }

    fun createChoreInstance(
        baseUrl: String,
        token: String,
        templateId: String,
        dueAtIsoUtc: String,
        assigneeId: String? = null,
        assignmentStrategy: String? = null,
        recurrenceType: String? = null,
        recurrenceIntervalDays: Int? = null,
        recurrenceWeekdays: List<String> = emptyList(),
        recurrenceEndMode: String? = null,
        recurrenceOccurrences: Int? = null,
        recurrenceEndsAtIsoUtc: String? = null,
        suppressRecurrence: Boolean = false,
        variantId: String? = null
    ) {
        val payload = JSONObject()
            .put("templateId", templateId)
            .put("dueAt", dueAtIsoUtc)
            .put("suppressRecurrence", suppressRecurrence)

        if (!assigneeId.isNullOrBlank()) {
            payload.put("assigneeId", assigneeId)
        }

        if (!assignmentStrategy.isNullOrBlank()) {
            payload.put("assignmentStrategy", assignmentStrategy)
        }

        if (!recurrenceType.isNullOrBlank()) {
            payload.put("recurrenceType", recurrenceType)
        }

        if (recurrenceIntervalDays != null) {
            payload.put("recurrenceIntervalDays", recurrenceIntervalDays)
        }

        if (recurrenceWeekdays.isNotEmpty()) {
            payload.put("recurrenceWeekdays", JSONArray(recurrenceWeekdays))
        }

        if (!recurrenceEndMode.isNullOrBlank()) {
            payload.put("recurrenceEndMode", recurrenceEndMode)
        }

        if (recurrenceOccurrences != null) {
            payload.put("recurrenceOccurrences", recurrenceOccurrences)
        }

        if (!recurrenceEndsAtIsoUtc.isNullOrBlank()) {
            payload.put("recurrenceEndsAt", recurrenceEndsAtIsoUtc)
        }

        if (!variantId.isNullOrBlank()) {
            payload.put("variantId", variantId)
        }

        requestJson(
            baseUrl = baseUrl,
            path = "/api/chores/instances",
            token = token,
            method = "POST",
            body = payload
        )
    }

    fun updateChoreDueAt(
        baseUrl: String,
        token: String,
        chore: MobileChore,
        dueAtIsoUtc: String,
        title: String,
        variantId: String?
    ): MobileChore {
        val payload = JSONObject()
            .put("dueAt", dueAtIsoUtc)

        if (!chore.templateId.isNullOrBlank()) {
            payload.put("templateId", chore.templateId)
        }

        if (!chore.assigneeId.isNullOrBlank()) {
            payload.put("assigneeId", chore.assigneeId)
        }

        if (title.isNotBlank()) {
            payload.put("title", title)
        }

        if (!variantId.isNullOrBlank()) {
            payload.put("variantId", variantId)
        }

        return parseChoreFromApi(
            requestJson(
                baseUrl = baseUrl,
                path = "/api/chores/instances/${chore.id}",
                token = token,
                method = "PUT",
                body = payload
            )
        )
    }

    fun submitChore(
        baseUrl: String,
        token: String,
        instanceId: String,
        completedChecklistItemIds: List<String>,
        attachments: List<MobileUploadedProof> = emptyList(),
        note: String? = null
    ): MobileChore {
        val payload = JSONObject()
            .put("completedChecklistItemIds", JSONArray(completedChecklistItemIds))
            .put(
                "attachments",
                JSONArray().apply {
                    attachments.forEach { attachment ->
                        put(
                            JSONObject()
                                .put("clientFilename", attachment.clientFilename)
                                .put("contentType", attachment.contentType)
                                .put("storageKey", attachment.storageKey)
                        )
                    }
                }
            )
            .put("note", note ?: "")

        return parseChoreFromApi(
            requestJson(
                baseUrl = baseUrl,
                path = "/api/chores/instances/$instanceId/submit",
                token = token,
                method = "POST",
                body = payload
            )
        )
    }

    fun completeExternalChore(
        baseUrl: String,
        token: String,
        instanceId: String,
        externalCompleterName: String,
        completedChecklistItemIds: List<String> = emptyList(),
        note: String? = null
    ): MobileChore {
        val payload = JSONObject()
            .put("externalCompleterName", externalCompleterName)
            .put("completedChecklistItemIds", JSONArray(completedChecklistItemIds))
            .put("attachments", JSONArray())
            .put("note", note ?: "")

        return parseChoreFromApi(
            requestJson(
                baseUrl = baseUrl,
                path = "/api/chores/instances/$instanceId/complete-external",
                token = token,
                method = "POST",
                body = payload
            )
        )
    }

    fun uploadProof(
        baseUrl: String,
        token: String,
        filename: String,
        contentType: String,
        contentBytes: ByteArray
    ): MobileUploadedProof {
        val requestBody = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart(
                "file",
                filename,
                contentBytes.toRequestBody(contentType.toMediaTypeOrNull())
            )
            .build()

        val request = Request.Builder()
            .url("${baseUrl.trim().trimEnd('/')}/api/chores/uploads/proof")
            .header("Accept", "application/json")
            .header("Authorization", "Bearer $token")
            .post(requestBody)
            .build()

        try {
            return httpClient.newCall(request).execute().use { response ->
                val responseText = response.body?.string().orEmpty()
                if (response.isSuccessful) {
                    val parsed = JSONTokener(responseText).nextValue() as? JSONObject
                        ?: throw IllegalStateException("Unexpected upload response shape.")
                    return@use MobileUploadedProof(
                        clientFilename = parsed.optString("clientFilename"),
                        contentType = parsed.optString("contentType"),
                        storageKey = parsed.optString("storageKey"),
                        sizeBytes = parsed.optLong("sizeBytes")
                    )
                }

                if (response.code == 401) {
                    throw TaskBanditUnauthorizedException()
                }

                val errorDetails = readErrorDetails(responseText)
                throw TaskBanditApiException(
                    status = response.code,
                    message = errorDetails.message,
                    code = errorDetails.code
                )
            }
        } catch (exception: IOException) {
            throw TaskBanditTransportException(
                message = "Could not reach the TaskBandit server.",
                cause = exception
            )
        }
    }

    private fun requestOptionalJsonArray(
        baseUrl: String,
        path: String,
        token: String? = null,
        method: String = "GET"
    ): Pair<JSONArray, Boolean> {
        return try {
            requestJsonArray(baseUrl, path, token, method) to true
        } catch (exception: TaskBanditApiException) {
            if (exception.status in setOf(404, 405, 501) || isPackageFeatureDisabled(exception)) {
                JSONArray() to false
            } else {
                throw exception
            }
        }
    }

    private fun requestOptionalJsonObject(
        baseUrl: String,
        path: String,
        token: String? = null,
        method: String = "GET",
        body: JSONObject? = null
    ): JSONObject? {
        return try {
            requestJson(baseUrl, path, token, method, body)
        } catch (exception: TaskBanditApiException) {
            if (exception.status in setOf(404, 405, 501)) {
                null
            } else {
                throw exception
            }
        }
    }

    private fun parseLoginResult(responseJson: JSONObject): MobileLoginResult {
        val tenantContextJson = responseJson.optJSONObject("tenantContext")
        return MobileLoginResult(
            accessToken = responseJson.getString("accessToken"),
            tenantContext = tenantContextJson?.let {
                MobileAuthTenantContext(
                    tenantId = it.optString("tenantId"),
                    tenantSlug = it.optNullableString("tenantSlug"),
                    hostedMode = it.optBoolean("hostedMode"),
                    canonicalApiBaseUrl = it.optNullableString("canonicalApiBaseUrl"),
                    canonicalWebBaseUrl = it.optNullableString("canonicalWebBaseUrl")
                )
            }
        )
    }

    private fun requestJson(
        baseUrl: String,
        path: String,
        token: String? = null,
        method: String = "GET",
        body: JSONObject? = null
    ): JSONObject {
        val responseText = executeRequest(baseUrl, path, token, method, body)
        val parsed = parseJsonValue(responseText)
        return parsed as? JSONObject ?: throw IllegalStateException("Unexpected response shape.")
    }

    private fun requestJsonArray(
        baseUrl: String,
        path: String,
        token: String? = null,
        method: String = "GET"
    ): JSONArray {
        val responseText = executeRequest(baseUrl, path, token, method, null)
        val parsed = parseJsonValue(responseText)
        return parsed as? JSONArray ?: throw IllegalStateException("Unexpected response shape.")
    }

    private fun executeRequest(
        baseUrl: String,
        path: String,
        token: String?,
        method: String,
        body: JSONObject?
    ): String {
        val requestBuilder = Request.Builder()
            .url("${baseUrl.trim().trimEnd('/')}$path")
            .header("Accept", "application/json")

        if (!token.isNullOrBlank()) {
            requestBuilder.header("Authorization", "Bearer $token")
        }

        val requestBody = body?.toString()?.toRequestBody(jsonMediaType)
        when (method) {
            "POST" -> requestBuilder.post(requestBody ?: ByteArray(0).toRequestBody(null))
            "PUT" -> requestBuilder.put(requestBody ?: ByteArray(0).toRequestBody(null))
            "PATCH" -> requestBuilder.patch(requestBody ?: ByteArray(0).toRequestBody(null))
            "DELETE" -> requestBuilder.delete(requestBody ?: ByteArray(0).toRequestBody(null))
            else -> requestBuilder.get()
        }

        try {
            httpClient.newCall(requestBuilder.build()).execute().use { response ->
                val responseText = response.body?.string().orEmpty()
                if (response.isSuccessful) {
                    if (!looksLikeJsonResponse(responseText, response.header("Content-Type"))) {
                        throw TaskBanditApiException(
                            response.code,
                            buildUnexpectedResponseMessage(responseText, response.header("Content-Type"))
                        )
                    }
                    return responseText
                }

                if (response.code == 401) {
                    throw TaskBanditUnauthorizedException()
                }

                val errorDetails = readErrorDetails(responseText, response.header("Content-Type"))
                throw TaskBanditApiException(
                    status = response.code,
                    message = errorDetails.message,
                    code = errorDetails.code
                )
            }
        } catch (exception: IOException) {
            throw TaskBanditTransportException(
                message = "Could not reach the TaskBandit server.",
                cause = exception
            )
        }
    }

    private fun parseJsonValue(responseText: String): Any {
        return runCatching {
            JSONTokener(responseText).nextValue()
        }.getOrElse {
            throw IllegalStateException(buildUnexpectedResponseMessage(responseText, null))
        }
    }

    private fun looksLikeJsonResponse(responseText: String, contentType: String?): Boolean {
        val trimmed = responseText.trimStart()
        val normalizedContentType = contentType.orEmpty().lowercase()
        return normalizedContentType.contains("application/json") ||
            trimmed.startsWith("{") ||
            trimmed.startsWith("[")
    }

    private fun looksLikeHtmlDocument(responseText: String): Boolean {
        val trimmed = responseText.trimStart().lowercase()
        return trimmed.startsWith("<!doctype html") ||
            trimmed.startsWith("<html") ||
            trimmed.startsWith("<head") ||
            trimmed.startsWith("<body")
    }

    private fun buildUnexpectedResponseMessage(responseText: String, contentType: String?): String {
        val normalizedContentType = contentType.orEmpty().lowercase()
        return if (normalizedContentType.contains("text/html") || looksLikeHtmlDocument(responseText)) {
            "TaskBandit received an HTML page instead of an API response. Check that the Android app uses the TaskBandit API URL, not the web UI URL."
        } else {
            "TaskBandit received an unexpected response from the server."
        }
    }

    private fun readErrorDetails(responseText: String, contentType: String? = null): TaskBanditErrorDetails {
        return runCatching {
            when (val parsed = JSONTokener(responseText).nextValue()) {
                is JSONObject -> {
                    val code = parsed.optString("code")
                        .trim()
                        .takeIf { it.isNotBlank() && !it.equals("null", ignoreCase = true) }
                    val message = when {
                        parsed.has("message") -> parsed.get("message").toString()
                        parsed.has("error") -> parsed.get("error").toString()
                        else -> parsed.toString()
                    }
                    TaskBanditErrorDetails(
                        message = message.ifBlank { "Request failed." },
                        code = code
                    )
                }

                else -> if (responseText.isBlank()) {
                    TaskBanditErrorDetails(message = "Request failed.")
                } else {
                    TaskBanditErrorDetails(message = responseText)
                }
            }
        }.getOrElse {
            TaskBanditErrorDetails(message = buildUnexpectedResponseMessage(responseText, contentType))
        }
    }

    private fun isPackageFeatureDisabled(exception: TaskBanditApiException): Boolean {
        return exception.status == 403 && exception.code == "package_feature_disabled"
    }

    private fun reviewChore(
        baseUrl: String,
        token: String,
        path: String,
        note: String?
    ): MobileChore {
        val payload = JSONObject()
            .put("note", note ?: "")

        return parseChoreFromApi(
            requestJson(
                baseUrl = baseUrl,
                path = path,
                token = token,
                method = "POST",
                body = payload
            )
        )
    }

    private fun parseResolvedInvite(responseJson: JSONObject): MobileResolvedInvite {
        val inviteJson = responseJson.optJSONObject("invite")
            ?: throw IllegalStateException("Invite response is missing invite details.")
        val tenantJson = responseJson.optJSONObject("tenantContext")
            ?: throw IllegalStateException("Invite response is missing tenant context.")

        return MobileResolvedInvite(
            inviteToken = inviteJson.optString("inviteToken"),
            inviteType = inviteJson.optString("inviteType"),
            status = inviteJson.optString("status"),
            recipientEmail = inviteJson.optNullableString("recipientEmail"),
            tenantContext = MobileInviteTenantContext(
                tenantId = tenantJson.optString("tenantId"),
                tenantSlug = tenantJson.optString("slug"),
                tenantApiUrl = tenantJson.optString("tenantApiUrl"),
                tenantWebUrl = tenantJson.optString("tenantWebUrl")
            )
        )
    }

    private fun deriveDisplayNameFromEmail(email: String): String {
        val localPart = email.substringBefore("@").trim()
        return localPart
            .split('.', '-', '_')
            .filter { it.isNotBlank() }
            .joinToString(" ") { token ->
                token.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
            }
            .ifBlank { "TaskBandit User" }
    }

    fun redeemReward(baseUrl: String, token: String, rewardId: String, targetDate: String? = null): MobileRedemption {
        val body = JSONObject().apply {
            if (!targetDate.isNullOrBlank()) put("targetDate", targetDate)
        }
        val json = requestJson(baseUrl, "/api/rewards/$rewardId/redeem", token = token, method = "POST", body = body)
        val reward = json.optJSONObject("reward")
        val requestedBy = json.optJSONObject("requestedBy")
        return MobileRedemption(
            id = json.optString("id"),
            rewardId = reward?.optString("id").orEmpty(),
            rewardTitle = reward?.optString("title").orEmpty(),
            requestedById = requestedBy?.optString("id").orEmpty(),
            requestedByName = requestedBy?.optString("displayName").orEmpty(),
            status = json.optString("status"),
            requestedAtUtc = json.optString("requestedAtUtc"),
            resolvedAtUtc = json.optString("resolvedAtUtc").ifBlank { null },
            adminNote = json.optString("adminNote").ifBlank { null },
            pointsDeducted = json.optInt("pointsDeducted"),
            targetDate = json.optString("targetDate").ifBlank { null }
        )
    }

    fun resolveRedemption(baseUrl: String, token: String, redemptionId: String, approved: Boolean, note: String? = null): MobileRedemption {
        val payload = JSONObject().apply {
            put("approved", approved)
            if (!note.isNullOrBlank()) put("note", note.trim())
        }
        val json = requestJson(baseUrl, "/api/rewards/redemptions/$redemptionId/resolve", token = token, method = "POST", body = payload)
        val reward = json.optJSONObject("reward")
        val requestedBy = json.optJSONObject("requestedBy")
        return MobileRedemption(
            id = json.optString("id"),
            rewardId = reward?.optString("id").orEmpty(),
            rewardTitle = reward?.optString("title").orEmpty(),
            requestedById = requestedBy?.optString("id").orEmpty(),
            requestedByName = requestedBy?.optString("displayName").orEmpty(),
            status = json.optString("status"),
            requestedAtUtc = json.optString("requestedAtUtc"),
            resolvedAtUtc = json.optString("resolvedAtUtc").ifBlank { null },
            adminNote = json.optString("adminNote").ifBlank { null },
            pointsDeducted = json.optInt("pointsDeducted"),
            targetDate = json.optString("targetDate").ifBlank { null }
        )
    }

    fun rescheduleRedemption(baseUrl: String, token: String, redemptionId: String, targetDate: String): MobileRedemption {
        val payload = JSONObject().apply { put("targetDate", targetDate) }
        val json = requestJson(baseUrl, "/api/rewards/redemptions/$redemptionId/reschedule", token = token, method = "PATCH", body = payload)
        val reward = json.optJSONObject("reward")
        val requestedBy = json.optJSONObject("requestedBy")
        return MobileRedemption(
            id = json.optString("id"),
            rewardId = reward?.optString("id").orEmpty(),
            rewardTitle = reward?.optString("title").orEmpty(),
            requestedById = requestedBy?.optString("id").orEmpty(),
            requestedByName = requestedBy?.optString("displayName").orEmpty(),
            status = json.optString("status"),
            requestedAtUtc = json.optString("requestedAtUtc"),
            resolvedAtUtc = json.optString("resolvedAtUtc").ifBlank { null },
            adminNote = json.optString("adminNote").ifBlank { null },
            pointsDeducted = json.optInt("pointsDeducted"),
            targetDate = json.optString("targetDate").ifBlank { null }
        )
    }

    fun getChoreTemplates(baseUrl: String, token: String): List<MobileChoreTemplate> {
        val arr = requestJsonArray(baseUrl, "/api/chores/templates", token = token)
        return parseFullTemplates(arr)
    }

    fun createChoreTemplate(baseUrl: String, token: String, input: CreateChoreTemplateInput): MobileChoreTemplate {
        val json = requestJson(baseUrl, "/api/chores/templates", token = token, method = "POST", body = buildTemplatePayload(input))
        return parseFullTemplate(json)
    }

    fun updateChoreTemplate(baseUrl: String, token: String, templateId: String, input: CreateChoreTemplateInput): MobileChoreTemplate {
        val json = requestJson(baseUrl, "/api/chores/templates/$templateId", token = token, method = "PUT", body = buildTemplatePayload(input))
        return parseFullTemplate(json)
    }

    fun deleteChoreTemplate(baseUrl: String, token: String, templateId: String) {
        executeRequest(baseUrl, "/api/chores/templates/$templateId", token, "DELETE", null)
    }

    fun resetTemplatesToDefaults(baseUrl: String, token: String): JSONObject {
        return requestJson(baseUrl, "/api/chores/templates/reset-to-defaults", token = token, method = "POST", body = JSONObject())
    }

    fun createReward(baseUrl: String, token: String, input: CreateRewardInput): MobileReward {
        val json = requestJson(baseUrl, "/api/rewards", token = token, method = "POST", body = buildRewardPayload(
            input.title, input.description, input.category, input.icon,
            input.pointCost, input.maxRedemptionsPerChild, input.cooldownDays,
            input.isEnabled, input.eligibility
        ))
        return parseReward(json)
    }

    fun updateReward(baseUrl: String, token: String, rewardId: String, input: UpdateRewardInput): MobileReward {
        val json = requestJson(baseUrl, "/api/rewards/$rewardId", token = token, method = "PUT", body = buildRewardPayload(
            input.title, input.description, input.category, input.icon,
            input.pointCost, input.maxRedemptionsPerChild, input.cooldownDays,
            true, input.eligibility
        ))
        return parseReward(json)
    }

    fun deleteReward(baseUrl: String, token: String, rewardId: String) {
        executeRequest(baseUrl, "/api/rewards/$rewardId", token, "DELETE", null)
    }

    fun toggleRewardEnabled(baseUrl: String, token: String, rewardId: String): MobileReward {
        val json = requestJson(baseUrl, "/api/rewards/$rewardId/toggle", token = token, method = "PATCH")
        return parseReward(json)
    }

    private fun buildTemplatePayload(input: CreateChoreTemplateInput): JSONObject {
        val payload = JSONObject()
            .put("groupTitle", input.groupTitle)
            .put("title", input.title)
            .put("description", input.description)
            .put("difficulty", input.difficulty)
            .put("assignmentStrategy", input.assignmentStrategy)
            .put("recurrenceType", input.recurrenceType)
            .put("requirePhotoProof", input.requirePhotoProof)
            .put("stickyFollowUpAssignee", input.stickyFollowUpAssignee)
            .put("recurrenceStartStrategy", input.recurrenceStartStrategy)
            .put("defaultLocale", input.defaultLocale)
        input.recurrenceIntervalDays?.let { payload.put("recurrenceIntervalDays", it) }
        if (input.recurrenceWeekdays.isNotEmpty()) {
            payload.put("recurrenceWeekdays", JSONArray(input.recurrenceWeekdays))
        }
        val translationsArr = JSONArray()
        input.translations.forEach { t ->
            translationsArr.put(JSONObject()
                .put("locale", t.locale)
                .also { obj -> t.groupTitle?.let { obj.put("groupTitle", it) } }
                .also { obj -> t.title?.let { obj.put("title", it) } }
                .also { obj -> t.description?.let { obj.put("description", it) } })
        }
        payload.put("translations", translationsArr)
        val checklistArr = JSONArray()
        input.checklist.forEach { item ->
            checklistArr.put(JSONObject().put("title", item.title).put("required", item.required))
        }
        payload.put("checklist", checklistArr)
        val variantsArr = JSONArray()
        input.variants.forEach { v ->
            val vObj = JSONObject().put("label", v.label)
            v.id?.let { vObj.put("id", it) }
            val vtArr = JSONArray()
            v.translations.forEach { vt ->
                vtArr.put(JSONObject().put("locale", vt.locale).also { obj -> vt.label?.let { obj.put("label", it) } })
            }
            vObj.put("translations", vtArr)
            variantsArr.put(vObj)
        }
        payload.put("variants", variantsArr)
        val depsArr = JSONArray()
        input.dependencyRules.forEach { d ->
            depsArr.put(JSONObject().put("templateId", d.templateId).put("delayValue", d.delayValue).put("delayUnit", d.delayUnit))
        }
        payload.put("dependencyRules", depsArr)
        return payload
    }

    private fun buildRewardPayload(
        title: String, description: String?, category: String, icon: String?,
        pointCost: Int, maxRedemptionsPerChild: Int?, cooldownDays: Int?,
        isEnabled: Boolean, eligibility: String
    ): JSONObject {
        val payload = JSONObject()
            .put("title", title)
            .put("category", category)
            .put("pointCost", pointCost)
            .put("isEnabled", isEnabled)
            .put("eligibility", eligibility)
        description?.let { payload.put("description", it) }
        icon?.let { payload.put("icon", it) }
        if (maxRedemptionsPerChild != null) payload.put("maxRedemptionsPerChild", maxRedemptionsPerChild)
        if (cooldownDays != null) payload.put("cooldownDays", cooldownDays)
        return payload
    }

}

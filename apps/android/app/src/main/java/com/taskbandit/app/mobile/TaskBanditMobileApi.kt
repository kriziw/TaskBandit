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
            featureAccess = parseFeatureAccess(responseJson.optJSONObject("featureAccess")),
            canonicalApiBaseUrl = responseJson.optNullableString("canonicalApiBaseUrl"),
            canonicalWebBaseUrl = responseJson.optNullableString("canonicalWebBaseUrl")
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
            featureAccess = parseFeatureAccess(userJson.optJSONObject("featureAccess"))
        )

        val leaderboard = buildList {
            val entries = summaryJson.optJSONArray("leaderboard") ?: JSONArray()
            for (index in 0 until entries.length()) {
                val entry = entries.optJSONObject(index) ?: continue
                add(
                    MobileLeaderboardEntry(
                        displayName = entry.optString("displayName"),
                        role = entry.optString("role"),
                        points = entry.optInt("points"),
                        currentStreak = entry.optInt("currentStreak")
                    )
                )
            }
        }

        val chores = buildList {
            for (index in 0 until choresJson.length()) {
                val entry = choresJson.optJSONObject(index) ?: continue
                add(parseChore(entry))
            }
        }

        val notifications = buildList {
            for (index in 0 until notificationsJson.length()) {
                val entry = notificationsJson.optJSONObject(index) ?: continue
                add(
                    MobileNotification(
                        id = entry.optString("id"),
                        type = entry.optString("type"),
                        title = entry.optString("title"),
                        message = entry.optString("message"),
                        entityType = entry.optString("entityType").ifBlank { null },
                        entityId = entry.optString("entityId").ifBlank { null },
                        isRead = entry.optBoolean("isRead"),
                        createdAt = entry.optString("createdAt")
                    )
                )
            }
        }

        val takeoverRequests = buildList {
            for (index in 0 until takeoverRequestsJson.length()) {
                val entry = takeoverRequestsJson.optJSONObject(index) ?: continue
                val requesterJson = entry.optJSONObject("requester") ?: continue
                val requestedJson = entry.optJSONObject("requested") ?: continue
                add(
                    MobileTakeoverRequest(
                        id = entry.optString("id"),
                        choreId = entry.optString("choreId"),
                        choreTitle = entry.optString("choreTitle"),
                        status = entry.optString("status"),
                        note = entry.optString("note").ifBlank { null },
                        createdAt = entry.optString("createdAt"),
                        respondedAt = entry.optString("respondedAt").ifBlank { null },
                        requester = MobileHouseholdMember(
                            id = requesterJson.optString("id"),
                            displayName = requesterJson.optString("displayName"),
                            role = requesterJson.optString("role")
                        ),
                        requested = MobileHouseholdMember(
                            id = requestedJson.optString("id"),
                            displayName = requestedJson.optString("displayName"),
                            role = requestedJson.optString("role")
                        )
                    )
                )
            }
        }

        val templates = if (user.role == "admin" || user.role == "parent") {
            runCatching {
                requestJsonArray(baseUrl, "/api/chores/templates", token = token)
            }.getOrNull()?.let(::parseTemplates).orEmpty()
        } else {
            emptyList()
        }

        val members = if (user.role == "admin" || user.role == "parent") {
            runCatching {
                requestJson(baseUrl, "/api/settings/household", token = token)
            }.getOrNull()?.optJSONArray("members")?.let(::parseMembers).orEmpty()
        } else {
            emptyList()
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
            )
        )
    }

    fun approveChore(baseUrl: String, token: String, instanceId: String, note: String? = null): MobileChore {
        return reviewChore(baseUrl, token, "/api/chores/instances/$instanceId/approve", note)
    }

    fun rejectChore(baseUrl: String, token: String, instanceId: String, note: String? = null): MobileChore {
        return reviewChore(baseUrl, token, "/api/chores/instances/$instanceId/reject", note)
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

        return parseChore(
            requestJson(
                baseUrl = baseUrl,
                path = "/api/chores/instances/$instanceId/submit",
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

        return parseChore(
            requestJson(
                baseUrl = baseUrl,
                path = path,
                token = token,
                method = "POST",
                body = payload
            )
        )
    }

    private fun parseChecklist(entries: JSONArray?): List<MobileChecklistItem> {
        if (entries == null) {
            return emptyList()
        }

        return buildList {
            for (index in 0 until entries.length()) {
                val item = entries.optJSONObject(index) ?: continue
                add(
                    MobileChecklistItem(
                        id = item.optString("id"),
                        title = item.optString("title"),
                        required = item.optBoolean("required")
                    )
                )
            }
        }
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

    private fun JSONObject.optNullableString(key: String): String? {
        return optString(key)
            .trim()
            .takeIf { it.isNotBlank() && !it.equals("null", ignoreCase = true) }
    }

    private fun parseChore(entry: JSONObject): MobileChore {
        return MobileChore(
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
            checklist = parseChecklist(entry.optJSONArray("checklist")),
            completedChecklistIds = parseStringList(entry.optJSONArray("checklistCompletionIds")),
            variantId = entry.optNullableString("variantId"),
            completionMilestone = parseCompletionMilestone(entry.optJSONObject("completionMilestone"))
        )
    }

    private fun parseCompletionMilestone(entry: JSONObject?): MobileCompletionMilestone? {
        if (entry == null) {
            return null
        }

        val type = entry.optString("type")
        val userId = entry.optString("userId")
        val dayKey = entry.optString("dayKey")
        if (type.isBlank() || userId.isBlank() || dayKey.isBlank()) {
            return null
        }

        return MobileCompletionMilestone(
            type = type,
            userId = userId,
            dayKey = dayKey,
            completedChoreCount = entry.optInt("completedChoreCount"),
            messageIndex = entry.optInt("messageIndex")
        )
    }

    private fun parseStringList(entries: JSONArray?): List<String> {
        if (entries == null) {
            return emptyList()
        }

        return buildList {
            for (index in 0 until entries.length()) {
                val value = entries.optString(index)
                if (value.isNotBlank()) {
                    add(value)
                }
            }
        }
    }

    private fun parseVariants(entries: JSONArray?): List<MobileTemplateVariant> {
        if (entries == null) return emptyList()
        return buildList {
            for (index in 0 until entries.length()) {
                val item = entries.optJSONObject(index) ?: continue
                val id = item.optString("id")
                val label = item.optString("label")
                    .trim()
                    .takeIf { it.isNotBlank() && !it.equals("null", ignoreCase = true) }
                    ?: continue
                if (id.isBlank()) continue
                add(MobileTemplateVariant(id = id, label = label))
            }
        }
    }

    private fun parseTemplates(entries: JSONArray?): List<MobileChoreTemplate> {
        if (entries == null) {
            return emptyList()
        }

        return buildList {
            for (index in 0 until entries.length()) {
                val item = entries.optJSONObject(index) ?: continue
                val id = item.optString("id")
                val title = item.optString("title")
                if (id.isBlank() || title.isBlank()) {
                    continue
                }

                add(
                    MobileChoreTemplate(
                        id = id,
                        groupTitle = item.optString("groupTitle").ifBlank { "General" },
                        title = title,
                        description = item.optString("description"),
                        assignmentStrategy = item.optString("assignmentStrategy").ifBlank { "round_robin" },
                        recurrence = (item.optJSONObject("recurrence") ?: JSONObject()).let { recurrence ->
                            MobileTemplateRecurrence(
                                type = recurrence.optString("type").ifBlank { "none" },
                                intervalDays = recurrence.takeIf { !it.isNull("intervalDays") }?.optInt("intervalDays"),
                                weekdays = parseStringList(recurrence.optJSONArray("weekdays"))
                            )
                        },
                        requirePhotoProof = item.optBoolean("requirePhotoProof"),
                        stickyFollowUpAssignee = item.optBoolean("stickyFollowUpAssignee"),
                        recurrenceStartStrategy = item.optString("recurrenceStartStrategy").ifBlank { "due_at" },
                        variants = parseVariants(item.optJSONArray("variants"))
                    )
                )
            }
        }
    }

    private fun parseFeatureAccess(entry: JSONObject?): MobileFeatureAccess {
        if (entry == null) {
            return MobileFeatureAccess()
        }

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
            deferredFollowUpControl = entry.optBoolean("deferred_follow_up_control", true)
        )
    }

    private fun parseMembers(entries: JSONArray?): List<MobileHouseholdMember> {
        if (entries == null) {
            return emptyList()
        }

        return buildList {
            for (index in 0 until entries.length()) {
                val item = entries.optJSONObject(index) ?: continue
                val id = item.optString("id")
                val displayName = item.optString("displayName")
                if (id.isBlank() || displayName.isBlank()) {
                    continue
                }

                add(
                    MobileHouseholdMember(
                        id = id,
                        displayName = displayName,
                        role = item.optString("role")
                    )
                )
            }
        }
    }

    private fun parseNotificationDevices(entries: JSONArray?): List<MobileNotificationDevice> {
        if (entries == null) {
            return emptyList()
        }

        return buildList {
            for (index in 0 until entries.length()) {
                val item = entries.optJSONObject(index) ?: continue
                add(
                    MobileNotificationDevice(
                        id = item.optString("id"),
                        installationId = item.optString("installationId"),
                        provider = item.optString("provider"),
                        pushTokenConfigured = item.optBoolean("pushTokenConfigured"),
                        deviceName = item.optString("deviceName").ifBlank { null },
                        appVersion = item.optString("appVersion").ifBlank { null },
                        locale = item.optString("locale").ifBlank { null },
                        notificationsEnabled = item.optBoolean("notificationsEnabled"),
                        lastSeenAt = item.optString("lastSeenAt")
                    )
                )
            }
        }
    }
}

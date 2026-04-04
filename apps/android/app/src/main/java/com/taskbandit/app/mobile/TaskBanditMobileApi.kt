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

class TaskBanditUnauthorizedException : IllegalStateException()
class TaskBanditTransportException(message: String, cause: Throwable? = null) :
    IllegalStateException(message, cause)

class TaskBanditMobileApi {
    private val httpClient = OkHttpClient()
    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    fun login(baseUrl: String, email: String, password: String): String {
        val payload = JSONObject()
            .put("email", email.trim())
            .put("password", password)

        return requestJson(
            baseUrl = baseUrl,
            path = "/api/auth/login",
            method = "POST",
            body = payload
        ).getString("accessToken")
    }

    fun loadDashboard(baseUrl: String, token: String): MobileDashboard {
        val userJson = requestJson(baseUrl, "/api/auth/me", token = token)
        val summaryJson = requestJson(baseUrl, "/api/dashboard/summary", token = token)
        val choresJson = requestJsonArray(baseUrl, "/api/chores/instances", token = token)
        val notificationsJson = requestJsonArray(baseUrl, "/api/dashboard/notifications", token = token)

        val user = MobileUser(
            displayName = userJson.optString("displayName"),
            role = userJson.optString("role"),
            points = userJson.optInt("points"),
            currentStreak = userJson.optInt("currentStreak")
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
                add(
                    MobileChore(
                        id = entry.optString("id"),
                        title = entry.optString("title"),
                        state = entry.optString("state"),
                        dueAt = entry.optString("dueAt"),
                        isOverdue = entry.optBoolean("isOverdue"),
                        requirePhotoProof = entry.optBoolean("requirePhotoProof"),
                        checklist = parseChecklist(entry.optJSONArray("checklist")),
                        completedChecklistIds = parseStringList(entry.optJSONArray("checklistCompletionIds"))
                    )
                )
            }
        }

        val notifications = buildList {
            for (index in 0 until notificationsJson.length()) {
                val entry = notificationsJson.optJSONObject(index) ?: continue
                add(
                    MobileNotification(
                        id = entry.optString("id"),
                        title = entry.optString("title"),
                        message = entry.optString("message"),
                        isRead = entry.optBoolean("isRead"),
                        createdAt = entry.optString("createdAt")
                    )
                )
            }
        }

        return MobileDashboard(
            user = user,
            pendingApprovals = summaryJson.optInt("pendingApprovals"),
            activeChores = summaryJson.optInt("activeChores"),
            streakLeader = summaryJson.optString("streakLeader"),
            leaderboard = leaderboard,
            chores = chores,
            notifications = notifications
        )
    }

    fun approveChore(baseUrl: String, token: String, instanceId: String, note: String? = null) {
        reviewChore(baseUrl, token, "/api/chores/instances/$instanceId/approve", note)
    }

    fun rejectChore(baseUrl: String, token: String, instanceId: String, note: String? = null) {
        reviewChore(baseUrl, token, "/api/chores/instances/$instanceId/reject", note)
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

    fun submitChore(
        baseUrl: String,
        token: String,
        instanceId: String,
        completedChecklistItemIds: List<String>,
        attachments: List<MobileUploadedProof> = emptyList(),
        note: String? = null
    ) {
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

        requestJson(
            baseUrl = baseUrl,
            path = "/api/chores/instances/$instanceId/submit",
            token = token,
            method = "POST",
            body = payload
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

                throw IllegalStateException(readErrorMessage(responseText))
            }
        } catch (exception: IOException) {
            throw TaskBanditTransportException(
                message = "Could not reach the TaskBandit server.",
                cause = exception
            )
        }
    }

    private fun requestJson(
        baseUrl: String,
        path: String,
        token: String? = null,
        method: String = "GET",
        body: JSONObject? = null
    ): JSONObject {
        val parsed = JSONTokener(executeRequest(baseUrl, path, token, method, body)).nextValue()
        return parsed as? JSONObject ?: throw IllegalStateException("Unexpected response shape.")
    }

    private fun requestJsonArray(
        baseUrl: String,
        path: String,
        token: String? = null
    ): JSONArray {
        val parsed = JSONTokener(executeRequest(baseUrl, path, token, "GET", null)).nextValue()
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
            else -> requestBuilder.get()
        }

        try {
            httpClient.newCall(requestBuilder.build()).execute().use { response ->
                val responseText = response.body?.string().orEmpty()
                if (response.isSuccessful) {
                    return responseText
                }

                if (response.code == 401) {
                    throw TaskBanditUnauthorizedException()
                }

                throw IllegalStateException(readErrorMessage(responseText))
            }
        } catch (exception: IOException) {
            throw TaskBanditTransportException(
                message = "Could not reach the TaskBandit server.",
                cause = exception
            )
        }
    }

    private fun readErrorMessage(responseText: String): String {
        return runCatching {
            when (val parsed = JSONTokener(responseText).nextValue()) {
                is JSONObject -> when {
                    parsed.has("message") -> parsed.get("message").toString()
                    parsed.has("error") -> parsed.get("error").toString()
                    else -> parsed.toString()
                }
                else -> responseText
            }
        }.getOrDefault(responseText.ifBlank { "Request failed." })
    }

    private fun reviewChore(
        baseUrl: String,
        token: String,
        path: String,
        note: String?
    ) {
        val payload = JSONObject()
            .put("note", note ?: "")

        requestJson(
            baseUrl = baseUrl,
            path = path,
            token = token,
            method = "POST",
            body = payload
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
}

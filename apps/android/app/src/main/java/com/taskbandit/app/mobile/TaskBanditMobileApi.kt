package com.taskbandit.app.mobile

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import org.json.JSONTokener

class TaskBanditUnauthorizedException : IllegalStateException()

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
                        isOverdue = entry.optBoolean("isOverdue")
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
        reviewChore(baseUrl, token, instanceId, "/api/chores/instances/$instanceId/approve", note)
    }

    fun rejectChore(baseUrl: String, token: String, instanceId: String, note: String? = null) {
        reviewChore(baseUrl, token, instanceId, "/api/chores/instances/$instanceId/reject", note)
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
        instanceId: String,
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
}

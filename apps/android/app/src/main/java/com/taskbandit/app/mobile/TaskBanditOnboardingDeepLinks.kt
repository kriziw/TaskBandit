package com.taskbandit.app.mobile

import android.net.Uri

data class MobileOnboardingDeepLink(
    val controlPlaneBaseUrl: String,
    val inviteToken: String,
    val email: String? = null,
    val source: String? = null,
    val tenantApiUrl: String? = null,
    val tenantSlug: String? = null,
    val tenantWebUrl: String? = null
)

object TaskBanditOnboardingDeepLinks {
    fun parse(uri: Uri?): MobileOnboardingDeepLink? {
        if (uri == null) {
            return null
        }

        return when (uri.scheme?.lowercase()) {
            "taskbandit" -> parseCustomScheme(uri)
            "http", "https" -> parseHttpAppLink(uri)
            else -> null
        }
    }

    private fun parseCustomScheme(uri: Uri): MobileOnboardingDeepLink? {
        if (!uri.host.equals("onboarding", ignoreCase = true)) {
            return null
        }

        val inviteToken = queryValue(uri, "invite", "token", "inviteToken") ?: return null
        val controlPlaneBaseUrl = queryValue(uri, "controlPlaneBaseUrl")
            ?: queryValue(uri, "activationUrl")?.let(::extractBaseUrl)
            ?: return null
        return MobileOnboardingDeepLink(
            controlPlaneBaseUrl = controlPlaneBaseUrl.trimEnd('/'),
            inviteToken = inviteToken,
            email = queryValue(uri, "email"),
            source = queryValue(uri, "source"),
            tenantApiUrl = queryValue(uri, "tenantApiUrl"),
            tenantSlug = queryValue(uri, "tenantSlug"),
            tenantWebUrl = queryValue(uri, "tenantWebUrl")
        )
    }

    private fun parseHttpAppLink(uri: Uri): MobileOnboardingDeepLink? {
        val normalizedPath = (uri.path ?: "").trimEnd('/')
        if (normalizedPath != "/activate" && normalizedPath != "/onboarding") {
            return null
        }

        val inviteToken = queryValue(uri, "invite", "token", "inviteToken") ?: return null
        val controlPlaneBaseUrl = "${uri.scheme}://${uri.authority}".trimEnd('/')
        return MobileOnboardingDeepLink(
            controlPlaneBaseUrl = controlPlaneBaseUrl,
            inviteToken = inviteToken,
            email = queryValue(uri, "email"),
            source = queryValue(uri, "source"),
            tenantApiUrl = queryValue(uri, "tenantApiUrl"),
            tenantSlug = queryValue(uri, "tenantSlug"),
            tenantWebUrl = queryValue(uri, "tenantWebUrl")
        )
    }

    private fun queryValue(uri: Uri, vararg keys: String): String? {
        for (key in keys) {
            val value = uri.getQueryParameter(key)
                ?.trim()
                ?.takeIf { it.isNotBlank() }
            if (!value.isNullOrBlank()) {
                return value
            }
        }
        return null
    }

    private fun extractBaseUrl(value: String): String? {
        return runCatching {
            val uri = Uri.parse(value)
            val scheme = uri.scheme ?: return null
            val authority = uri.authority ?: return null
            "$scheme://$authority"
        }.getOrNull()
    }
}

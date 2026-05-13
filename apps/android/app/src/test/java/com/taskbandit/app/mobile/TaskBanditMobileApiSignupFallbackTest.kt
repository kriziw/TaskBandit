package com.taskbandit.app.mobile

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class TaskBanditMobileApiSignupFallbackTest {

    private val api = TaskBanditMobileApi()

    @Test
    fun `returns null when site config is unavailable`() {
        val fallbackUrl = api.buildHostedSignupFallbackUrl(
            baseUrl = "https://api.taskbandit.app",
            email = "user@example.com",
            displayName = "User",
            siteConfig = null
        )

        assertNull(fallbackUrl)
    }

    @Test
    fun `builds fallback from canonical web base url when hosted signup url is absent`() {
        val fallbackUrl = api.buildHostedSignupFallbackUrl(
            baseUrl = "https://api.taskbandit.app",
            email = "user@example.com",
            displayName = "User Name",
            siteConfig = MobilePublicEnrollmentSiteConfig(
                publicEnrollmentEnabled = true,
                canonicalWebBaseUrl = "https://app.taskbandit.app"
            )
        )

        assertEquals(
            "https://app.taskbandit.app/signup?email=user%40example.com&name=User+Name",
            fallbackUrl
        )
    }
}

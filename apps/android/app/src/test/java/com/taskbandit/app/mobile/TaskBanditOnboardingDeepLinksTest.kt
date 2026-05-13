package com.taskbandit.app.mobile

import android.net.Uri
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class TaskBanditOnboardingDeepLinksTest {
    @Test
    fun `parses custom scheme onboarding link`() {
        val link = TaskBanditOnboardingDeepLinks.parse(
            Uri.parse(
                "taskbandit://onboarding?invite=abc123&tenantSlug=river-house&controlPlaneBaseUrl=https%3A%2F%2Fcontrol-plane.taskbandit.app&tenantApiUrl=https%3A%2F%2Fapi.taskbandit.app%2Ft%2Friver-house"
            )
        )

        assertNotNull(link)
        assertEquals("abc123", link?.inviteToken)
        assertEquals("river-house", link?.tenantSlug)
        assertEquals("https://control-plane.taskbandit.app", link?.controlPlaneBaseUrl)
        assertEquals("https://api.taskbandit.app/t/river-house", link?.tenantApiUrl)
    }

    @Test
    fun `parses https activate app link`() {
        val link = TaskBanditOnboardingDeepLinks.parse(
            Uri.parse("https://control-plane.taskbandit.app/activate?invite=invite-token&tenantSlug=river-house")
        )

        assertNotNull(link)
        assertEquals("invite-token", link?.inviteToken)
        assertEquals("river-house", link?.tenantSlug)
        assertEquals("https://control-plane.taskbandit.app", link?.controlPlaneBaseUrl)
    }

    @Test
    fun `returns null for unrelated links`() {
        val link = TaskBanditOnboardingDeepLinks.parse(Uri.parse("https://example.com/welcome"))
        assertNull(link)
    }
}

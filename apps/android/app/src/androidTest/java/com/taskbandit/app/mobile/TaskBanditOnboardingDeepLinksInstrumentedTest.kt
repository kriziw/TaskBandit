package com.taskbandit.app.mobile

import android.net.Uri
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class TaskBanditOnboardingDeepLinksInstrumentedTest {
    @Test
    fun parsesHostedHttpsOnboardingLinkInInstrumentedRuntime() {
        val link = TaskBanditOnboardingDeepLinks.parse(
            Uri.parse("https://my.taskbandit.app/onboarding?invite=xyz-123&tenantSlug=oak-house")
        )

        assertNotNull(link)
        assertEquals("xyz-123", link?.inviteToken)
        assertEquals("oak-house", link?.tenantSlug)
        assertEquals("https://my.taskbandit.app", link?.controlPlaneBaseUrl)
    }
}

package com.taskbandit.app

import com.taskbandit.app.mobile.MobileFeatureAccess
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TemplateCreateCapabilitiesTest {

    @Test
    fun `can open create tab when chores are enabled even if template editing is disabled`() {
        val userFeatures = MobileFeatureAccess(
            choresManage = true,
            templatesManage = false
        )
        val hostedFeatures = MobileFeatureAccess(
            choresManage = true,
            templatesManage = false
        )

        val result = resolveTemplateCreateCapabilities(userFeatures, hostedFeatures)

        assertTrue(result.canOpenCreateTab)
        assertFalse(result.canEditTemplates)
    }

    @Test
    fun `cannot open create tab when chores are disabled across user and hosted features`() {
        val userFeatures = MobileFeatureAccess(
            choresManage = false,
            templatesManage = true
        )
        val hostedFeatures = MobileFeatureAccess(
            choresManage = false,
            templatesManage = true
        )

        val result = resolveTemplateCreateCapabilities(userFeatures, hostedFeatures)

        assertFalse(result.canOpenCreateTab)
        assertTrue(result.canEditTemplates)
    }
}

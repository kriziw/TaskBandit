package com.taskbandit.app.mobile

/**
 * Centralised domain option lists for chore-related fields.
 *
 * All hardcoded value arrays that appear across multiple screens live here.
 * UI screens reference these lists when building dropdowns, so adding a new
 * option only requires updating this file (plus the server enum and i18n strings).
 */
object ChoreConstants {

    /** Assignment strategies available in both the template editor and the chore creation form. */
    val ASSIGNMENT_STRATEGIES = listOf(
        "round_robin",
        "least_completed_recently",
        "highest_streak",
        "fixed_assignee",
    )

    /** Difficulty levels used in the template editor. */
    val DIFFICULTIES = listOf("easy", "medium", "hard")

    /**
     * Recurrence types available in the template editor.
     * Does not include instance-only types (monthly, template).
     */
    val TEMPLATE_RECURRENCE_TYPES = listOf(
        "none",
        "daily",
        "weekly",
        "every_x_days",
        "custom_weekly",
    )

    /**
     * Full recurrence type list for the chore instance creation form.
     * Adds "monthly" and "template" (use the template's own recurrence) on top of
     * the template editor list.
     */
    val INSTANCE_RECURRENCE_TYPES = listOf(
        "none",
        "daily",
        "weekly",
        "custom_weekly",
        "every_x_days",
        "monthly",
        "template",
    )

    /** Supported template translation locales. */
    val TEMPLATE_LOCALES = listOf("en", "de", "hu")

    /** Canonical weekday order used for recurrence weekday pickers and display. */
    val WEEKDAY_ORDER = listOf(
        "SUNDAY",
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
    )
}

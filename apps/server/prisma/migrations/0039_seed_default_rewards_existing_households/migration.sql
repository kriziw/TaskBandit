-- Migration: seed the default reward catalogue for every household that was
-- provisioned before the rewards feature existed (migration 0038).
--
-- Households that already have at least one Reward row are left untouched —
-- they may have customised their catalogue or deliberately enabled/disabled
-- specific items.
--
-- Rewards are seeded as isEnabled = false so existing households get a clean
-- slate to review and enable the rewards they actually want, matching the
-- behaviour of the new-tenant onboarding flow.
--
-- Idempotent: ON CONFLICT ("householdId", "catalogKey") DO NOTHING means
-- running this migration more than once is safe.
--
-- Text is sourced verbatim from starter-rewards.catalog.ts. Apostrophes
-- inside SQL string literals are escaped as '' per SQL standard.
-- Emoji are embedded directly as UTF-8; the file is encoded as UTF-8.

INSERT INTO "Reward" (
    id,
    "householdId",
    "catalogKey",
    "isOperatorManaged",
    "isEnabled",
    "defaultLocale",
    title,
    "titleTranslations",
    description,
    "descriptionTranslations",
    category,
    icon,
    "pointCost",
    "maxRedemptionsPerChild",
    "cooldownDays",
    "createdAtUtc"
)
SELECT
    gen_random_uuid(),
    h.id,
    c.catalog_key,
    false,
    false,
    'en',
    c.title_en,
    c.title_json::jsonb,
    c.description_en,
    c.description_json::jsonb,
    c.category::"RewardCategory",
    c.icon,
    c.point_cost,
    c.max_per_child,
    c.cooldown_days,
    NOW()
FROM "Household" h
CROSS JOIN (VALUES

    -- SCREEN TIME ---------------------------------------------------------------
    (
        'screen_time_30min',
        'Extra Screen Time (+30 min)',
        '{"en":"Extra Screen Time (+30 min)","de":"Zusätzliche Bildschirmzeit (+30 Min.)","hu":"Extra képernyőidő (+30 perc)"}',
        'Get 30 extra minutes of screen time.',
        '{"en":"Get 30 extra minutes of screen time.","de":"30 Minuten zusätzliche Bildschirmzeit.","hu":"30 perc extra képernyőidő."}',
        'SCREEN_TIME', '📱', 50, NULL::integer, NULL::integer
    ),
    (
        'screen_time_1hr',
        'Extra Screen Time (+1 hour)',
        '{"en":"Extra Screen Time (+1 hour)","de":"Zusätzliche Bildschirmzeit (+1 Std.)","hu":"Extra képernyőidő (+1 óra)"}',
        'Get 1 extra hour of screen time.',
        '{"en":"Get 1 extra hour of screen time.","de":"1 Stunde zusätzliche Bildschirmzeit.","hu":"1 óra extra képernyőidő."}',
        'SCREEN_TIME', '📱', 80, NULL::integer, NULL::integer
    ),

    -- TREAT ---------------------------------------------------------------------
    (
        'treat_choice',
        'Treat of Your Choice',
        '{"en":"Treat of Your Choice","de":"Leckerei nach Wahl","hu":"Saját kedvenc édesség"}',
        'Pick any treat or snack.',
        '{"en":"Pick any treat or snack.","de":"Eine beliebige Leckerei oder einen Snack aussuchen.","hu":"Válassz egy kedvenc édességet vagy rágcsálnivalót."}',
        'TREAT', '🍬', 30, NULL::integer, NULL::integer
    ),
    (
        'pick_dinner',
        'Pick Tonight''s Dinner',
        '{"en":"Pick Tonight''s Dinner","de":"Abendessen aussuchen","hu":"Te választod a vacsorát"}',
        'You get to choose what''s for dinner tonight.',
        '{"en":"You get to choose what''s for dinner tonight.","de":"Du darfst heute Abend das Abendessen aussuchen.","hu":"Ma este te döntöd el, mi legyen a vacsora."}',
        'TREAT', '🍽️', 60, NULL::integer, NULL::integer
    ),

    -- ACTIVITY ------------------------------------------------------------------
    (
        'pick_movie',
        'Pick the Movie',
        '{"en":"Pick the Movie","de":"Film aussuchen","hu":"Te választod a filmet"}',
        'Choose the movie for movie night.',
        '{"en":"Choose the movie for movie night.","de":"Den Film für den Filmabend aussuchen.","hu":"Te választod ki a film estére szánt filmet."}',
        'ACTIVITY', '🎬', 40, NULL::integer, NULL::integer
    ),
    (
        'family_activity',
        'Choose the Family Activity',
        '{"en":"Choose the Family Activity","de":"Familienaktivität aussuchen","hu":"Te választod a közös programot"}',
        'Pick what the family does together this weekend.',
        '{"en":"Pick what the family does together this weekend.","de":"Die gemeinsame Familienaktivität fürs Wochenende aussuchen.","hu":"Te döntöd el, mit csináljon a család együtt a hétvégén."}',
        'ACTIVITY', '🎉', 70, NULL::integer, NULL::integer
    ),

    -- PRIVILEGE -----------------------------------------------------------------
    (
        'bedtime_extension',
        'Stay Up 30 Minutes Later',
        '{"en":"Stay Up 30 Minutes Later","de":"30 Minuten länger aufbleiben","hu":"30 perccel tovább maradhatsz ébren"}',
        'Go to bed 30 minutes later than usual.',
        '{"en":"Go to bed 30 minutes later than usual.","de":"30 Minuten länger als gewöhnlich aufbleiben.","hu":"Ma este 30 perccel tovább maradhatsz ébren."}',
        'PRIVILEGE', '🌙', 50, NULL::integer, NULL::integer
    ),
    (
        'skip_a_chore',
        'Skip a Chore (Free Pass)',
        '{"en":"Skip a Chore (Free Pass)","de":"Aufgabe auslassen (Freikarte)","hu":"Feladat kihagyása (szabadjegy)"}',
        'Use this to skip one chore of your choice.',
        '{"en":"Use this to skip one chore of your choice.","de":"Damit kannst du eine Aufgabe deiner Wahl auslassen.","hu":"Ezzel kihagyhatsz egy általad választott feladatot."}',
        'PRIVILEGE', '🎫', 100, 1, 7
    ),

    -- ALLOWANCE -----------------------------------------------------------------
    (
        'pocket_money',
        'Pocket Money Bonus',
        '{"en":"Pocket Money Bonus","de":"Taschengeld-Bonus","hu":"Zsebpénz bónusz"}',
        'Earn a pocket money bonus — amount set by your parent.',
        '{"en":"Earn a pocket money bonus — amount set by your parent.","de":"Einen Taschengeld-Bonus verdienen — Betrag wird von einem Elternteil festgelegt.","hu":"Zsebpénz bónuszt kaphatsz — az összeget a szülő határozza meg."}',
        'ALLOWANCE', '💰', 200, NULL::integer, NULL::integer
    )

) AS c(catalog_key, title_en, title_json, description_en, description_json, category, icon, point_cost, max_per_child, cooldown_days)
WHERE NOT EXISTS (
    SELECT 1 FROM "Reward" r WHERE r."householdId" = h.id
)
ON CONFLICT ("householdId", "catalogKey") DO NOTHING;

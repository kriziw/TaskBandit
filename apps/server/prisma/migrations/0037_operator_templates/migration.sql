-- ── Step 1: Add new columns ──────────────────────────────────────────────────
-- catalogKey links a household template back to its origin in the starter
-- catalog (e.g. "laundry_run_machine" or "op_a3f9c12e4b" for operator templates).
-- isOperatorManaged marks templates pushed from the control plane; these are
-- locked from household editing (403 on update/delete).
ALTER TABLE "ChoreTemplate"
  ADD COLUMN "catalogKey" TEXT,
  ADD COLUMN "isOperatorManaged" BOOLEAN NOT NULL DEFAULT false;

-- ── Step 2: Retroactively assign catalogKey to existing templates ──────────
-- Match on (defaultLocale, title) across the 29 starter-catalog entries and
-- all three supported locales (en / de / hu). Templates that have been renamed
-- by the household admin will not match — they keep catalogKey = NULL, which
-- is valid and harmless.
UPDATE "ChoreTemplate" AS t
SET "catalogKey" = m.catalog_key
FROM (VALUES
  ('laundry_run_machine',             'Run the washing machine',              'Waschmaschine starten',          'Mosógép indítása'),
  ('laundry_hang_clothes',            'Hang the clothes',                     'Wäsche aufhängen',               'Ruha kiterítése'),
  ('laundry_fold_clothes',            'Fold the clothes',                     'Wäsche zusammenlegen',           'Ruha összehajtogatása'),
  ('laundry_put_away',                'Put away the clothes',                 'Wäsche einräumen',               'Ruha eltevése'),
  ('kitchen_evening_cleanup',         'Evening kitchen cleanup',              'Küche abends aufräumen',         'Esti konyhatakarítás'),
  ('kitchen_unload_dishwasher',       'Unload the dishwasher',               'Geschirrspüler ausräumen',       'Mosogatógép kipakolása'),
  ('kitchen_hand_wash_dishes',        'Hand wash the dishes',                 'Geschirr von Hand spülen',       'Kézi mosogatás'),
  ('kitchen_clean_microwave',         'Clean the microwave',                  'Mikrowelle reinigen',            'Mikrohullámú sütő tisztítása'),
  ('kitchen_clean_fridge',            'Clean out the fridge',                 'Kühlschrank reinigen',           'Hűtő tisztítása'),
  ('kitchen_clean_oven',              'Clean the oven',                       'Backofen reinigen',              'Sütő tisztítása'),
  ('cleaning_vacuum_house',           'Vacuum the house',                     'Haus saugen',                    'Porszívózás'),
  ('cleaning_mop_floors',             'Mop the floors',                       'Böden wischen',                  'Padlófelmosás'),
  ('cleaning_dust_surfaces',          'Dust surfaces',                        'Oberflächen abstauben',          'Felületek leporolása'),
  ('cleaning_bathroom',               'Clean the bathroom',                   'Badezimmer reinigen',            'Fürdőszoba takarítás'),
  ('cleaning_toilet',                 'Clean the toilet',                     'WC reinigen',                    'WC takarítása'),
  ('cleaning_windows',                'Clean the windows',                    'Fenster putzen',                 'Ablakok tisztítása'),
  ('cleaning_tidy_living_areas',      'Tidy the living areas',                'Wohnbereiche aufräumen',         'Nappali rendbe rakása'),
  ('waste_take_out_rubbish',          'Take out the rubbish',                 'Müll rausbringen',               'Szemét kivitele'),
  ('waste_take_out_recycling',        'Take out the recycling',               'Recycling rausbringen',          'Újrahasznosítható anyagok kivitele'),
  ('bedroom_make_bed',                'Make the bed',                         'Bett machen',                    'Ágyazás'),
  ('bedroom_strip_sheets',            'Strip the bed sheets',                 'Bettwäsche abziehen',            'Ágynemű lehúzása'),
  ('bedroom_put_on_sheets',           'Put on fresh sheets',                  'Frische Bettwäsche beziehen',    'Friss ágynemű felhúzása'),
  ('bedroom_change_towels',           'Change the towels',                    'Handtücher wechseln',            'Törölközők cseréje'),
  ('plants_water_plants',             'Water the plants',                     'Pflanzen gießen',                'Növények locsolása'),
  ('shopping_grocery_run',            'Grocery shopping',                     'Einkaufen gehen',                'Bevásárlás'),
  ('cooking_prepare_dinner',          'Prepare dinner',                       'Abendessen zubereiten',          'Vacsora elkészítése'),
  ('outdoor_sweep_entrance',          'Sweep the entrance',                   'Eingang fegen',                  'Bejárat söprése'),
  ('outdoor_mow_lawn',                'Mow the lawn',                         'Rasen mähen',                    'Fűnyírás'),
  ('maintenance_check_smoke_alarms',  'Check smoke alarms',                   'Rauchmelder prüfen',             'Füstjelzők ellenőrzése')
) AS m(catalog_key, en_title, de_title, hu_title)
WHERE t."catalogKey" IS NULL
  AND (
    (t."defaultLocale" = 'en' AND t."title" = m.en_title) OR
    (t."defaultLocale" = 'de' AND t."title" = m.de_title) OR
    (t."defaultLocale" = 'hu' AND t."title" = m.hu_title)
  );

-- ── Step 3: Resolve any duplicates before creating the unique index ───────
-- If a household somehow has two templates that both matched the same catalog
-- key (e.g. user duplicated a template without renaming it), keep the older
-- one and NULL out the newer duplicate's catalogKey so the index can be built.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY "householdId", "catalogKey"
           ORDER BY "createdAtUtc"
         ) AS rn
  FROM "ChoreTemplate"
  WHERE "catalogKey" IS NOT NULL
)
UPDATE "ChoreTemplate"
SET "catalogKey" = NULL
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- ── Step 4: Create the unique index ──────────────────────────────────────
-- PostgreSQL treats each NULL as distinct, so multiple templates without a
-- catalogKey in the same household are allowed. Only non-null keys are
-- deduplicated (one catalog entry per household).
CREATE UNIQUE INDEX "ChoreTemplate_householdId_catalogKey_key"
  ON "ChoreTemplate"("householdId", "catalogKey");

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  AssignmentStrategyType,
  Difficulty,
  FollowUpDelayUnit,
  RecurrenceStartStrategy,
  RecurrenceType,
} from '../../generated/prisma/client';
import {
  SupportedLanguage,
  fallbackLanguage,
  supportedLanguages,
} from '../../common/i18n/supported-languages';

type LocalizedText = Record<SupportedLanguage, string>;

type StarterTemplateVariantDefinition = {
  label: LocalizedText;
};

type StarterTemplateChecklistItemDefinition = {
  title: LocalizedText;
  required: boolean;
};

export type StarterTemplateKey = string;

type StarterTemplateFollowUpDefinition = {
  key: StarterTemplateKey;
  delayValue: number;
  delayUnit: FollowUpDelayUnit;
};

export type StarterTemplateDefinition = {
  key: string;
  groupTitle: LocalizedText;
  title: LocalizedText;
  description: LocalizedText;
  difficulty: Difficulty;
  assignmentStrategy: AssignmentStrategyType;
  recurrenceType: RecurrenceType;
  recurrenceIntervalDays?: number;
  recurrenceWeekdays?: string[];
  requirePhotoProof: boolean;
  recurrenceStartStrategy: RecurrenceStartStrategy;
  stickyFollowUpAssignee?: boolean;
  variants?: StarterTemplateVariantDefinition[];
  checklist?: StarterTemplateChecklistItemDefinition[];
  followUps?: StarterTemplateFollowUpDefinition[];
  recommended?: boolean;
};

type StarterCatalog = readonly StarterTemplateDefinition[];

// ── Operator-authored templates ──────────────────────────────────────────────
// Loaded from operator-templates.catalog.json at module init.
// This file is managed by the control plane: operators author templates there
// and raise a PR to add them here. The PR only touches the JSON file, keeping
// diffs readable. An empty array is the safe default.
function loadOperatorTemplateCatalog(): StarterTemplateDefinition[] {
  try {
    // __dirname is always available in CommonJS (the module format NestJS uses)
    const filePath = join(__dirname, 'operator-templates.catalog.json');
    if (!existsSync(filePath)) {
      return [];
    }
    const raw = readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StarterTemplateDefinition[]) : [];
  } catch {
    return [];
  }
}

const operatorTemplateCatalog: readonly StarterTemplateDefinition[] = loadOperatorTemplateCatalog();

export const starterTemplateCatalog: StarterCatalog = [
  // ── LAUNDRY ──────────────────────────────────────────────────────────────
  {
    key: 'laundry_run_machine',
    groupTitle: { en: 'Laundry', de: 'Wäsche', hu: 'Mosás' },
    title: { en: 'Run the washing machine', de: 'Waschmaschine starten', hu: 'Mosógép indítása' },
    description: {
      en: 'Load the machine, add detergent, and start the programme.',
      de: 'Wäsche einladen, Waschmittel hinzufügen und Programm starten.',
      hu: 'Töltsd meg a gépet, adj hozzá mosószert, és indítsd el a programot.',
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.NONE,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.COMPLETED_AT,
    stickyFollowUpAssignee: true,
    variants: [
      { label: { en: 'Whites', de: 'Weißwäsche', hu: 'Fehér ruha' } },
      { label: { en: 'Darks', de: 'Dunkle Wäsche', hu: 'Sötét ruha' } },
      { label: { en: 'Colours', de: 'Buntwäsche', hu: 'Színes ruha' } },
      { label: { en: 'Towels', de: 'Handtücher', hu: 'Törölközők' } },
      { label: { en: 'Bedding', de: 'Bettwäsche', hu: 'Ágynemű' } },
      { label: { en: 'Delicates', de: 'Feinwäsche', hu: 'Kényes anyagok' } },
    ],
    checklist: [
      {
        title: { en: 'Load the machine', de: 'Maschine befüllen', hu: 'Gép megtöltése' },
        required: true,
      },
      {
        title: { en: 'Add detergent', de: 'Waschmittel einfüllen', hu: 'Mosószer hozzáadása' },
        required: true,
      },
      {
        title: { en: 'Start the programme', de: 'Programm starten', hu: 'Program indítása' },
        required: true,
      },
    ],
    followUps: [
      // Only one of these is wired per household — the dependency-creation
      // pass silently skips a target that was not seeded (appliance-aware).
      { key: 'laundry_hang_clothes', delayValue: 2, delayUnit: FollowUpDelayUnit.HOURS },
      { key: 'laundry_run_dryer', delayValue: 1, delayUnit: FollowUpDelayUnit.HOURS },
    ],
  },
  {
    key: 'laundry_run_dryer',
    groupTitle: { en: 'Laundry', de: 'Wäsche', hu: 'Mosás' },
    title: { en: 'Run the tumble dryer', de: 'Wäschetrockner starten', hu: 'Szárítógép indítása' },
    description: {
      en: 'Transfer the washed clothes to the dryer and start the cycle.',
      de: 'Die gewaschene Wäsche in den Trockner legen und das Programm starten.',
      hu: 'Tedd át a mosott ruhákat a szárítóba és indítsd el a programot.',
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.NONE,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.COMPLETED_AT,
    stickyFollowUpAssignee: true,
    variants: [
      { label: { en: 'Whites', de: 'Weißwäsche', hu: 'Fehér ruha' } },
      { label: { en: 'Darks', de: 'Dunkle Wäsche', hu: 'Sötét ruha' } },
      { label: { en: 'Colours', de: 'Buntwäsche', hu: 'Színes ruha' } },
      { label: { en: 'Towels', de: 'Handtücher', hu: 'Törölközők' } },
      { label: { en: 'Bedding', de: 'Bettwäsche', hu: 'Ágynemű' } },
      { label: { en: 'Delicates', de: 'Feinwäsche', hu: 'Kényes anyagok' } },
    ],
    followUps: [
      { key: 'laundry_fold_clothes', delayValue: 1, delayUnit: FollowUpDelayUnit.HOURS },
    ],
  },
  {
    key: 'laundry_hang_clothes',
    groupTitle: { en: 'Laundry', de: 'Wäsche', hu: 'Mosás' },
    title: { en: 'Hang the clothes', de: 'Wäsche aufhängen', hu: 'Ruha kiterítése' },
    description: {
      en: 'Hang the freshly washed clothes to dry.',
      de: 'Die frisch gewaschene Wäsche zum Trocknen aufhängen.',
      hu: 'Terítsd ki a frissen mosott ruhákat száradni.',
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.NONE,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.COMPLETED_AT,
    stickyFollowUpAssignee: true,
    variants: [
      { label: { en: 'Whites', de: 'Weißwäsche', hu: 'Fehér ruha' } },
      { label: { en: 'Darks', de: 'Dunkle Wäsche', hu: 'Sötét ruha' } },
      { label: { en: 'Colours', de: 'Buntwäsche', hu: 'Színes ruha' } },
      { label: { en: 'Towels', de: 'Handtücher', hu: 'Törölközők' } },
      { label: { en: 'Bedding', de: 'Bettwäsche', hu: 'Ágynemű' } },
      { label: { en: 'Delicates', de: 'Feinwäsche', hu: 'Kényes anyagok' } },
    ],
    followUps: [
      { key: 'laundry_fold_clothes', delayValue: 12, delayUnit: FollowUpDelayUnit.HOURS },
    ],
  },
  {
    key: 'laundry_fold_clothes',
    groupTitle: { en: 'Laundry', de: 'Wäsche', hu: 'Mosás' },
    title: { en: 'Fold the clothes', de: 'Wäsche zusammenlegen', hu: 'Ruha összehajtogatása' },
    description: {
      en: 'Fold the dry clothes neatly before putting them away.',
      de: 'Die trockene Wäsche ordentlich zusammenlegen bevor sie weggeräumt wird.',
      hu: 'Hajtogasd össze a száraz ruhákat, mielőtt elteszed.',
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.NONE,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.COMPLETED_AT,
    stickyFollowUpAssignee: true,
    variants: [
      { label: { en: 'Whites', de: 'Weißwäsche', hu: 'Fehér ruha' } },
      { label: { en: 'Darks', de: 'Dunkle Wäsche', hu: 'Sötét ruha' } },
      { label: { en: 'Colours', de: 'Buntwäsche', hu: 'Színes ruha' } },
      { label: { en: 'Towels', de: 'Handtücher', hu: 'Törölközők' } },
      { label: { en: 'Bedding', de: 'Bettwäsche', hu: 'Ágynemű' } },
      { label: { en: 'Delicates', de: 'Feinwäsche', hu: 'Kényes anyagok' } },
    ],
    followUps: [{ key: 'laundry_put_away', delayValue: 4, delayUnit: FollowUpDelayUnit.HOURS }],
  },
  {
    key: 'laundry_put_away',
    groupTitle: { en: 'Laundry', de: 'Wäsche', hu: 'Mosás' },
    title: { en: 'Put away the clothes', de: 'Wäsche einräumen', hu: 'Ruha eltevése' },
    description: {
      en: 'Put the folded clothes back in drawers, shelves, or wardrobes.',
      de: 'Die gefaltete Wäsche in Schubladen, Regale oder Schränke einräumen.',
      hu: 'Tedd el a hajtogatott ruhákat a fiókokba, polcokra vagy szekrénybe.',
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.NONE,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.COMPLETED_AT,
    variants: [
      { label: { en: 'Whites', de: 'Weißwäsche', hu: 'Fehér ruha' } },
      { label: { en: 'Darks', de: 'Dunkle Wäsche', hu: 'Sötét ruha' } },
      { label: { en: 'Colours', de: 'Buntwäsche', hu: 'Színes ruha' } },
      { label: { en: 'Towels', de: 'Handtücher', hu: 'Törölközők' } },
      { label: { en: 'Bedding', de: 'Bettwäsche', hu: 'Ágynemű' } },
      { label: { en: 'Delicates', de: 'Feinwäsche', hu: 'Kényes anyagok' } },
    ],
  },

  // ── KITCHEN ──────────────────────────────────────────────────────────────
  {
    key: 'kitchen_evening_cleanup',
    groupTitle: { en: 'Kitchen', de: 'Küche', hu: 'Konyha' },
    title: {
      en: 'Evening kitchen cleanup',
      de: 'Küche abends aufräumen',
      hu: 'Esti konyhatakarítás',
    },
    description: {
      en: 'Wrap up the kitchen after dinner — deal with the dishes and wipe everything down.',
      de: 'Die Küche nach dem Abendessen aufräumen — Geschirr wegräumen und alles abwischen.',
      hu: 'Vacsora után rendet rakni a konyhában — intézd el az edényeket és töröld le a felületeket.',
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.DAILY,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
    checklist: [
      {
        title: {
          en: 'Load and run the dishwasher',
          de: 'Geschirrspüler befüllen und starten',
          hu: 'Mosogatógép feltöltése és indítása',
        },
        required: false, // optional — non-dishwasher households skip this step
      },
      {
        title: {
          en: 'Wipe the countertops',
          de: 'Arbeitsflächen abwischen',
          hu: 'Pultok letörlése',
        },
        required: true,
      },
      {
        title: { en: 'Wipe the table', de: 'Tisch abwischen', hu: 'Asztal letörlése' },
        required: true,
      },
      {
        title: { en: 'Wipe door handles', de: 'Türgriffe abwischen', hu: 'Kilincsek letörlése' },
        required: false,
      },
    ],
    followUps: [
      { key: 'kitchen_unload_dishwasher', delayValue: 8, delayUnit: FollowUpDelayUnit.HOURS },
    ],
  },
  {
    key: 'kitchen_unload_dishwasher',
    groupTitle: { en: 'Kitchen', de: 'Küche', hu: 'Konyha' },
    title: {
      en: 'Unload the dishwasher',
      de: 'Geschirrspüler ausräumen',
      hu: 'Mosogatógép kipakolása',
    },
    description: {
      en: 'Unload the clean dishes from the dishwasher and put them away.',
      de: 'Das saubere Geschirr aus dem Geschirrspüler ausräumen und wegräumen.',
      hu: 'Pakold ki a mosogatógépből a tiszta edényeket és tedd el őket.',
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.DAILY,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
  },
  {
    key: 'kitchen_hand_wash_dishes',
    groupTitle: { en: 'Kitchen', de: 'Küche', hu: 'Konyha' },
    title: { en: 'Hand wash the dishes', de: 'Geschirr von Hand spülen', hu: 'Kézi mosogatás' },
    description: {
      en: 'Wash dishes, pots, and utensils by hand.',
      de: 'Geschirr, Töpfe und Utensilien von Hand spülen.',
      hu: 'Mosasd el kézzel az edényeket, edényeket és eszközöket.',
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.NONE,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
  },
  {
    key: 'kitchen_clean_microwave',
    groupTitle: { en: 'Kitchen', de: 'Küche', hu: 'Konyha' },
    title: {
      en: 'Clean the microwave',
      de: 'Mikrowelle reinigen',
      hu: 'Mikrohullámú sütő tisztítása',
    },
    description: {
      en: 'Clean the inside and outside of the microwave.',
      de: 'Die Mikrowelle innen und außen reinigen.',
      hu: 'Tisztítsd meg a mikrohullámú sütő belsejét és külsejét.',
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.EVERY_X_DAYS,
    recurrenceIntervalDays: 7,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.COMPLETED_AT,
    checklist: [
      {
        title: {
          en: 'Remove and clean the turntable',
          de: 'Drehteller herausnehmen und reinigen',
          hu: 'Forgótányér kivétele és tisztítása',
        },
        required: true,
      },
      {
        title: { en: 'Wipe the inside', de: 'Innenraum abwischen', hu: 'Belső rész letörlése' },
        required: true,
      },
      {
        title: { en: 'Wipe the outside', de: 'Außenseite abwischen', hu: 'Külső rész letörlése' },
        required: false,
      },
    ],
  },
  {
    key: 'kitchen_clean_fridge',
    groupTitle: { en: 'Kitchen', de: 'Küche', hu: 'Konyha' },
    title: { en: 'Clean out the fridge', de: 'Kühlschrank reinigen', hu: 'Hűtő tisztítása' },
    description: {
      en: 'Discard expired items and wipe down the inside of the fridge.',
      de: 'Abgelaufene Produkte entsorgen und den Kühlschrank innen abwischen.',
      hu: 'Dobd ki a lejárt termékeket és töröld le a hűtő belsejét.',
    },
    difficulty: Difficulty.MEDIUM,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.EVERY_X_DAYS,
    recurrenceIntervalDays: 30,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.COMPLETED_AT,
    checklist: [
      {
        title: {
          en: 'Discard expired items',
          de: 'Abgelaufene Produkte entsorgen',
          hu: 'Lejárt termékek kidobása',
        },
        required: true,
      },
      {
        title: {
          en: 'Wipe shelves and drawers',
          de: 'Regale und Schubladen abwischen',
          hu: 'Polcok és fiókok letörlése',
        },
        required: true,
      },
      {
        title: {
          en: 'Wipe door seals',
          de: 'Türdichtungen abwischen',
          hu: 'Ajtótömítések letörlése',
        },
        required: false,
      },
    ],
  },
  {
    key: 'kitchen_clean_oven',
    groupTitle: { en: 'Kitchen', de: 'Küche', hu: 'Konyha' },
    title: { en: 'Clean the oven', de: 'Backofen reinigen', hu: 'Sütő tisztítása' },
    description: {
      en: 'Clean the inside of the oven, including racks and the door glass.',
      de: 'Den Backofen innen reinigen, einschließlich Roste und Scheibe.',
      hu: 'Tisztítsd meg a sütő belsejét, beleértve a rácsokat és az ajtóüveget.',
    },
    difficulty: Difficulty.MEDIUM,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.EVERY_X_DAYS,
    recurrenceIntervalDays: 28,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.COMPLETED_AT,
  },

  // ── CLEANING ─────────────────────────────────────────────────────────────
  {
    key: 'cleaning_vacuum_house',
    groupTitle: { en: 'Cleaning', de: 'Reinigung', hu: 'Takarítás' },
    title: { en: 'Vacuum the house', de: 'Haus saugen', hu: 'Porszívózás' },
    description: {
      en: 'Vacuum all carpets and hard floors throughout the house.',
      de: 'Alle Teppiche und harten Böden im Haus staubsaugen.',
      hu: 'Porszívózd fel az összes szőnyeget és keménypadlót a házban.',
    },
    difficulty: Difficulty.MEDIUM,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.WEEKLY,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
    stickyFollowUpAssignee: true,
    variants: [
      { label: { en: 'Downstairs', de: 'Erdgeschoss', hu: 'Földszint' } },
      { label: { en: 'Upstairs', de: 'Obergeschoss', hu: 'Emelet' } },
      { label: { en: 'Whole house', de: 'Ganzes Haus', hu: 'Egész ház' } },
    ],
    followUps: [{ key: 'cleaning_mop_floors', delayValue: 1, delayUnit: FollowUpDelayUnit.HOURS }],
  },
  {
    key: 'cleaning_mop_floors',
    groupTitle: { en: 'Cleaning', de: 'Reinigung', hu: 'Takarítás' },
    title: { en: 'Mop the floors', de: 'Böden wischen', hu: 'Padlófelmosás' },
    description: {
      en: 'Mop the hard floors after vacuuming.',
      de: 'Die harten Böden nach dem Staubsaugen wischen.',
      hu: 'Felmosni a keménypadlókat porszívózás után.',
    },
    difficulty: Difficulty.MEDIUM,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.WEEKLY,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
    stickyFollowUpAssignee: true,
    variants: [
      { label: { en: 'Downstairs', de: 'Erdgeschoss', hu: 'Földszint' } },
      { label: { en: 'Upstairs', de: 'Obergeschoss', hu: 'Emelet' } },
      { label: { en: 'Whole house', de: 'Ganzes Haus', hu: 'Egész ház' } },
    ],
  },
  {
    key: 'cleaning_dust_surfaces',
    groupTitle: { en: 'Cleaning', de: 'Reinigung', hu: 'Takarítás' },
    title: { en: 'Dust surfaces', de: 'Oberflächen abstauben', hu: 'Felületek leporolása' },
    description: {
      en: 'Dust shelves, furniture, and other surfaces throughout the house.',
      de: 'Regale, Möbel und andere Oberflächen im Haus abstauben.',
      hu: 'Porold le a polcokat, bútorokat és egyéb felületeket a házban.',
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.WEEKLY,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
  },
  {
    key: 'cleaning_bathroom',
    groupTitle: { en: 'Cleaning', de: 'Reinigung', hu: 'Takarítás' },
    title: { en: 'Clean the bathroom', de: 'Badezimmer reinigen', hu: 'Fürdőszoba takarítás' },
    description: {
      en: 'Give the bathroom a thorough clean — sink, toilet, shower or bath.',
      de: 'Das Badezimmer gründlich reinigen — Waschbecken, Toilette, Dusche oder Badewanne.',
      hu: 'Alaposan takaríts rendet a fürdőszobában — mosdó, WC, zuhany vagy kád.',
    },
    difficulty: Difficulty.MEDIUM,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.WEEKLY,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
    checklist: [
      {
        title: { en: 'Clean the sink', de: 'Waschbecken reinigen', hu: 'Mosdó tisztítása' },
        required: true,
      },
      {
        title: { en: 'Clean the toilet', de: 'Toilette reinigen', hu: 'WC tisztítása' },
        required: true,
      },
      {
        title: {
          en: 'Clean the shower or bath',
          de: 'Dusche oder Badewanne reinigen',
          hu: 'Zuhany vagy kád tisztítása',
        },
        required: true,
      },
      {
        title: { en: 'Wipe the mirror', de: 'Spiegel abwischen', hu: 'Tükör letörlése' },
        required: false,
      },
      {
        title: { en: 'Mop the floor', de: 'Boden wischen', hu: 'Padló felmosása' },
        required: false,
      },
    ],
  },
  {
    key: 'cleaning_toilet',
    groupTitle: { en: 'Cleaning', de: 'Reinigung', hu: 'Takarítás' },
    title: { en: 'Clean the toilet', de: 'WC reinigen', hu: 'WC takarítása' },
    description: {
      en: 'Give the toilet a proper clean — bowl, seat, lid, and rim.',
      de: 'Die Toilette gründlich reinigen — Schüssel, Sitz, Deckel und Rand.',
      hu: 'Alaposan tisztítsd meg a WC-t — csésze, ülőke, fedél és perem.',
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.CUSTOM_WEEKLY,
    recurrenceWeekdays: ['MON', 'THU'],
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
  },
  {
    key: 'cleaning_windows',
    groupTitle: { en: 'Cleaning', de: 'Reinigung', hu: 'Takarítás' },
    title: { en: 'Clean the windows', de: 'Fenster putzen', hu: 'Ablakok tisztítása' },
    description: {
      en: 'Clean the window glass to remove smudges and grime.',
      de: 'Die Fensterscheiben von Schlieren und Schmutz befreien.',
      hu: 'Tisztítsd meg az ablakokat a foltok és szennyeződések eltávolításához.',
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.EVERY_X_DAYS,
    recurrenceIntervalDays: 30,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.COMPLETED_AT,
    variants: [
      { label: { en: 'Inside', de: 'Innen', hu: 'Belülről' } },
      { label: { en: 'Outside', de: 'Außen', hu: 'Kívülről' } },
      { label: { en: 'Both sides', de: 'Beide Seiten', hu: 'Mindkét oldalról' } },
    ],
  },
  {
    key: 'cleaning_tidy_living_areas',
    groupTitle: { en: 'Cleaning', de: 'Reinigung', hu: 'Takarítás' },
    title: {
      en: 'Tidy the living areas',
      de: 'Wohnbereiche aufräumen',
      hu: 'Nappali rendbe rakása',
    },
    description: {
      en: 'Put things back in their place — cushions, remotes, surfaces.',
      de: 'Alles an seinen Platz räumen — Kissen, Fernbedienungen, Oberflächen.',
      hu: 'Tedd vissza a dolgokat a helyükre — párnák, távirányítók, felületek.',
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.DAILY,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
  },

  // ── WASTE & RECYCLING ─────────────────────────────────────────────────────
  {
    key: 'waste_take_out_rubbish',
    groupTitle: {
      en: 'Waste & Recycling',
      de: 'Müll & Recycling',
      hu: 'Hulladék & Újrahasznosítás',
    },
    title: { en: 'Take out the rubbish', de: 'Müll rausbringen', hu: 'Szemét kivitele' },
    description: {
      en: 'Collect the rubbish bags and take them to the outdoor bin.',
      de: 'Die Müllbeutel sammeln und zur Mülltonne bringen.',
      hu: 'Szedd össze a szemétzsákokat és vidd ki a kültéri kukához.',
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.WEEKLY,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
  },
  {
    key: 'waste_take_out_recycling',
    groupTitle: {
      en: 'Waste & Recycling',
      de: 'Müll & Recycling',
      hu: 'Hulladék & Újrahasznosítás',
    },
    title: {
      en: 'Take out the recycling',
      de: 'Recycling rausbringen',
      hu: 'Újrahasznosítható anyagok kivitele',
    },
    description: {
      en: 'Sort and take out the recycling to the correct bins.',
      de: 'Das Recycling sortieren und in die richtigen Behälter bringen.',
      hu: 'Válaszd szét és vidd ki az újrahasznosítható anyagokat a megfelelő tárolókba.',
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.NONE,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.COMPLETED_AT,
    variants: [
      { label: { en: 'Paper', de: 'Papier', hu: 'Papír' } },
      { label: { en: 'Plastic', de: 'Plastik', hu: 'Műanyag' } },
      { label: { en: 'Glass', de: 'Glas', hu: 'Üveg' } },
    ],
  },

  // ── BEDROOM ──────────────────────────────────────────────────────────────
  {
    key: 'bedroom_make_bed',
    groupTitle: { en: 'Bedroom', de: 'Schlafzimmer', hu: 'Hálószoba' },
    title: { en: 'Make the bed', de: 'Bett machen', hu: 'Ágyazás' },
    description: {
      en: 'Straighten the sheets and pillows to make the bed look tidy.',
      de: 'Laken und Kissen glätten, damit das Bett ordentlich aussieht.',
      hu: 'Igazítsd ki a lepedőket és párnákat, hogy az ágy rendezett legyen.',
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.DAILY,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
  },
  {
    key: 'bedroom_strip_sheets',
    groupTitle: { en: 'Bedroom', de: 'Schlafzimmer', hu: 'Hálószoba' },
    title: { en: 'Strip the bed sheets', de: 'Bettwäsche abziehen', hu: 'Ágynemű lehúzása' },
    description: {
      en: 'Remove the used sheets and let the duvet air out.',
      de: 'Die benutzten Laken abziehen und die Bettdecke auslüften lassen.',
      hu: 'Húzd le a használt ágyneműt és szellőztesd ki a paplant.',
    },
    difficulty: Difficulty.MEDIUM,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.EVERY_X_DAYS,
    recurrenceIntervalDays: 14,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.COMPLETED_AT,
    stickyFollowUpAssignee: true,
    followUps: [
      { key: 'bedroom_put_on_sheets', delayValue: 8, delayUnit: FollowUpDelayUnit.HOURS },
    ],
  },
  {
    key: 'bedroom_put_on_sheets',
    groupTitle: { en: 'Bedroom', de: 'Schlafzimmer', hu: 'Hálószoba' },
    title: {
      en: 'Put on fresh sheets',
      de: 'Frische Bettwäsche beziehen',
      hu: 'Friss ágynemű felhúzása',
    },
    description: {
      en: 'Make up the bed with clean sheets and pillowcases.',
      de: 'Das Bett mit frischer Bettwäsche und Kissenbezügen beziehen.',
      hu: 'Húzz fel tiszta lepedőt és párnahuzatot az ágyra.',
    },
    difficulty: Difficulty.MEDIUM,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.NONE,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
  },
  {
    key: 'bedroom_change_towels',
    groupTitle: { en: 'Bedroom', de: 'Schlafzimmer', hu: 'Hálószoba' },
    title: { en: 'Change the towels', de: 'Handtücher wechseln', hu: 'Törölközők cseréje' },
    description: {
      en: 'Swap out bath towels and hand towels for fresh ones.',
      de: 'Bad- und Handtücher durch frische ersetzen.',
      hu: 'Cseréld le a fürdőtörülközőket és kéztörlőket frissekre.',
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.WEEKLY,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
    variants: [
      { label: { en: 'Bath towels', de: 'Badetücher', hu: 'Fürdőtörülközők' } },
      { label: { en: 'Hand towels', de: 'Handtücher', hu: 'Kéztörlők' } },
      { label: { en: 'All towels', de: 'Alle Handtücher', hu: 'Minden törölköző' } },
    ],
  },

  // ── PLANTS ───────────────────────────────────────────────────────────────
  {
    key: 'plants_water_plants',
    groupTitle: { en: 'Plants', de: 'Pflanzen', hu: 'Növények' },
    title: { en: 'Water the plants', de: 'Pflanzen gießen', hu: 'Növények locsolása' },
    description: {
      en: 'Water all indoor plants, checking soil moisture first.',
      de: 'Alle Zimmerpflanzen gießen und vorher die Bodenfeuchte prüfen.',
      hu: 'Öntözd meg az összes szobanövényt, előbb ellenőrizd a talaj nedvességét.',
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.WEEKLY,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.COMPLETED_AT,
    variants: [
      { label: { en: 'Indoor plants', de: 'Zimmerpflanzen', hu: 'Szobanövények' } },
      { label: { en: 'Outdoor plants', de: 'Außenpflanzen', hu: 'Kültéri növények' } },
    ],
  },

  // ── KIDS' ROOM ───────────────────────────────────────────────────────────
  {
    key: 'kids_room_tidy',
    groupTitle: { en: "Kids' Room", de: 'Kinderzimmer', hu: 'Gyerekszoba' },
    title: { en: "Tidy the kids' room", de: 'Kinderzimmer aufräumen', hu: 'Gyerekszoba rendrakása' },
    description: {
      en: 'Put toys away, clear the floor, and straighten up surfaces in the kids\' room.',
      de: 'Spielzeug wegräumen, Boden freiräumen und Oberflächen im Kinderzimmer ordnen.',
      hu: 'Játékokat elrakni, a padlót felszabadítani és a felületeket rendbe tenni a gyerekszobában.',
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.WEEKLY,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
  },
  {
    key: 'kids_room_strip_sheets',
    groupTitle: { en: "Kids' Room", de: 'Kinderzimmer', hu: 'Gyerekszoba' },
    title: {
      en: 'Strip the kids\' bed',
      de: 'Kinderbett abziehen',
      hu: 'Gyerekágy lehúzása',
    },
    description: {
      en: 'Remove the used sheets and pillowcases from the kids\' bed.',
      de: 'Die benutzten Laken und Kissenbezüge vom Kinderbett abziehen.',
      hu: 'Húzd le a használt lepedőt és párnahuzatokat a gyerekágyról.',
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.EVERY_X_DAYS,
    recurrenceIntervalDays: 14,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.COMPLETED_AT,
    stickyFollowUpAssignee: true,
    followUps: [
      { key: 'kids_room_put_on_sheets', delayValue: 4, delayUnit: FollowUpDelayUnit.HOURS },
    ],
  },
  {
    key: 'kids_room_put_on_sheets',
    groupTitle: { en: "Kids' Room", de: 'Kinderzimmer', hu: 'Gyerekszoba' },
    title: {
      en: 'Make up the kids\' bed',
      de: 'Kinderbett beziehen',
      hu: 'Gyerekágy bevetése',
    },
    description: {
      en: 'Put fresh sheets and pillowcases on the kids\' bed.',
      de: 'Frische Laken und Kissenbezüge auf das Kinderbett ziehen.',
      hu: 'Húzz friss lepedőt és párnahuzatokat a gyerekágyra.',
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.NONE,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
  },

  // ── SHOPPING ─────────────────────────────────────────────────────────────
  {
    key: 'shopping_grocery_run',
    groupTitle: { en: 'Shopping', de: 'Einkaufen', hu: 'Bevásárlás' },
    title: { en: 'Grocery shopping', de: 'Einkaufen gehen', hu: 'Bevásárlás' },
    description: {
      en: 'Do the weekly grocery run and stock up on essentials.',
      de: 'Den wöchentlichen Einkauf erledigen und das Nötigste besorgen.',
      hu: 'Végezd el a heti bevásárlást és töltsd fel az alapvető készleteket.',
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.WEEKLY,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
    recommended: true,
  },

  // ── COOKING ──────────────────────────────────────────────────────────────
  {
    key: 'cooking_prepare_dinner',
    groupTitle: { en: 'Cooking', de: 'Kochen', hu: 'Főzés' },
    title: { en: 'Prepare dinner', de: 'Abendessen zubereiten', hu: 'Vacsora elkészítése' },
    description: {
      en: 'Plan and cook the evening meal for the household.',
      de: 'Das Abendessen für den Haushalt planen und kochen.',
      hu: 'Tervezd meg és főzd el az esti ételt a háztartás számára.',
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.DAILY,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
  },

  // ── OUTDOOR ──────────────────────────────────────────────────────────────
  {
    key: 'outdoor_sweep_entrance',
    groupTitle: { en: 'Outdoor', de: 'Außenbereich', hu: 'Kültér' },
    title: { en: 'Sweep the entrance', de: 'Eingang fegen', hu: 'Bejárat söprése' },
    description: {
      en: 'Sweep the doorstep, front path, and entrance area.',
      de: 'Türstufe, Vorweg und Eingangsbereich kehren.',
      hu: 'Söpörj ki a bejárati lépcsőt, járdát és a bejárati területet.',
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.EVERY_X_DAYS,
    recurrenceIntervalDays: 7,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.COMPLETED_AT,
  },
  {
    key: 'outdoor_mow_lawn',
    groupTitle: { en: 'Outdoor', de: 'Außenbereich', hu: 'Kültér' },
    title: { en: 'Mow the lawn', de: 'Rasen mähen', hu: 'Fűnyírás' },
    description: {
      en: 'Mow the grass and collect the clippings.',
      de: 'Den Rasen mähen und das Schnittgut einsammeln.',
      hu: 'Nyírd le a füvet és szedd össze a nyesedéket.',
    },
    difficulty: Difficulty.MEDIUM,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.EVERY_X_DAYS,
    recurrenceIntervalDays: 7,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.COMPLETED_AT,
    recommended: false,
  },

  // ── MAINTENANCE ──────────────────────────────────────────────────────────
  {
    key: 'maintenance_check_smoke_alarms',
    groupTitle: { en: 'Maintenance', de: 'Wartung', hu: 'Karbantartás' },
    title: { en: 'Check smoke alarms', de: 'Rauchmelder prüfen', hu: 'Füstjelzők ellenőrzése' },
    description: {
      en: 'Test each smoke and CO alarm by pressing the test button.',
      de: 'Jeden Rauch- und CO-Melder durch Drücken der Testtaste prüfen.',
      hu: 'Teszteld minden füst- és szén-monoxid érzékelőt a tesztgomb megnyomásával.',
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.EVERY_X_DAYS,
    recurrenceIntervalDays: 30,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.COMPLETED_AT,
  },

  // ── OPERATOR-AUTHORED TEMPLATES ───────────────────────────────────────────
  // These entries are loaded at runtime from operator-templates.catalog.json.
  // Do not edit this spread manually — use the control plane Template Studio.
  ...operatorTemplateCatalog,
];

export type StarterTemplateOption = {
  key: StarterTemplateKey;
  groupTitle: string;
  title: string;
  description: string;
  recommended: boolean;
  followUps: Array<{ key: StarterTemplateKey; title: string }>;
};

function resolveLocalizedText(value: LocalizedText, language: SupportedLanguage) {
  return value[language] || value[fallbackLanguage];
}

export function getStarterTemplateOptionCatalog(
  language: SupportedLanguage,
): StarterTemplateOption[] {
  const titleByKey = new Map<StarterTemplateKey, string>(
    starterTemplateCatalog.map((template) => [
      template.key,
      resolveLocalizedText(template.title, language),
    ]),
  );

  return starterTemplateCatalog.map((template) => ({
    key: template.key,
    groupTitle: resolveLocalizedText(template.groupTitle, language),
    title: resolveLocalizedText(template.title, language),
    description: resolveLocalizedText(template.description, language),
    recommended: template.recommended !== false,
    followUps:
      template.followUps?.map((followUp) => ({
        key: followUp.key,
        title: titleByKey.get(followUp.key) ?? followUp.key,
      })) ?? [],
  }));
}

export function getStarterTemplateDefinitionsByKey(keys?: string[]): StarterTemplateDefinition[] {
  const allowedKeys = new Set(
    keys && keys.length > 0 ? keys : starterTemplateCatalog.map((template) => template.key),
  );
  return starterTemplateCatalog.filter((template) => allowedKeys.has(template.key));
}

/**
 * Returns operator-catalog entries only (keys starting with "op_").
 * Used by the import endpoint to distinguish pushed definitions from
 * core starter templates.
 */
export function getOperatorTemplateDefinitions(): StarterTemplateDefinition[] {
  return [...operatorTemplateCatalog];
}

export function getStarterTemplateTranslations(
  value: LocalizedText,
  defaultLocale: SupportedLanguage,
): Array<{ locale: SupportedLanguage; text: string }> {
  return supportedLanguages
    .filter((locale) => locale !== defaultLocale)
    .map((locale) => ({
      locale,
      text: value[locale],
    }))
    .filter((entry) => entry.text.trim().length > 0);
}

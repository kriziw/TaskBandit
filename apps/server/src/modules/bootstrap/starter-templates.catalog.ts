import {
  AssignmentStrategyType,
  Difficulty,
  FollowUpDelayUnit,
  RecurrenceStartStrategy,
  RecurrenceType
} from "@prisma/client";
import { SupportedLanguage, fallbackLanguage, supportedLanguages } from "../../common/i18n/supported-languages";

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
  variants?: StarterTemplateVariantDefinition[];
  checklist?: StarterTemplateChecklistItemDefinition[];
  followUps?: StarterTemplateFollowUpDefinition[];
  recommended?: boolean;
};

type StarterCatalog = readonly StarterTemplateDefinition[];

export const starterTemplateCatalog: StarterCatalog = [
  {
    key: "laundry_run_machine",
    groupTitle: { en: "Laundry", de: "Wäsche", hu: "Mosás" },
    title: {
      en: "Run the washing machine",
      de: "Waschmaschine starten",
      hu: "Mosógép elindítása"
    },
    description: {
      en: "Start a washing cycle for a selected load of clothes.",
      de: "Starte einen Waschgang für eine ausgewählte Ladung Wäsche.",
      hu: "Indíts el egy mosási ciklust a kiválasztott ruhákhoz."
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.NONE,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
    variants: [
      { label: { en: "White clothes", de: "Weiße Wäsche", hu: "Fehér ruhák" } },
      { label: { en: "Dark clothes", de: "Dunkle Wäsche", hu: "Sötét ruhák" } },
      { label: { en: "Colours", de: "Bunte Wäsche", hu: "Színes ruhák" } },
      { label: { en: "Towels", de: "Handtücher", hu: "Törölközők" } },
      { label: { en: "Bedding", de: "Bettwäsche", hu: "Ágynemű" } },
      { label: { en: "Delicates", de: "Feinwäsche", hu: "Kényes ruhák" } }
    ],
    checklist: [
      {
        title: { en: "Load the machine", de: "Maschine beladen", hu: "Mosógép megtöltése" },
        required: true
      },
      {
        title: { en: "Add detergent", de: "Waschmittel hinzugeben", hu: "Mosószer hozzáadása" },
        required: true
      },
      {
        title: { en: "Start the programme", de: "Programm starten", hu: "Program elindítása" },
        required: true
      }
    ],
    followUps: [{ key: "laundry_hang_clothes", delayValue: 2, delayUnit: FollowUpDelayUnit.HOURS }],
    recommended: true
  },
  {
    key: "laundry_hang_clothes",
    groupTitle: { en: "Laundry", de: "Wäsche", hu: "Mosás" },
    title: { en: "Hang the clothes", de: "Wäsche aufhängen", hu: "Ruhák kiteregetése" },
    description: {
      en: "Hang the washed clothes to dry.",
      de: "Hänge die gewaschene Wäsche zum Trocknen auf.",
      hu: "Teregesd ki a kimosott ruhákat száradni."
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.NONE,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
    variants: [
      { label: { en: "White clothes", de: "Weiße Wäsche", hu: "Fehér ruhák" } },
      { label: { en: "Dark clothes", de: "Dunkle Wäsche", hu: "Sötét ruhák" } },
      { label: { en: "Colours", de: "Bunte Wäsche", hu: "Színes ruhák" } },
      { label: { en: "Towels", de: "Handtücher", hu: "Törölközők" } },
      { label: { en: "Bedding", de: "Bettwäsche", hu: "Ágynemű" } },
      { label: { en: "Delicates", de: "Feinwäsche", hu: "Kényes ruhák" } }
    ],
    followUps: [{ key: "laundry_fold_clothes", delayValue: 12, delayUnit: FollowUpDelayUnit.HOURS }],
    recommended: true
  },
  {
    key: "laundry_fold_clothes",
    groupTitle: { en: "Laundry", de: "Wäsche", hu: "Mosás" },
    title: { en: "Fold the clothes", de: "Wäsche zusammenlegen", hu: "Ruhák összehajtása" },
    description: {
      en: "Fold the dry clothes neatly.",
      de: "Lege die trockene Wäsche ordentlich zusammen.",
      hu: "Hajtsd össze a megszáradt ruhákat."
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.NONE,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
    variants: [
      { label: { en: "White clothes", de: "Weiße Wäsche", hu: "Fehér ruhák" } },
      { label: { en: "Dark clothes", de: "Dunkle Wäsche", hu: "Sötét ruhák" } },
      { label: { en: "Colours", de: "Bunte Wäsche", hu: "Színes ruhák" } },
      { label: { en: "Towels", de: "Handtücher", hu: "Törölközők" } },
      { label: { en: "Bedding", de: "Bettwäsche", hu: "Ágynemű" } },
      { label: { en: "Delicates", de: "Feinwäsche", hu: "Kényes ruhák" } }
    ],
    followUps: [{ key: "laundry_put_away", delayValue: 4, delayUnit: FollowUpDelayUnit.HOURS }],
    recommended: true
  },
  {
    key: "laundry_put_away",
    groupTitle: { en: "Laundry", de: "Wäsche", hu: "Mosás" },
    title: { en: "Put away the clothes", de: "Wäsche einräumen", hu: "Ruhák elpakolása" },
    description: {
      en: "Put the folded clothes back into their place.",
      de: "Räume die gefaltete Wäsche an ihren Platz zurück.",
      hu: "Pakold vissza az összehajtott ruhákat a helyükre."
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.NONE,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
    variants: [
      { label: { en: "White clothes", de: "Weiße Wäsche", hu: "Fehér ruhák" } },
      { label: { en: "Dark clothes", de: "Dunkle Wäsche", hu: "Sötét ruhák" } },
      { label: { en: "Colours", de: "Bunte Wäsche", hu: "Színes ruhák" } },
      { label: { en: "Towels", de: "Handtücher", hu: "Törölközők" } },
      { label: { en: "Bedding", de: "Bettwäsche", hu: "Ágynemű" } },
      { label: { en: "Delicates", de: "Feinwäsche", hu: "Kényes ruhák" } }
    ],
    recommended: true
  },
  {
    key: "kitchen_load_dishwasher",
    groupTitle: { en: "Kitchen", de: "Küche", hu: "Konyha" },
    title: { en: "Load the dishwasher", de: "Spülmaschine einräumen", hu: "Mosogatógép bepakolása" },
    description: {
      en: "Load dirty dishes and get the machine ready to run.",
      de: "Räume schmutziges Geschirr ein und bereite die Maschine vor.",
      hu: "Pakold be a piszkos edényeket, és készítsd elő a gépet."
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.DAILY,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
    recommended: true
  },
  {
    key: "kitchen_unload_dishwasher",
    groupTitle: { en: "Kitchen", de: "Küche", hu: "Konyha" },
    title: { en: "Unload the dishwasher", de: "Spülmaschine ausräumen", hu: "Mosogatógép kipakolása" },
    description: {
      en: "Put clean dishes away after a dishwasher cycle.",
      de: "Räume sauberes Geschirr nach dem Spülgang aus.",
      hu: "Pakold el a tiszta edényeket a mosogatási ciklus után."
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.DAILY,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
    recommended: true
  },
  {
    key: "kitchen_wipe_surfaces",
    groupTitle: { en: "Kitchen", de: "Küche", hu: "Konyha" },
    title: { en: "Wipe kitchen surfaces", de: "Küchenflächen abwischen", hu: "Konyhai felületek letörlése" },
    description: {
      en: "Wipe counters, handles, and the table after meals.",
      de: "Wische Arbeitsflächen, Griffe und Tisch nach dem Essen ab.",
      hu: "Töröld le a pultokat, fogantyúkat és az asztalt étkezés után."
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.DAILY,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
    checklist: [
      {
        title: { en: "Countertops", de: "Arbeitsflächen", hu: "Pultok" },
        required: true
      },
      {
        title: { en: "Table", de: "Tisch", hu: "Asztal" },
        required: true
      },
      {
        title: { en: "Handles", de: "Griffe", hu: "Fogantyúk" },
        required: false
      }
    ],
    recommended: true
  },
  {
    key: "cleaning_vacuum_house",
    groupTitle: { en: "Cleaning", de: "Reinigung", hu: "Takarítás" },
    title: { en: "Vacuum the house", de: "Haus staubsaugen", hu: "Lakás kiporszívózása" },
    description: {
      en: "Vacuum the main living areas.",
      de: "Sauge die wichtigsten Wohnbereiche.",
      hu: "Porszívózd ki a fő lakótereket."
    },
    difficulty: Difficulty.MEDIUM,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.WEEKLY,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
    variants: [
      { label: { en: "Living room", de: "Wohnzimmer", hu: "Nappali" } },
      { label: { en: "Bedrooms", de: "Schlafzimmer", hu: "Hálószobák" } },
      { label: { en: "Whole house", de: "Ganzes Haus", hu: "Egész lakás" } }
    ],
    recommended: true
  },
  {
    key: "cleaning_mop_floors",
    groupTitle: { en: "Cleaning", de: "Reinigung", hu: "Takarítás" },
    title: { en: "Mop the floors", de: "Boden wischen", hu: "Padló felmosása" },
    description: {
      en: "Mop hard floors in the selected area.",
      de: "Wische harte Böden im ausgewählten Bereich.",
      hu: "Mosd fel a kemény padlókat a kiválasztott területen."
    },
    difficulty: Difficulty.MEDIUM,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.WEEKLY,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
    variants: [
      { label: { en: "Kitchen", de: "Küche", hu: "Konyha" } },
      { label: { en: "Bathroom", de: "Badezimmer", hu: "Fürdőszoba" } },
      { label: { en: "Whole house", de: "Ganzes Haus", hu: "Egész lakás" } }
    ],
    recommended: true
  },
  {
    key: "cleaning_dust_surfaces",
    groupTitle: { en: "Cleaning", de: "Reinigung", hu: "Takarítás" },
    title: { en: "Dust surfaces", de: "Flächen entstauben", hu: "Felületek portalanítása" },
    description: {
      en: "Dust shelves, tables, and visible surfaces.",
      de: "Entstaube Regale, Tische und sichtbare Flächen.",
      hu: "Portalanítsd a polcokat, asztalokat és látható felületeket."
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.WEEKLY,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
    recommended: true
  },
  {
    key: "cleaning_bathroom",
    groupTitle: { en: "Cleaning", de: "Reinigung", hu: "Takarítás" },
    title: { en: "Clean the bathroom", de: "Badezimmer reinigen", hu: "Fürdőszoba kitakarítása" },
    description: {
      en: "Clean the main bathroom surfaces and fixtures.",
      de: "Reinige die wichtigsten Badezimmerflächen und Armaturen.",
      hu: "Takarítsd ki a fő fürdőszobai felületeket és szerelvényeket."
    },
    difficulty: Difficulty.MEDIUM,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.WEEKLY,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
    checklist: [
      {
        title: { en: "Sink", de: "Waschbecken", hu: "Mosdó" },
        required: true
      },
      {
        title: { en: "Toilet", de: "Toilette", hu: "WC" },
        required: true
      },
      {
        title: { en: "Mirror", de: "Spiegel", hu: "Tükör" },
        required: false
      }
    ],
    recommended: true
  },
  {
    key: "waste_take_out_rubbish",
    groupTitle: { en: "Waste & Recycling", de: "Müll & Recycling", hu: "Hulladék és szelektív" },
    title: { en: "Take out the rubbish", de: "Müll rausbringen", hu: "Szemét kivitele" },
    description: {
      en: "Take the household rubbish out to the bins.",
      de: "Bringe den Hausmüll zu den Tonnen.",
      hu: "Vidd ki a háztartási szemetet a kukákhoz."
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.NONE,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
    recommended: true
  },
  {
    key: "waste_take_out_recycling",
    groupTitle: { en: "Waste & Recycling", de: "Müll & Recycling", hu: "Hulladék és szelektív" },
    title: { en: "Take out the recycling", de: "Recycling rausbringen", hu: "Szelektív hulladék kivitele" },
    description: {
      en: "Take sorted recycling out to the correct bin.",
      de: "Bringe sortiertes Recycling in die richtige Tonne.",
      hu: "Vidd ki a szelektíven gyűjtött hulladékot a megfelelő kukába."
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.NONE,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
    variants: [
      { label: { en: "Paper", de: "Papier", hu: "Papír" } },
      { label: { en: "Plastic", de: "Plastik", hu: "Műanyag" } },
      { label: { en: "Glass", de: "Glas", hu: "Üveg" } }
    ],
    recommended: true
  },
  {
    key: "bedroom_make_bed",
    groupTitle: { en: "Bedroom", de: "Schlafzimmer", hu: "Hálószoba" },
    title: { en: "Make the bed", de: "Bett machen", hu: "Ágy beágyazása" },
    description: {
      en: "Straighten the bedding and make the bed look tidy.",
      de: "Richte die Bettwäsche und mache das Bett ordentlich.",
      hu: "Igazítsd meg az ágyneműt, és ágyazz be szépen."
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.DAILY,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
    recommended: true
  },
  {
    key: "bedroom_change_sheets",
    groupTitle: { en: "Bedroom", de: "Schlafzimmer", hu: "Hálószoba" },
    title: { en: "Change the bed sheets", de: "Bettwäsche wechseln", hu: "Ágynemű cseréje" },
    description: {
      en: "Remove used bedding and put on clean sheets.",
      de: "Ziehe benutzte Bettwäsche ab und frische Bezüge auf.",
      hu: "Húzd le a használt ágyneműt, és tegyél fel tisztát."
    },
    difficulty: Difficulty.MEDIUM,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.WEEKLY,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
    recommended: true
  },
  {
    key: "plants_water_plants",
    groupTitle: { en: "Plants", de: "Pflanzen", hu: "Növények" },
    title: { en: "Water the plants", de: "Pflanzen gießen", hu: "Növények megöntözése" },
    description: {
      en: "Water the plants that are due for care.",
      de: "Gieße die Pflanzen, die heute Pflege brauchen.",
      hu: "Öntözd meg azokat a növényeket, amelyeknek ma gondozásra van szükségük."
    },
    difficulty: Difficulty.EASY,
    assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
    recurrenceType: RecurrenceType.WEEKLY,
    requirePhotoProof: false,
    recurrenceStartStrategy: RecurrenceStartStrategy.DUE_AT,
    variants: [
      { label: { en: "Indoor plants", de: "Zimmerpflanzen", hu: "Szobanövények" } },
      { label: { en: "Balcony plants", de: "Balkonpflanzen", hu: "Erkélynövények" } }
    ],
    recommended: true
  }
] as const;

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

export function getStarterTemplateOptionCatalog(language: SupportedLanguage): StarterTemplateOption[] {
  const titleByKey = new Map<StarterTemplateKey, string>(
    starterTemplateCatalog.map((template) => [template.key, resolveLocalizedText(template.title, language)])
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
        title: titleByKey.get(followUp.key) ?? followUp.key
      })) ?? []
  }));
}

export function getStarterTemplateDefinitionsByKey(keys?: string[]) {
  const allowedKeys = new Set(keys && keys.length > 0 ? keys : starterTemplateCatalog.map((template) => template.key));
  return starterTemplateCatalog.filter((template) => allowedKeys.has(template.key));
}

export function getStarterTemplateTranslations(
  value: LocalizedText,
  defaultLocale: SupportedLanguage
): Array<{ locale: SupportedLanguage; text: string }> {
  return supportedLanguages
    .filter((locale) => locale !== defaultLocale)
    .map((locale) => ({
      locale,
      text: value[locale]
    }))
    .filter((entry) => entry.text.trim().length > 0);
}

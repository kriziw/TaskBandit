import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { RewardCategory, RewardWorkflowType } from '../../generated/prisma/client';
import { SupportedLanguage, fallbackLanguage } from '../../common/i18n/supported-languages';

type LocalizedText = Record<SupportedLanguage, string>;

export type StarterRewardKey = string;

export type StarterRewardDefinition = {
  key: string;
  title: LocalizedText;
  description: LocalizedText;
  category: RewardCategory;
  eligibility?: 'ALL' | 'CHILD_ONLY' | 'ADULT_ONLY';
  icon: string;
  pointCost: number;
  maxRedemptionsPerChild?: number;
  cooldownDays?: number;
  workflowType?: RewardWorkflowType;
};

type StarterRewardCatalog = readonly StarterRewardDefinition[];

// ── Operator-authored rewards ────────────────────────────────────────────────
// Loaded from operator-rewards.catalog.json at module init.
// Operators author rewards in the control-plane Reward Studio and raise a PR
// to include them here. An empty array is the safe default.
function loadOperatorRewardCatalog(): StarterRewardDefinition[] {
  try {
    const filePath = join(__dirname, 'operator-rewards.catalog.json');
    if (!existsSync(filePath)) {
      return [];
    }
    const raw = readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StarterRewardDefinition[]) : [];
  } catch {
    return [];
  }
}

const operatorRewardCatalog: readonly StarterRewardDefinition[] = loadOperatorRewardCatalog();

export const starterRewardCatalog: StarterRewardCatalog = [
  // ── SCREEN TIME ───────────────────────────────────────────────────────────
  {
    key: 'screen_time_30min',
    title: {
      en: 'Extra Screen Time (+30 min)',
      de: 'Zusätzliche Bildschirmzeit (+30 Min.)',
      hu: 'Extra képernyőidő (+30 perc)',
    },
    description: {
      en: 'Get 30 extra minutes of screen time.',
      de: '30 Minuten zusätzliche Bildschirmzeit.',
      hu: '30 perc extra képernyőidő.',
    },
    category: RewardCategory.SCREEN_TIME,
    icon: '📱',
    pointCost: 50,
  },
  {
    key: 'screen_time_1hr',
    title: {
      en: 'Extra Screen Time (+1 hour)',
      de: 'Zusätzliche Bildschirmzeit (+1 Std.)',
      hu: 'Extra képernyőidő (+1 óra)',
    },
    description: {
      en: 'Get 1 extra hour of screen time.',
      de: '1 Stunde zusätzliche Bildschirmzeit.',
      hu: '1 óra extra képernyőidő.',
    },
    category: RewardCategory.SCREEN_TIME,
    icon: '📱',
    pointCost: 80,
  },
  // ── TREAT ──────────────────────────────────────────────────────────────────
  {
    key: 'treat_choice',
    title: { en: 'Treat of Your Choice', de: 'Leckerei nach Wahl', hu: 'Saját kedvenc édesség' },
    description: {
      en: 'Pick any treat or snack.',
      de: 'Eine beliebige Leckerei oder einen Snack aussuchen.',
      hu: 'Válassz egy kedvenc édességet vagy rágcsálnivalót.',
    },
    category: RewardCategory.TREAT,
    icon: '🍬',
    pointCost: 30,
  },
  {
    key: 'pick_dinner',
    title: {
      en: "Pick Tonight's Dinner",
      de: 'Abendessen aussuchen',
      hu: 'Te választod a vacsorát',
    },
    description: {
      en: "You get to choose what's for dinner tonight.",
      de: 'Du darfst heute Abend das Abendessen aussuchen.',
      hu: 'Ma este te döntöd el, mi legyen a vacsora.',
    },
    category: RewardCategory.TREAT,
    icon: '🍽️',
    pointCost: 60,
    workflowType: RewardWorkflowType.DAILY_EXCLUSIVE,
  },
  // ── ACTIVITY ───────────────────────────────────────────────────────────────
  {
    key: 'pick_movie',
    title: { en: 'Pick the Movie', de: 'Film aussuchen', hu: 'Te választod a filmet' },
    description: {
      en: 'Choose the movie for movie night.',
      de: 'Den Film für den Filmabend aussuchen.',
      hu: 'Te választod ki a film estére szánt filmet.',
    },
    category: RewardCategory.ACTIVITY,
    icon: '🎬',
    pointCost: 40,
  },
  {
    key: 'family_activity',
    title: {
      en: 'Choose the Family Activity',
      de: 'Familienaktivität aussuchen',
      hu: 'Te választod a közös programot',
    },
    description: {
      en: 'Pick what the family does together this weekend.',
      de: 'Die gemeinsame Familienaktivität fürs Wochenende aussuchen.',
      hu: 'Te döntöd el, mit csináljon a család együtt a hétvégén.',
    },
    category: RewardCategory.ACTIVITY,
    icon: '🎉',
    pointCost: 70,
  },
  // ── PRIVILEGE ──────────────────────────────────────────────────────────────
  {
    key: 'bedtime_extension',
    title: {
      en: 'Stay Up 30 Minutes Later',
      de: '30 Minuten länger aufbleiben',
      hu: '30 perccel tovább maradhatsz ébren',
    },
    description: {
      en: 'Go to bed 30 minutes later than usual.',
      de: '30 Minuten länger als gewöhnlich aufbleiben.',
      hu: 'Ma este 30 perccel tovább maradhatsz ébren.',
    },
    category: RewardCategory.PRIVILEGE,
    icon: '🌙',
    pointCost: 50,
  },
  {
    key: 'skip_a_chore',
    title: {
      en: 'Skip a Chore (Free Pass)',
      de: 'Aufgabe auslassen (Freikarte)',
      hu: 'Feladat kihagyása (szabadjegy)',
    },
    description: {
      en: 'Use this to skip one chore of your choice.',
      de: 'Damit kannst du eine Aufgabe deiner Wahl auslassen.',
      hu: 'Ezzel kihagyhatsz egy általad választott feladatot.',
    },
    category: RewardCategory.PRIVILEGE,
    icon: '🎫',
    pointCost: 100,
    maxRedemptionsPerChild: 1,
    cooldownDays: 7,
  },
  // ── ALLOWANCE ──────────────────────────────────────────────────────────────
  {
    key: 'pocket_money',
    title: { en: 'Pocket Money Bonus', de: 'Taschengeld-Bonus', hu: 'Zsebpénz bónusz' },
    description: {
      en: 'Earn a pocket money bonus — amount set by your parent.',
      de: 'Einen Taschengeld-Bonus verdienen — Betrag wird von einem Elternteil festgelegt.',
      hu: 'Zsebpénz bónuszt kaphatsz — az összeget a szülő határozza meg.',
    },
    category: RewardCategory.ALLOWANCE,
    icon: '💰',
    pointCost: 200,
  },
  // ── TREAT (new) ────────────────────────────────────────────────────────────
  {
    key: 'order_takeout',
    title: {
      en: 'Vote for Takeout Tonight',
      de: 'Heute Abend Essen bestellen',
      hu: 'Szavazz a mai esti rendelésért',
    },
    description: {
      en: 'Claim your vote to order takeout tonight — first claim wins!',
      de: 'Heute Abend Essen bestellen – wer zuerst kommt, malt zuerst!',
      hu: 'Aki elsőként foglalja le, az dönti el, mit rendelünk ma este.',
    },
    category: RewardCategory.TREAT,
    icon: '🥡',
    pointCost: 80,
    workflowType: RewardWorkflowType.DAILY_EXCLUSIVE,
  },
  {
    key: 'ice_cream_trip',
    title: {
      en: 'Family Ice Cream Trip',
      de: 'Familienausflug zum Eiscafé',
      hu: 'Fagylalt kirándulás a családdal',
    },
    description: {
      en: 'Treat the whole family to an ice cream outing!',
      de: 'Die ganze Familie geht Eis essen!',
      hu: 'Kirándulj el a családdal egy fagylaltozóba!',
    },
    category: RewardCategory.TREAT,
    icon: '🍦',
    pointCost: 90,
    cooldownDays: 14,
  },
  {
    key: 'dessert_choice',
    title: {
      en: "Pick Tonight's Dessert",
      de: 'Nachtisch aussuchen',
      hu: 'Te választod a desszertet',
    },
    description: {
      en: 'You get to choose what dessert we have tonight.',
      de: 'Du darfst heute Abend den Nachtisch aussuchen.',
      hu: 'Ma este te döntöd el, mi legyen a desszert.',
    },
    category: RewardCategory.TREAT,
    icon: '🍰',
    pointCost: 35,
  },
  {
    key: 'breakfast_in_bed',
    title: {
      en: 'Breakfast in Bed',
      de: 'Frühstück ans Bett',
      hu: 'Reggeli az ágyba',
    },
    description: {
      en: 'Get your breakfast brought to you in bed.',
      de: 'Bekomme heute Morgen dein Frühstück ans Bett gebracht.',
      hu: 'Ma reggel ágyban kapod a reggelidet.',
    },
    category: RewardCategory.TREAT,
    eligibility: 'CHILD_ONLY',
    icon: '🥞',
    pointCost: 80,
    cooldownDays: 30,
  },
  // ── PRIVILEGE (new) ────────────────────────────────────────────────────────
  {
    key: 'homework_pass',
    title: {
      en: 'Homework-Free Night',
      de: 'Hausaufgaben-freier Abend',
      hu: 'Házi feladat nélküli este',
    },
    description: {
      en: 'Skip homework for one night.',
      de: 'Für einen Abend keine Hausaufgaben.',
      hu: 'Egy estére kihagyhatod a házi feladatot.',
    },
    category: RewardCategory.PRIVILEGE,
    eligibility: 'CHILD_ONLY',
    icon: '📖',
    pointCost: 75,
    cooldownDays: 7,
    maxRedemptionsPerChild: 2,
  },
  {
    key: 'skip_cleanup',
    title: {
      en: 'Skip Dinner Cleanup',
      de: 'Abräumen nach dem Essen überspringen',
      hu: 'Vacsora utáni takarítás kihagyása',
    },
    description: {
      en: 'No cleanup duty after dinner tonight.',
      de: 'Heute Abend musst du nach dem Essen nicht abräumen.',
      hu: 'Ma este nem kell vacsorázás után takarítanod.',
    },
    category: RewardCategory.PRIVILEGE,
    eligibility: 'CHILD_ONLY',
    icon: '🧹',
    pointCost: 60,
    cooldownDays: 3,
  },
  {
    key: 'bath_skip',
    title: {
      en: 'Skip Bath Night',
      de: 'Baden auslassen',
      hu: 'Fürdés kihagyása',
    },
    description: {
      en: 'No bath or shower required tonight.',
      de: 'Heute Abend musst du nicht baden oder duschen.',
      hu: 'Ma este kihagyhatod a fürdést.',
    },
    category: RewardCategory.PRIVILEGE,
    eligibility: 'CHILD_ONLY',
    icon: '🛁',
    pointCost: 40,
    cooldownDays: 3,
    maxRedemptionsPerChild: 3,
  },
  {
    key: 'late_curfew',
    title: {
      en: 'Extended Curfew for a Night',
      de: 'Eine Stunde länger draußen bleiben',
      hu: 'Egy órával tovább maradhatsz',
    },
    description: {
      en: 'Stay out (or up) one hour later than usual tonight.',
      de: 'Für einen Abend darfst du eine Stunde später nach Hause kommen.',
      hu: 'Ma este egy órával tovább maradhatsz kint.',
    },
    category: RewardCategory.PRIVILEGE,
    eligibility: 'CHILD_ONLY',
    icon: '🌆',
    pointCost: 75,
    cooldownDays: 7,
  },
  {
    key: 'no_veggies',
    title: {
      en: 'No Veggies Tonight',
      de: 'Kein Gemüse heute Abend',
      hu: 'Ma este nincs zöldség',
    },
    description: {
      en: 'Skip the vegetables at dinner tonight.',
      de: 'Heute Abend musst du kein Gemüse essen.',
      hu: 'Ma este nem kell zöldséget enned.',
    },
    category: RewardCategory.PRIVILEGE,
    eligibility: 'CHILD_ONLY',
    icon: '🥦',
    pointCost: 35,
    cooldownDays: 7,
  },
  // ── ACTIVITY (new) ─────────────────────────────────────────────────────────
  {
    key: 'game_night_pick',
    title: {
      en: 'Pick the Game Night Game',
      de: 'Spieleabend-Spiel aussuchen',
      hu: 'Te választod a játékest játékát',
    },
    description: {
      en: 'You choose what game we play at game night.',
      de: 'Du darfst das Spiel für den Spieleabend aussuchen.',
      hu: 'Te döntöd el, melyik játékot játsszuk a játékesten.',
    },
    category: RewardCategory.ACTIVITY,
    icon: '🎲',
    pointCost: 45,
    workflowType: RewardWorkflowType.DAILY_EXCLUSIVE,
  },
  {
    key: 'friend_invite',
    title: {
      en: 'Invite a Friend Over',
      de: 'Freund einladen',
      hu: 'Hívj meg egy barátot',
    },
    description: {
      en: 'Get permission to invite a friend over for an afternoon.',
      de: 'Darf einen Freund für einen Nachmittag einladen.',
      hu: 'Engedélyt kapsz, hogy meghívj egy barátot egy délutánra.',
    },
    category: RewardCategory.ACTIVITY,
    eligibility: 'CHILD_ONLY',
    icon: '👫',
    pointCost: 80,
    cooldownDays: 7,
  },
  {
    key: 'weekend_outing',
    title: {
      en: 'Choose a Weekend Outing',
      de: 'Wochenendausflug auswählen',
      hu: 'Te választod a hétvégi kirándulást',
    },
    description: {
      en: 'Pick where the family goes on a day out this weekend.',
      de: 'Du darfst den Ausflug fürs Wochenende aussuchen.',
      hu: 'Te döntöd el, hova menjünk a hétvégén.',
    },
    category: RewardCategory.ACTIVITY,
    icon: '🗺️',
    pointCost: 120,
    cooldownDays: 14,
  },
  {
    key: 'sleepover',
    title: {
      en: 'Host a Sleepover',
      de: 'Übernachtungsparty veranstalten',
      hu: 'Szervez egy pizsama partit',
    },
    description: {
      en: 'Invite a friend for an overnight sleepover.',
      de: 'Lade einen Freund zu einer Übernachtungsparty ein.',
      hu: 'Hívhatsz egy barátot egy éjszakai partyra.',
    },
    category: RewardCategory.ACTIVITY,
    eligibility: 'CHILD_ONLY',
    icon: '🏕️',
    pointCost: 150,
    cooldownDays: 14,
  },
  // ── PARENT / ADULT-ONLY ────────────────────────────────────────────────────
  {
    key: 'parent_night_off',
    title: {
      en: 'Night Off from Bedtime Duty',
      de: 'Schlafenszeit-Freiabend',
      hu: 'Szabadesté a lefekvéstől',
    },
    description: {
      en: 'The other parent handles the entire bedtime routine tonight.',
      de: 'Der andere Elternteil übernimmt heute Abend das Schlafengehenlassen.',
      hu: 'A másik szülő ma este kezeli a lefekvési rutint.',
    },
    category: RewardCategory.PRIVILEGE,
    eligibility: 'ADULT_ONLY',
    icon: '🌙',
    pointCost: 150,
    workflowType: RewardWorkflowType.DAILY_EXCLUSIVE,
  },
  {
    key: 'parent_morning_off',
    title: {
      en: 'Sleep-In Morning',
      de: 'Ausschlafen dürfen',
      hu: 'Kialvós reggel',
    },
    description: {
      en: 'The other parent takes the morning shift with the kids so you can sleep in.',
      de: 'Der andere Elternteil übernimmt den Morgen mit den Kindern.',
      hu: 'A másik szülő vállalja a reggeli teendőket a gyerekekkel.',
    },
    category: RewardCategory.PRIVILEGE,
    eligibility: 'ADULT_ONLY',
    icon: '😴',
    pointCost: 120,
    workflowType: RewardWorkflowType.DAILY_EXCLUSIVE,
  },
  {
    key: 'parent_solo_evening',
    title: {
      en: 'Solo Evening Out',
      de: 'Freier Abend für mich',
      hu: 'Szabad este magamnak',
    },
    description: {
      en: 'Take the evening for yourself — the other parent covers everything at home.',
      de: 'Genieße einen Abend für dich allein – der andere Elternteil übernimmt.',
      hu: 'Tölts egy estét magadnak – a másik szülő gondoskodik a gyerekekről.',
    },
    category: RewardCategory.ACTIVITY,
    eligibility: 'ADULT_ONLY',
    icon: '🚶',
    pointCost: 200,
    cooldownDays: 7,
    workflowType: RewardWorkflowType.DAILY_EXCLUSIVE,
  },
  {
    key: 'parent_full_day_off',
    title: {
      en: 'Full Day to Yourself',
      de: 'Ein freier Tag für mich',
      hu: 'Egész napos szabad napom',
    },
    description: {
      en: 'The other parent solo-parents for the entire day so you can recharge.',
      de: 'Der andere Elternteil übernimmt für einen ganzen Tag die Kinderbetreuung.',
      hu: 'A másik szülő egyedül vigyáz a gyerekekre egy egész napig.',
    },
    category: RewardCategory.ACTIVITY,
    eligibility: 'ADULT_ONLY',
    icon: '🏖️',
    pointCost: 400,
    cooldownDays: 14,
    workflowType: RewardWorkflowType.DAILY_EXCLUSIVE,
  },
  {
    key: 'parent_skip_cooking',
    title: {
      en: 'Skip Cooking Tonight',
      de: 'Heute nicht kochen',
      hu: 'Ma nem főzök',
    },
    description: {
      en: "You're off cooking duty tonight — the other parent cooks or orders in.",
      de: 'Du kochst heute Abend nicht – der andere Elternteil oder eine Alternative übernimmt.',
      hu: 'Ma este nem te főzöl – a másik szülő vagy alternatív megoldás gondoskodik a vacsoráról.',
    },
    category: RewardCategory.PRIVILEGE,
    eligibility: 'ADULT_ONLY',
    icon: '🍳',
    pointCost: 100,
    workflowType: RewardWorkflowType.DAILY_EXCLUSIVE,
  },
  {
    key: 'parent_choose_weekend',
    title: {
      en: "Choose This Weekend's Plan",
      de: 'Wochenendplanung übernehmen',
      hu: 'Hétvégi program választása',
    },
    description: {
      en: 'You decide what the family does this weekend.',
      de: 'Du entscheidest, was die Familie dieses Wochenende unternimmt.',
      hu: 'Te döntöd el, mit csinál a família a hétvégén.',
    },
    category: RewardCategory.ACTIVITY,
    eligibility: 'ADULT_ONLY',
    icon: '🗓️',
    pointCost: 120,
    cooldownDays: 7,
  },
  // ── ALLOWANCE (new) ────────────────────────────────────────────────────────
  {
    key: 'bonus_allowance',
    title: {
      en: 'Bonus Allowance',
      de: 'Bonus-Taschengeld',
      hu: 'Bónusz zsebpénz',
    },
    description: {
      en: 'Earn a bonus allowance — amount set by your parent.',
      de: 'Einen Bonus auf dein Taschengeld verdienen – Betrag wird von einem Elternteil festgelegt.',
      hu: 'Extra zsebpénz bónuszt kaphatsz – az összeget a szülő határozza meg.',
    },
    category: RewardCategory.ALLOWANCE,
    icon: '💵',
    pointCost: 300,
    cooldownDays: 30,
  },
  ...operatorRewardCatalog,
];

export function getStarterRewardDefinitionsByKey(keys?: string[]): StarterRewardDefinition[] {
  if (!keys || keys.length === 0) {
    return [...starterRewardCatalog];
  }
  return starterRewardCatalog.filter((r) => keys.includes(r.key));
}

export function getStarterRewardByKey(key: string): StarterRewardDefinition | undefined {
  return starterRewardCatalog.find((r) => r.key === key);
}

export function resolveRewardLocale(text: LocalizedText, locale: SupportedLanguage): string {
  return text[locale] ?? text[fallbackLanguage];
}

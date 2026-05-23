import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { RewardCategory } from "@prisma/client";
import { SupportedLanguage, fallbackLanguage } from "../../common/i18n/supported-languages";

type LocalizedText = Record<SupportedLanguage, string>;

export type StarterRewardKey = string;

export type StarterRewardDefinition = {
  key: string;
  title: LocalizedText;
  description: LocalizedText;
  category: RewardCategory;
  icon: string;
  pointCost: number;
  maxRedemptionsPerChild?: number;
  cooldownDays?: number;
};

type StarterRewardCatalog = readonly StarterRewardDefinition[];

// ── Operator-authored rewards ────────────────────────────────────────────────
// Loaded from operator-rewards.catalog.json at module init.
// Operators author rewards in the control-plane Reward Studio and raise a PR
// to include them here. An empty array is the safe default.
function loadOperatorRewardCatalog(): StarterRewardDefinition[] {
  try {
    const filePath = join(__dirname, "operator-rewards.catalog.json");
    if (!existsSync(filePath)) {
      return [];
    }
    const raw = readFileSync(filePath, "utf8");
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
    key: "screen_time_30min",
    title: { en: "Extra Screen Time (+30 min)", de: "Zusätzliche Bildschirmzeit (+30 Min.)", hu: "Extra képernyőidő (+30 perc)" },
    description: { en: "Get 30 extra minutes of screen time.", de: "30 Minuten zusätzliche Bildschirmzeit.", hu: "30 perc extra képernyőidő." },
    category: RewardCategory.SCREEN_TIME,
    icon: "📱",
    pointCost: 50
  },
  {
    key: "screen_time_1hr",
    title: { en: "Extra Screen Time (+1 hour)", de: "Zusätzliche Bildschirmzeit (+1 Std.)", hu: "Extra képernyőidő (+1 óra)" },
    description: { en: "Get 1 extra hour of screen time.", de: "1 Stunde zusätzliche Bildschirmzeit.", hu: "1 óra extra képernyőidő." },
    category: RewardCategory.SCREEN_TIME,
    icon: "📱",
    pointCost: 80
  },
  // ── TREAT ──────────────────────────────────────────────────────────────────
  {
    key: "treat_choice",
    title: { en: "Treat of Your Choice", de: "Leckerei nach Wahl", hu: "Saját kedvenc édesség" },
    description: { en: "Pick any treat or snack.", de: "Eine beliebige Leckerei oder einen Snack aussuchen.", hu: "Válassz egy kedvenc édességet vagy rágcsálnivalót." },
    category: RewardCategory.TREAT,
    icon: "🍬",
    pointCost: 30
  },
  {
    key: "pick_dinner",
    title: { en: "Pick Tonight's Dinner", de: "Abendessen aussuchen", hu: "Te választod a vacsorát" },
    description: { en: "You get to choose what's for dinner tonight.", de: "Du darfst heute Abend das Abendessen aussuchen.", hu: "Ma este te döntöd el, mi legyen a vacsora." },
    category: RewardCategory.TREAT,
    icon: "🍽️",
    pointCost: 60
  },
  // ── ACTIVITY ───────────────────────────────────────────────────────────────
  {
    key: "pick_movie",
    title: { en: "Pick the Movie", de: "Film aussuchen", hu: "Te választod a filmet" },
    description: { en: "Choose the movie for movie night.", de: "Den Film für den Filmabend aussuchen.", hu: "Te választod ki a film estére szánt filmet." },
    category: RewardCategory.ACTIVITY,
    icon: "🎬",
    pointCost: 40
  },
  {
    key: "family_activity",
    title: { en: "Choose the Family Activity", de: "Familienaktivität aussuchen", hu: "Te választod a közös programot" },
    description: { en: "Pick what the family does together this weekend.", de: "Die gemeinsame Familienaktivität fürs Wochenende aussuchen.", hu: "Te döntöd el, mit csináljon a család együtt a hétvégén." },
    category: RewardCategory.ACTIVITY,
    icon: "🎉",
    pointCost: 70
  },
  // ── PRIVILEGE ──────────────────────────────────────────────────────────────
  {
    key: "bedtime_extension",
    title: { en: "Stay Up 30 Minutes Later", de: "30 Minuten länger aufbleiben", hu: "30 perccel tovább maradhatsz ébren" },
    description: { en: "Go to bed 30 minutes later than usual.", de: "30 Minuten länger als gewöhnlich aufbleiben.", hu: "Ma este 30 perccel tovább maradhatsz ébren." },
    category: RewardCategory.PRIVILEGE,
    icon: "🌙",
    pointCost: 50
  },
  {
    key: "skip_a_chore",
    title: { en: "Skip a Chore (Free Pass)", de: "Aufgabe auslassen (Freikarte)", hu: "Feladat kihagyása (szabadjegy)" },
    description: { en: "Use this to skip one chore of your choice.", de: "Damit kannst du eine Aufgabe deiner Wahl auslassen.", hu: "Ezzel kihagyhatsz egy általad választott feladatot." },
    category: RewardCategory.PRIVILEGE,
    icon: "🎫",
    pointCost: 100,
    maxRedemptionsPerChild: 1,
    cooldownDays: 7
  },
  // ── ALLOWANCE ──────────────────────────────────────────────────────────────
  {
    key: "pocket_money",
    title: { en: "Pocket Money Bonus", de: "Taschengeld-Bonus", hu: "Zsebpénz bónusz" },
    description: { en: "Earn a pocket money bonus — amount set by your parent.", de: "Einen Taschengeld-Bonus verdienen — Betrag wird von einem Elternteil festgelegt.", hu: "Zsebpénz bónuszt kaphatsz — az összeget a szülő határozza meg." },
    category: RewardCategory.ALLOWANCE,
    icon: "💰",
    pointCost: 200
  },
  ...operatorRewardCatalog
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

export function resolveRewardLocale(
  text: LocalizedText,
  locale: SupportedLanguage
): string {
  return text[locale] ?? text[fallbackLanguage];
}

export const supportedLanguages = ["en", "de", "hu"] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];

export const fallbackLanguage: SupportedLanguage = "en";


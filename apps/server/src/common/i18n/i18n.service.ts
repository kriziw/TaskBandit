import { Injectable } from "@nestjs/common";
import de from "./locales/de.json";
import en from "./locales/en.json";
import hu from "./locales/hu.json";
import { fallbackLanguage, supportedLanguages, SupportedLanguage } from "./supported-languages";

type Dictionary = Record<string, string>;

@Injectable()
export class I18nService {
  private readonly dictionaries: Record<SupportedLanguage, Dictionary> = {
    en,
    de,
    hu
  };

  resolveLanguage(acceptLanguageHeader?: string): SupportedLanguage {
    if (!acceptLanguageHeader) {
      return fallbackLanguage;
    }

    const requestedLanguages = acceptLanguageHeader
      .split(",")
      .map((entry) => entry.split(";")[0]?.trim().toLowerCase())
      .filter((entry): entry is string => Boolean(entry));

    for (const requestedLanguage of requestedLanguages) {
      const exactMatch = supportedLanguages.find((language) => language === requestedLanguage);
      if (exactMatch) {
        return exactMatch;
      }

      const baseLanguage = requestedLanguage.split("-")[0] as SupportedLanguage;
      const baseMatch = supportedLanguages.find((language) => language === baseLanguage);
      if (baseMatch) {
        return baseMatch;
      }
    }

    return fallbackLanguage;
  }

  translate(key: string, language: SupportedLanguage): string {
    return this.dictionaries[language][key] ?? this.dictionaries[fallbackLanguage][key] ?? key;
  }

  getSupportedLanguages() {
    return supportedLanguages.map((code) => ({
      code,
      name: this.translate("i18n.language_name", code)
    }));
  }
}


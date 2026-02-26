export const locales = ["en", "es", "pt-BR", "id", "ja", "ko"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

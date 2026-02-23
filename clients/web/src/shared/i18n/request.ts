import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import type { Locale } from "./config";

const MESSAGE_MAP: Record<Locale, () => Promise<{ default: Record<string, unknown> }>> = {
  en: () => import("../../../messages/en.json"),
  ko: () => import("../../../messages/ko.json"),
};

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await MESSAGE_MAP[locale]()).default,
  };
});

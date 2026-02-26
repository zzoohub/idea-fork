import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/src/shared/i18n/routing";
import "@/src/app/globals.css";
import { NavigationBar } from "@/src/widgets/navigation/ui";
import { PostHogProvider } from "@/src/shared/analytics";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const t = await getTranslations("accessibility");

  return (
    <html lang={locale} className="dark">
      <body className={`${inter.variable} antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <PostHogProvider>
            {/* Skip to content — first focusable element for keyboard users */}
            <a
              href="#main-content"
              className={[
                "sr-only focus:not-sr-only",
                "fixed top-space-sm left-space-sm z-[100]",
                "rounded-card bg-interactive px-space-lg py-space-sm",
                "text-body-sm font-semibold text-white",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
              ].join(" ")}
            >
              {t("skipToContent")}
            </a>

            <NavigationBar />

            {/* Main content area with padding for fixed nav bars */}
            <main
              id="main-content"
              className={[
                /* Desktop: account for fixed 56px top bar */
                "md:pt-[56px]",
                /* Mobile: sticky top bar handled by the browser, bottom tab bar needs clearance */
                "pb-[72px] md:pb-0",
              ].join(" ")}
            >
              {children}
            </main>
          </PostHogProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

"use client";

import { useEffect, useRef } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useLocale } from "next-intl";

const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const initRef = useRef(false);

  useEffect(() => {
    if (!key || initRef.current) return;
    initRef.current = true;

    posthog.init(key, {
      api_host: POSTHOG_HOST,
      capture_pageview: true,
      capture_pageleave: true,
      person_profiles: "identified_only",
    });

    posthog.register({ locale });
  }, [key, locale]);

  useEffect(() => {
    if (!key) return;
    posthog.register({ locale });
  }, [key, locale]);

  if (!key) return <>{children}</>;

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

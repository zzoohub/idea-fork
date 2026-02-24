import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import posthog from "posthog-js";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/en.json";
import { PostHogProvider } from "./provider";

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

describe("PostHogProvider", () => {
  const originalEnv = process.env.NEXT_PUBLIC_POSTHOG_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = originalEnv;
  });

  it("renders children as passthrough when no key is set", () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    render(
      <Wrapper>
        <PostHogProvider>
          <div data-testid="child">Hello</div>
        </PostHogProvider>
      </Wrapper>,
    );
    expect(screen.getByTestId("child")).toHaveTextContent("Hello");
    expect(posthog.init).not.toHaveBeenCalled();
  });

  it("initializes posthog and registers locale when key is set", () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test123";
    render(
      <Wrapper>
        <PostHogProvider>
          <div data-testid="child">Hello</div>
        </PostHogProvider>
      </Wrapper>,
    );
    expect(screen.getByTestId("child")).toHaveTextContent("Hello");
    expect(posthog.init).toHaveBeenCalledWith("phc_test123", {
      api_host: "https://us.i.posthog.com",
      capture_pageview: true,
      capture_pageleave: true,
      person_profiles: "identified_only",
    });
    expect(posthog.register).toHaveBeenCalledWith({ locale: "en" });
  });
});

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { RatingButtons } from "@/src/shared/ui";
import { createRating, updateRating } from "@/src/features/rating/api";

/* --------------------------------------------------------------------------
   BriefRating
   Thumbs up/down with feedback thank-you and optional text on thumbs-down.
   -------------------------------------------------------------------------- */

type RatingValue = "up" | "down" | null;

interface BriefRatingProps {
  briefId: number;
  initialValue?: RatingValue;
}

export function BriefRating({
  briefId,
  initialValue = null,
}: BriefRatingProps) {
  const [rating, setRating] = useState<RatingValue>(initialValue);
  const [submitted, setSubmitted] = useState(initialValue !== null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const t = useTranslations("briefRating");

  function handleRate(value: RatingValue) {
    setRating(value);
    /* c8 ignore start -- null is unreachable: BriefRating hides RatingButtons after
       the first non-null rating, so `handleRate(null)` can never be called via UI */
    if (value !== null) {
      setSubmitted(true);
      createRating(briefId, { is_positive: value === "up" }).catch(() => {
        // Silently handle API failure — user already sees thank you
      });
    }
    /* c8 ignore stop */
  }

  function handleSendFeedback() {
    if (feedbackText.trim().length === 0) return;
    setFeedbackSent(true);
    updateRating(briefId, {
      is_positive: rating === "up",
      feedback: feedbackText.trim(),
    }).catch(() => {
      // Silently handle API failure
    });
  }

  /* After feedback has been sent for thumbs-down */
  const showFeedbackInput =
    submitted && rating === "down" && !feedbackSent;

  return (
    <div
      className={[
        "flex flex-col items-center gap-space-md",
        "p-card-padding rounded-card",
        "bg-bg-secondary border border-border",
      ].join(" ")}
      data-brief-id={briefId}
    >
      <div aria-live="polite" className="flex flex-col items-center gap-space-md w-full">
        {!submitted ? (
          <>
            <p className="text-body-sm text-text-secondary font-semibold">
              {t("wasUseful")}
            </p>
            <RatingButtons value={rating} onChange={handleRate} />
          </>
        ) : (
          <>
            <p className="text-body-sm text-text-secondary">
              {t("thanks")}
            </p>

            {/* Thumbs-down: slide in optional text input */}
            {showFeedbackInput && (
              <div
                className={[
                  "flex flex-col gap-space-sm w-full",
                  "animate-in slide-in-from-top-2",
                ].join(" ")}
                style={{
                  animationDuration: "var(--duration-normal)",
                  animationTimingFunction: "var(--ease-out)",
                }}
              >
                <label
                  htmlFor={`feedback-${briefId}`}
                  className="text-caption text-text-tertiary"
                >
                  {t("whatMissing")}
                </label>
                <div className="flex gap-space-sm">
                  <input
                    id={`feedback-${briefId}`}
                    type="text"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    maxLength={500}
                    placeholder={t("tellUsMore")}
                    className={[
                      "flex-1 bg-bg-tertiary text-text-primary placeholder:text-text-tertiary",
                      "rounded-card border border-border",
                      "px-space-md py-space-xs",
                      "text-body-sm",
                      "transition-colors",
                      "focus:border-border-active focus:outline-none",
                    ].join(" ")}
                    style={{
                      transitionDuration: "var(--duration-fast)",
                      transitionTimingFunction: "var(--ease-out)",
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendFeedback();
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSendFeedback}
                    disabled={feedbackText.trim().length === 0}
                    className={[
                      "px-space-md py-space-xs rounded-card",
                      "text-body-sm font-semibold",
                      "bg-interactive text-white",
                      "hover:bg-interactive-hover",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "cursor-pointer transition-colors",
                    ].join(" ")}
                    style={{
                      transitionDuration: "var(--duration-fast)",
                      transitionTimingFunction: "var(--ease-out)",
                    }}
                  >
                    {t("send")}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

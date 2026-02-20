"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/shared/lib/utils";

type RatingState = "unrated" | "up" | "down";

export function RatingButtons() {
  const [rating, setRating] = useState<RatingState>("unrated");
  const [feedback, setFeedback] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  if (rating !== "unrated") {
    return (
      <div className="text-center space-y-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Thanks for your feedback.
        </p>
        {rating === "down" && !feedbackSent && (
          <div className="flex items-center gap-2 max-w-sm mx-auto">
            <input
              type="text"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              maxLength={500}
              placeholder="What was missing? (optional)"
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm min-h-11 sm:min-h-0 placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={() => setFeedbackSent(true)}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground min-h-11 sm:min-h-0"
            >
              Send
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="text-center space-y-3">
      <p className="text-sm text-muted-foreground">Was this brief useful?</p>
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => setRating("up")}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full border transition-colors hover:bg-accent"
          )}
          aria-label="Rate as useful"
        >
          <ThumbsUp size={20} />
        </button>
        <button
          type="button"
          onClick={() => setRating("down")}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full border transition-colors hover:bg-accent"
          )}
          aria-label="Rate as not useful"
        >
          <ThumbsDown size={20} />
        </button>
      </div>
    </div>
  );
}

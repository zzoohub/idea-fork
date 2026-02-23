import { describe, it, expect } from "vitest";
import { extractSubreddits } from "./extract-subreddits";

describe("extractSubreddits", () => {
  it("extracts unique subreddit names", () => {
    const snapshots = [
      { subreddit: "r/SaaS" },
      { subreddit: "r/startups" },
      { subreddit: "r/SaaS" },
      { subreddit: "r/webdev" },
    ];
    expect(extractSubreddits(snapshots)).toEqual([
      "r/SaaS",
      "r/startups",
      "r/webdev",
    ]);
  });

  it("returns empty array for empty input", () => {
    expect(extractSubreddits([])).toEqual([]);
  });

  it("ignores snapshots without subreddit field", () => {
    const snapshots = [
      { source: "appstore" },
      { subreddit: "r/webdev" },
    ];
    expect(extractSubreddits(snapshots)).toEqual(["r/webdev"]);
  });

  it("ignores non-string subreddit values", () => {
    const snapshots = [
      { subreddit: 123 },
      { subreddit: null },
      { subreddit: undefined },
      { subreddit: true },
      { subreddit: "r/valid" },
    ];
    expect(extractSubreddits(snapshots)).toEqual(["r/valid"]);
  });

  it("ignores empty string subreddit", () => {
    const snapshots = [
      { subreddit: "" },
      { subreddit: "r/startups" },
    ];
    expect(extractSubreddits(snapshots)).toEqual(["r/startups"]);
  });
});

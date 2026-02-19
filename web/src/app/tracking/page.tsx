"use client";

import { useState } from "react";
import { Radar, Search } from "lucide-react";
import { useUser } from "@/context/user-context";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { FeedCard } from "@/components/feed/feed-card";
import { KeywordChip } from "@/components/tracking/keyword-chip";
import { AddKeywordInput } from "@/components/tracking/add-keyword-input";
import { EmptyState } from "@/components/empty-state";
import { BlurredOverlay } from "@/components/blurred-overlay";
import { mockTrackedKeywords, mockFeedPosts } from "@/lib/mock-data";
import type { TrackedKeyword } from "@/types";
import { toast } from "sonner";

export default function TrackingPage() {
  const { tier, isLoggedIn } = useUser();
  const router = useRouter();
  const [keywords, setKeywords] = useState<TrackedKeyword[]>(mockTrackedKeywords);

  if (!isLoggedIn) {
    router.push("/login");
    return null;
  }

  if (tier !== "pro") {
    return (
      <PageContainer maxWidth="feed">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Tracking</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Monitor keywords and domains for emerging needs
        </p>
        <BlurredOverlay
          title="Tracking is a Pro feature"
          description="Track keywords and get notified about new matches."
          ctaLabel="Upgrade to Pro — $9/mo"
          ctaHref="/pricing"
        >
          <div className="space-y-4 p-6">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-secondary px-3 py-1.5 text-sm">invoicing</span>
              <span className="rounded-full bg-secondary px-3 py-1.5 text-sm">onboarding</span>
              <span className="rounded-full bg-secondary px-3 py-1.5 text-sm">HR tech</span>
            </div>
            <div className="space-y-3">
              {mockFeedPosts.slice(0, 3).map((post) => (
                <div key={post.id} className="h-24 rounded-lg bg-muted" />
              ))}
            </div>
          </div>
        </BlurredOverlay>
      </PageContainer>
    );
  }

  const keywordStrings = keywords.map((k) => k.keyword);

  // Find mock feed posts that match any tracked keyword
  const matchingPosts = mockFeedPosts.filter((post) =>
    keywordStrings.some(
      (kw) =>
        post.excerpt.toLowerCase().includes(kw) ||
        post.title.toLowerCase().includes(kw)
    )
  );

  const handleAddKeyword = (keyword: string) => {
    const newKw: TrackedKeyword = {
      id: `tk-${Date.now()}`,
      keyword,
      createdAt: new Date().toISOString(),
      matchCount: 0,
    };
    setKeywords((prev) => [...prev, newKw]);
    toast(`Now tracking "${keyword}"`);
  };

  const handleRemoveKeyword = (id: string) => {
    setKeywords((prev) => prev.filter((k) => k.id !== id));
    toast("Keyword removed");
  };

  return (
    <PageContainer maxWidth="feed">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Tracking</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Monitor keywords and domains for emerging needs
      </p>

      {/* Keywords section */}
      <section className="rounded-lg border p-4 sm:p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Your Keywords
          </h2>
        </div>

        {keywords.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-4">
            Add keywords to start tracking.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 mb-4">
            {keywords.map((kw) => (
              <KeywordChip
                key={kw.id}
                keyword={kw.keyword}
                onRemove={() => handleRemoveKeyword(kw.id)}
              />
            ))}
          </div>
        )}

        <AddKeywordInput
          onAdd={handleAddKeyword}
          existingKeywords={keywordStrings}
        />
      </section>

      {/* Matches section */}
      <section className="rounded-lg border p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            New Matches
            {matchingPosts.length > 0 && (
              <span className="ml-2 font-normal text-xs">
                {matchingPosts.length} new
              </span>
            )}
          </h2>
        </div>

        {matchingPosts.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No new matches"
            description="No new matches since your last visit. Your tracked keywords are active."
          />
        ) : (
          <div className="space-y-3">
            {matchingPosts.map((post) => (
              <div key={post.id} className="ring-2 ring-primary/20 rounded-lg">
                <FeedCard
                  post={post}
                  onBookmarkToggle={() => toast("Bookmark updated")}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </PageContainer>
  );
}

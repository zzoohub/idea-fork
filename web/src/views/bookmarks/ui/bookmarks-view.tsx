"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { useUser } from "@/entities/user";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/shared/ui/page-container";
import { PostCard } from "@/entities/post";
import { BriefCard } from "@/entities/brief";
import { EmptyState } from "@/shared/ui/empty-state";
import { mockBookmarks } from "@/shared/mocks/data";
import type { FeedPost, Brief, Bookmark as BookmarkType } from "@/shared/types";
import { cn } from "@/shared/lib/utils";
import { toast } from "sonner";

type FilterTab = "all" | "feed" | "brief";

const tabs: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "feed", label: "Feed items" },
  { key: "brief", label: "Briefs" },
];

export function BookmarksView() {
  const { isLoggedIn } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>(mockBookmarks);

  if (!isLoggedIn) {
    router.push("/login");
    return null;
  }

  const filtered = bookmarks.filter((b) => {
    if (activeTab === "all") return true;
    return b.type === activeTab;
  });

  const handleRemove = (bookmarkId: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
    toast("Removed from bookmarks");
  };

  return (
    <PageContainer maxWidth="feed">
      <h1 className="text-2xl font-bold tracking-tight mb-1">
        Your Bookmarks
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Saved feed items and briefs
      </p>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6" role="tablist" aria-label="Bookmark filters">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors min-h-11 flex items-center",
              activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookmark list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No bookmarks yet"
          description="Browse the feed and save items you want to revisit."
          actionLabel="Browse feed"
          actionHref="/"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((bookmark) => {
            if (bookmark.type === "feed") {
              return (
                <div key={bookmark.id} className="relative">
                  <PostCard
                    post={bookmark.item as FeedPost}
                    onBookmarkToggle={() => handleRemove(bookmark.id)}
                  />
                </div>
              );
            }
            return (
              <div key={bookmark.id} className="relative">
                <BriefCard
                  brief={bookmark.item as Brief}
                  onBookmarkToggle={() => handleRemove(bookmark.id)}
                />
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}

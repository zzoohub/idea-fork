"use client";

import { useState } from "react";
import { BackLink, Button, Divider } from "@/src/shared/ui";
import {
  ProductHeader,
  ComplaintSummary,
} from "@/src/entities/product/ui";
import { PostSnippet } from "@/src/entities/post/ui";
import { BriefCard } from "@/src/entities/brief/ui";

/* --------------------------------------------------------------------------
   Mock Data
   TODO: Replace with API data
   -------------------------------------------------------------------------- */
const INITIAL_VISIBLE_COUNT = 5;

// TODO: Replace with API data
const MOCK_PRODUCT = {
  name: "InvoiceNow",
  category: "SaaS \u00b7 invoicing",
  websiteUrl: "https://invoicenow.example.com",
};

// TODO: Replace with API data
const MOCK_COMPLAINT_SUMMARY = {
  totalCount: 23,
  platformCount: 2,
  themes: [
    { name: "Complex setup", count: 12 },
    { name: "Missing recurring invoices", count: 7 },
    { name: "Slow support", count: 4 },
  ],
};

// TODO: Replace with API data
const MOCK_COMPLAINTS = [
  {
    id: "1",
    source: "reddit" as const,
    sourceName: "r/smallbusiness",
    date: "Feb 12, 2026",
    snippet:
      "Spent three hours trying to set up InvoiceNow for my agency. The onboarding wizard keeps crashing on step 4 and support is unresponsive.",
    originalUrl: "https://reddit.com/r/smallbusiness/comments/example1",
  },
  {
    id: "2",
    source: "reddit" as const,
    sourceName: "r/SaaS",
    date: "Feb 10, 2026",
    snippet:
      "Why can't InvoiceNow handle recurring invoices? Every month I have to manually re-create 30+ invoices for retainer clients. This should be table stakes.",
    originalUrl: "https://reddit.com/r/SaaS/comments/example2",
  },
  {
    id: "3",
    source: "appstore" as const,
    sourceName: "App Store",
    date: "Feb 8, 2026",
    snippet:
      "The mobile app is painfully slow. Loading an invoice takes 10+ seconds on a good day. Desktop is fine but the app needs serious work.",
    originalUrl: "https://apps.apple.com/example3",
  },
  {
    id: "4",
    source: "reddit" as const,
    sourceName: "r/freelance",
    date: "Feb 5, 2026",
    snippet:
      "Setup was confusing and I couldn't figure out how to connect my Stripe account. Ended up switching to a competitor after wasting a whole afternoon.",
    originalUrl: "https://reddit.com/r/freelance/comments/example4",
  },
  {
    id: "5",
    source: "appstore" as const,
    sourceName: "App Store",
    date: "Feb 3, 2026",
    snippet:
      "Customer support took 5 days to respond to my billing issue. When they finally did, the reply was a generic template that didn't address my problem at all.",
    originalUrl: "https://apps.apple.com/example5",
  },
  {
    id: "6",
    source: "reddit" as const,
    sourceName: "r/Entrepreneur",
    date: "Jan 28, 2026",
    snippet:
      "I love the concept but the execution is rough. Tax calculation is wrong for Canadian provinces and there's no way to customize the invoice template footer.",
    originalUrl: "https://reddit.com/r/Entrepreneur/comments/example6",
  },
  {
    id: "7",
    source: "reddit" as const,
    sourceName: "r/smallbusiness",
    date: "Jan 25, 2026",
    snippet:
      "The reporting dashboard is basically useless. I need to export to CSV and build my own charts just to see revenue trends. Bizarre for a billing tool.",
    originalUrl: "https://reddit.com/r/smallbusiness/comments/example7",
  },
  {
    id: "8",
    source: "appstore" as const,
    sourceName: "App Store",
    date: "Jan 22, 2026",
    snippet:
      "App crashes every time I try to add a new client on iOS 18. Been like this for two updates now. Feels abandoned.",
    originalUrl: "https://apps.apple.com/example8",
  },
];

// TODO: Replace with API data
const MOCK_RELATED_BRIEF = {
  title: "Invoicing tools frustrate small businesses with complex setup",
  postCount: 23,
  platformCount: 2,
  recency: "This week",
  snippet:
    "Small business owners and freelancers consistently report that modern invoicing SaaS products require excessive configuration before sending a first invoice...",
  tags: ["invoicing", "SaaS", "onboarding"],
  slug: "invoicing-tools-frustrate-small-businesses",
};

/* --------------------------------------------------------------------------
   ProductDetailPage
   -------------------------------------------------------------------------- */
interface ProductDetailPageProps {
  slug: string;
}

export function ProductDetailPage({ slug }: ProductDetailPageProps) {
  const [showAllComplaints, setShowAllComplaints] = useState(false);

  // TODO: Replace with API data fetching using slug
  void slug;

  const visibleComplaints = showAllComplaints
    ? MOCK_COMPLAINTS
    : MOCK_COMPLAINTS.slice(0, INITIAL_VISIBLE_COUNT);

  const remainingCount = MOCK_COMPLAINTS.length - INITIAL_VISIBLE_COUNT;

  return (
    <div className="mx-auto w-full max-w-[720px] px-space-lg py-layout-md">
      {/* Back navigation */}
      <BackLink href="/products" label="Back to Products" />

      {/* Product header */}
      <div className="mt-layout-sm">
        <ProductHeader
          name={MOCK_PRODUCT.name}
          category={MOCK_PRODUCT.category}
          websiteUrl={MOCK_PRODUCT.websiteUrl}
        />
      </div>

      <Divider />

      {/* Complaint summary section */}
      <section aria-labelledby="complaint-summary-heading">
        <h2
          id="complaint-summary-heading"
          className="text-h2 font-bold text-text-primary leading-[var(--leading-h2)]"
        >
          Complaint Summary
        </h2>
        <div className="mt-space-lg">
          <ComplaintSummary
            totalCount={MOCK_COMPLAINT_SUMMARY.totalCount}
            platformCount={MOCK_COMPLAINT_SUMMARY.platformCount}
            themes={MOCK_COMPLAINT_SUMMARY.themes}
          />
        </div>
      </section>

      <Divider />

      {/* User complaints section */}
      <section aria-labelledby="user-complaints-heading">
        <h2
          id="user-complaints-heading"
          className="text-h2 font-bold text-text-primary leading-[var(--leading-h2)]"
        >
          User Complaints ({MOCK_COMPLAINTS.length})
        </h2>

        <div className="mt-space-lg flex flex-col gap-space-xl">
          {visibleComplaints.map((complaint) => (
            <PostSnippet
              key={complaint.id}
              source={complaint.source}
              sourceName={complaint.sourceName}
              date={complaint.date}
              snippet={complaint.snippet}
              originalUrl={complaint.originalUrl}
            />
          ))}
        </div>

        {/* Show all / collapse toggle */}
        {remainingCount > 0 && (
          <div className="mt-space-xl">
            <Button
              variant="ghost"
              onClick={() => setShowAllComplaints((prev) => !prev)}
            >
              {showAllComplaints
                ? "Show fewer complaints"
                : `Show all ${MOCK_COMPLAINTS.length} complaints`}
            </Button>
          </div>
        )}
      </section>

      <Divider />

      {/* Related brief section */}
      {MOCK_RELATED_BRIEF && (
        <section aria-labelledby="related-brief-heading">
          <h2
            id="related-brief-heading"
            className="text-h2 font-bold text-text-primary leading-[var(--leading-h2)]"
          >
            Related Brief
          </h2>
          <div className="mt-space-lg">
            <BriefCard
              title={MOCK_RELATED_BRIEF.title}
              postCount={MOCK_RELATED_BRIEF.postCount}
              platformCount={MOCK_RELATED_BRIEF.platformCount}
              recency={MOCK_RELATED_BRIEF.recency}
              snippet={MOCK_RELATED_BRIEF.snippet}
              tags={MOCK_RELATED_BRIEF.tags}
              slug={MOCK_RELATED_BRIEF.slug}
            />
          </div>
        </section>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Loading Skeleton
   -------------------------------------------------------------------------- */
export function ProductDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[720px] px-space-lg py-layout-md">
      {/* Back link skeleton */}
      <div className="skeleton h-[20px] w-[140px] rounded-[4px]" />

      {/* Header skeleton */}
      <div className="mt-layout-sm flex items-start gap-space-lg">
        <div className="skeleton h-[56px] w-[56px] shrink-0 rounded-card" />
        <div className="flex flex-1 flex-col gap-space-sm">
          <div className="skeleton h-[28px] w-[200px] rounded-[4px]" />
          <div className="skeleton h-[16px] w-[260px] rounded-[4px]" />
        </div>
      </div>

      <hr className="border-t border-border my-layout-sm" role="separator" />

      {/* Complaint summary skeleton */}
      <div className="skeleton h-[24px] w-[200px] rounded-[4px]" />
      <div className="mt-space-lg flex flex-col gap-space-md">
        <div className="skeleton h-[28px] w-[180px] rounded-[4px]" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-space-xs">
            <div className="skeleton h-[16px] w-full rounded-[4px]" />
            <div className="skeleton h-[4px] w-full rounded-full" />
          </div>
        ))}
      </div>

      <hr className="border-t border-border my-layout-sm" role="separator" />

      {/* Complaints skeleton */}
      <div className="skeleton h-[24px] w-[180px] rounded-[4px]" />
      <div className="mt-space-lg flex flex-col gap-space-xl">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-space-sm">
            <div className="skeleton h-[14px] w-[200px] rounded-[4px]" />
            <div className="skeleton h-[32px] w-full rounded-[4px]" />
            <div className="skeleton h-[14px] w-[100px] rounded-[4px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

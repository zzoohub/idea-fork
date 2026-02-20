"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { ProductDetail } from "@/shared/types";
import { BackLink } from "@/shared/ui/back-link";
import { SourceSnippet } from "@/shared/ui/source-snippet";
import { sanitizeExternalUrl } from "@/shared/lib/utils";

interface ProductDetailClientProps {
  product: ProductDetail;
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const [showAllComplaints, setShowAllComplaints] = useState(false);

  const allComplaints = product.complaintBreakdown.flatMap((t) => t.posts);
  const visibleComplaints = showAllComplaints
    ? allComplaints
    : allComplaints.slice(0, 5);

  const initial = product.name[0]?.toUpperCase() ?? "?";

  return (
    <div>
      {/* Back link */}
      <div className="mb-4">
        <BackLink href="/products" label="Back to Products" />
      </div>

      {/* Product header */}
      <div className="flex items-center gap-4 mb-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-lg font-bold shrink-0">
          {initial}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
          <p className="text-sm text-muted-foreground">
            {product.category}
          </p>
        </div>
      </div>

      {product.websiteUrl && (
        <a
          href={sanitizeExternalUrl(product.websiteUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-6 min-h-11 sm:min-h-0"
        >
          Visit website
          <ExternalLink size={12} aria-hidden="true" />
        </a>
      )}

      {/* Complaint Summary */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Complaint Summary</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {product.complaintCount} complaints across{" "}
          {product.platforms.length} platform
          {product.platforms.length !== 1 && "s"}
        </p>
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Top themes:</h3>
          <ul className="space-y-1.5">
            {product.complaintBreakdown.map((theme) => (
              <li
                key={theme.theme}
                className="flex items-center gap-2 text-sm"
              >
                <span className="text-muted-foreground">-</span>
                <span>{theme.theme}</span>
                <span className="text-xs text-muted-foreground">
                  ({theme.postCount} posts)
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* User Complaints */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">
          User Complaints ({allComplaints.length})
        </h2>
        <div className="space-y-3">
          {visibleComplaints.map((post) => (
            <SourceSnippet key={post.id} post={post} />
          ))}
        </div>
        {!showAllComplaints && allComplaints.length > 5 && (
          <button
            type="button"
            onClick={() => setShowAllComplaints(true)}
            className="mt-3 text-sm font-medium text-primary hover:underline min-h-11 sm:min-h-0"
          >
            Show all {allComplaints.length} complaints
          </button>
        )}
      </div>

      {/* Related Brief */}
      {product.relatedBriefs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Related Brief</h2>
          {product.relatedBriefs.map((brief) => (
            <Link
              key={brief.id}
              href={`/briefs/${brief.id}`}
              className="block rounded-lg border bg-card p-4 hover:shadow-md transition-shadow"
            >
              <h3 className="text-sm font-semibold mb-1">{brief.title}</h3>
              <span className="text-xs text-muted-foreground">
                {brief.postCount} posts
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

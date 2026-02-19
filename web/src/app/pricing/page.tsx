"use client";

import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/user-context";
import { PageContainer } from "@/components/layout/page-container";
import { PRO_PRICE_MONTHLY } from "@/lib/constants";

interface FeatureRow {
  feature: string;
  free: boolean | string;
  pro: boolean | string;
}

const features: FeatureRow[] = [
  { feature: "Browse full feed", free: true, pro: true },
  { feature: "Brief summaries", free: true, pro: true },
  { feature: "Deep dives", free: "3/day", pro: "Unlimited" },
  { feature: "Full AI briefs", free: false, pro: true },
  { feature: "Bookmarks", free: true, pro: true },
  { feature: "Keyword tracking", free: false, pro: true },
  { feature: "Email notifications", free: false, pro: true },
  { feature: "Weekly digest", free: false, pro: true },
];

function FeatureCell({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return <span className="text-sm">{value}</span>;
  }
  return value ? (
    <Check size={18} className="text-green-600" aria-label="Included" />
  ) : (
    <X size={18} className="text-muted-foreground/40" aria-label="Not included" />
  );
}

export default function PricingPage() {
  const { setTier } = useUser();

  return (
    <PageContainer maxWidth="feed">
      <div className="py-8">
        <h1 className="text-2xl font-bold tracking-tight text-center mb-2">
          Simple pricing
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-8">
          Start free, upgrade when you&rsquo;re ready.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-8">
          {/* Free tier */}
          <div className="rounded-lg border p-6">
            <h2 className="font-semibold mb-1">Free</h2>
            <p className="text-3xl font-bold mb-1">
              $0
              <span className="text-sm font-normal text-muted-foreground">
                /mo
              </span>
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              No credit card required
            </p>
            <Button
              variant="outline"
              className="w-full min-h-11"
              onClick={() => setTier("free")}
            >
              Get started
            </Button>
          </div>

          {/* Pro tier */}
          <div className="rounded-lg border-2 border-primary p-6">
            <h2 className="font-semibold mb-1">Pro</h2>
            <p className="text-3xl font-bold mb-1">
              ${PRO_PRICE_MONTHLY}
              <span className="text-sm font-normal text-muted-foreground">
                /mo
              </span>
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Cancel anytime
            </p>
            <Button
              className="w-full min-h-11"
              onClick={() => setTier("pro")}
            >
              Upgrade to Pro
            </Button>
          </div>
        </div>

        {/* Comparison table */}
        <div className="rounded-lg border overflow-hidden max-w-lg mx-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Feature</th>
                <th className="text-center p-3 font-medium">Free</th>
                <th className="text-center p-3 font-medium">Pro</th>
              </tr>
            </thead>
            <tbody>
              {features.map((row) => (
                <tr key={row.feature} className="border-b last:border-0">
                  <td className="p-3 text-muted-foreground">{row.feature}</td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center">
                      <FeatureCell value={row.free} />
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center">
                      <FeatureCell value={row.pro} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageContainer>
  );
}

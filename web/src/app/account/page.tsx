"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useUser } from "@/context/user-context";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import Link from "next/link";
import { PRO_PRICE_MONTHLY } from "@/lib/constants";

export default function AccountPage() {
  const { user, tier, setTier } = useUser();
  const router = useRouter();

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <PageContainer maxWidth="feed">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Account</h1>

      {/* Profile */}
      <section className="rounded-lg border p-4 sm:p-6 mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Profile
        </h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Name</dt>
            <dd>{user.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Member since</dt>
            <dd>
              {new Date(user.memberSince).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}
            </dd>
          </div>
        </dl>
      </section>

      {/* Subscription */}
      <section className="rounded-lg border p-4 sm:p-6 mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Subscription
        </h2>
        {tier === "pro" ? (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current plan</span>
              <span className="font-medium">Pro (${PRO_PRICE_MONTHLY}/mo)</span>
            </div>
            {user.nextBillingDate && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Next billing date</span>
                <span>
                  {new Date(user.nextBillingDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
            <Separator />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="min-h-11">
                Manage subscription
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-11 text-destructive hover:text-destructive"
                onClick={() => setTier("free")}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current plan</span>
              <span className="font-medium">Free</span>
            </div>
            <Button asChild className="min-h-11">
              <Link href="/pricing">Upgrade to Pro &mdash; ${PRO_PRICE_MONTHLY}/mo</Link>
            </Button>
          </div>
        )}
      </section>

      {/* Preferences */}
      <section className="rounded-lg border p-4 sm:p-6 mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Preferences
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Weekly digest email</p>
            <p className="text-xs text-muted-foreground">
              Get a summary of new opportunities each week.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={user.weeklyDigest}
            className={`relative h-6 w-11 rounded-full transition-colors min-h-[28px] ${
              user.weeklyDigest ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                user.weeklyDigest ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </section>

      {/* Sign out */}
      <Button
        variant="outline"
        className="min-h-11"
        onClick={() => {
          setTier("anonymous");
          router.push("/");
        }}
      >
        <LogOut size={16} />
        Sign out
      </Button>
    </PageContainer>
  );
}

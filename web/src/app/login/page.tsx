"use client";

import { LogIn, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/user-context";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";

const features = [
  "Browse the full feed of user complaints",
  "Read AI-generated brief summaries",
  "3 deep dives per day",
  "Save bookmarks for later",
];

export default function LoginPage() {
  const { setTier } = useUser();
  const router = useRouter();

  const handleGoogleSignIn = () => {
    setTier("free");
    router.push("/");
  };

  return (
    <PageContainer maxWidth="feed">
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-sm rounded-lg border bg-card p-6 sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-center mb-2">
            Sign in to Mealio
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Discover product opportunities from real user pain points.
          </p>

          <Button
            onClick={handleGoogleSignIn}
            className="w-full min-h-11 mb-6"
            size="lg"
          >
            <LogIn size={18} />
            Continue with Google
          </Button>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Free account includes
            </p>
            {features.map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Check size={14} className="text-green-600 shrink-0" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

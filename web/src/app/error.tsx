"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <PageContainer maxWidth="feed">
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="rounded-full bg-destructive/10 p-4 mb-4">
          <AlertTriangle size={32} className="text-destructive" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          We&rsquo;re looking into it. Please try again.
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </PageContainer>
  );
}

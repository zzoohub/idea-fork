import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { mockIdeas } from "@/features/feed/data/mock-ideas";
import type { FunctionType } from "@/types";

/**
 * Map function slug to display label
 */
const functionLabels: Record<FunctionType, string> = {
  create: "Create",
  automate: "Automate",
  analyze: "Analyze",
  connect: "Connect",
  sell: "Sell",
  learn: "Learn",
  manage: "Manage",
  protect: "Protect",
};

/**
 * Map function slug to badge variant
 */
const functionVariants: Record<FunctionType, BadgeVariant> = {
  create: "primary",
  automate: "teal",
  analyze: "orange",
  connect: "indigo",
  sell: "primary",
  learn: "teal",
  manage: "orange",
  protect: "indigo",
};

interface IdeaPageProps {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Individual idea detail page
 * Displays full PRD (Product Requirements Document) for an idea
 */
export default async function IdeaPage({ params }: IdeaPageProps) {
  const { id } = await params;
  const idea = mockIdeas.find((i) => i.id === id);

  if (!idea) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-white">Idea not found</h1>
        <Button asChild variant="secondary">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Feed
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl py-8">
      {/* Back navigation */}
      <Button asChild variant="ghost" className="mb-6">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Feed
        </Link>
      </Button>

      {/* Hero image */}
      <div className="relative mb-8 h-64 w-full overflow-hidden rounded-xl">
        <Image
          src={idea.imageUrl}
          alt={idea.imageAlt}
          fill
          className="object-cover"
        />
      </div>

      {/* Title and taxonomy badges */}
      <div className="mb-8">
        <h1 className="mb-4 text-3xl font-black text-white">{idea.title}</h1>
        <div className="flex flex-wrap gap-2">
          <Badge variant={functionVariants[idea.functionSlug]}>
            {functionLabels[idea.functionSlug]}
          </Badge>
          {idea.industrySlug && (
            <Badge variant="secondary">{idea.industrySlug}</Badge>
          )}
        </div>
      </div>

      {/* PRD Sections */}
      <div className="space-y-8">
        <section className="rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
          <h2 className="mb-3 text-lg font-bold text-white">
            Problem Statement
          </h2>
          <p className="text-neutral-300">{idea.problem}</p>
        </section>

        <section className="rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
          <h2 className="mb-3 text-lg font-bold text-white">
            Proposed Solution
          </h2>
          <p className="text-neutral-300">{idea.solution}</p>
        </section>

        <section className="rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
          <h2 className="mb-3 text-lg font-bold text-white">Target Users</h2>
          <p className="text-neutral-300">{idea.targetUsers}</p>
        </section>
      </div>
    </div>
  );
}

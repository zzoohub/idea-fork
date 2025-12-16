import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { mockIdeas } from "@/features/feed/data/mock-ideas";

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
        <img
          src={idea.imageUrl}
          alt={idea.imageAlt}
          className="h-full w-full object-cover"
        />
      </div>

      {/* Title and categories */}
      <div className="mb-8">
        <h1 className="mb-4 text-3xl font-black text-white">{idea.title}</h1>
        <div className="flex flex-wrap gap-2">
          {idea.categories.map((category, index) => (
            <Badge key={index} variant={category.variant as BadgeVariant}>
              {category.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* PRD Sections */}
      <div className="space-y-8">
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="mb-3 text-lg font-bold text-white">
            Problem Statement
          </h2>
          <p className="text-neutral-300">{idea.problem}</p>
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="mb-3 text-lg font-bold text-white">
            Proposed Solution
          </h2>
          <p className="text-neutral-300">{idea.solution}</p>
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="mb-3 text-lg font-bold text-white">Target Users</h2>
          <p className="text-neutral-300">{idea.targetUsers}</p>
        </section>
      </div>
    </div>
  );
}

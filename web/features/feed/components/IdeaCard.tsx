import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";

import type { Idea, FunctionType } from "@/types";

interface IdeaCardProps {
  idea: Idea;
}

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

/**
 * Card component displaying a single idea with image, taxonomy badges,
 * problem/solution/target users, and a CTA button.
 */
export function IdeaCard({ idea }: IdeaCardProps) {
  return (
    <Card>
      {/* Image */}
      <div className="relative h-48 w-full overflow-hidden">
        <Image
          src={idea.imageUrl}
          alt={idea.imageAlt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
        />
      </div>

      <CardContent>
        {/* Header with title and taxonomy badges */}
        <CardHeader>
          <CardTitle>{idea.title}</CardTitle>
          <div className="flex flex-wrap gap-2">
            {/* Function badge (always shown) */}
            <Badge variant={functionVariants[idea.functionSlug]}>
              {functionLabels[idea.functionSlug]}
            </Badge>
            {/* Industry badge (if present) */}
            {idea.industrySlug && (
              <Badge variant="secondary">{idea.industrySlug}</Badge>
            )}
          </div>
        </CardHeader>

        {/* Problem, Solution, Target Users */}
        <div className="flex flex-col gap-4 text-sm text-neutral-300">
          <p>
            <strong className="text-white/90">Problem:</strong> {idea.problem}
          </p>
          <p>
            <strong className="text-white/90">Solution:</strong> {idea.solution}
          </p>
          <p>
            <strong className="text-white/90">Target Users:</strong>{" "}
            {idea.targetUsers}
          </p>
        </div>

        {/* CTA Button */}
        <CardFooter>
          <Button asChild className="w-full">
            <Link href={`/ideas/${idea.id}`}>View Full PRD</Link>
          </Button>
        </CardFooter>
      </CardContent>
    </Card>
  );
}

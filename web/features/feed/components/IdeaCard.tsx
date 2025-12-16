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

import type { Idea } from "@/types";

interface IdeaCardProps {
  idea: Idea;
}

/**
 * Card component displaying a single idea with image, categories,
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
        {/* Header with title and categories */}
        <CardHeader>
          <CardTitle>{idea.title}</CardTitle>
          <div className="flex flex-wrap gap-2">
            {idea.categories.map((category, index) => (
              <Badge key={index} variant={category.variant as BadgeVariant}>
                {category.label}
              </Badge>
            ))}
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

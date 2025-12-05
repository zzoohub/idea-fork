import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Idea, IdeaCategory } from "@/types";

interface IdeaCardProps {
  idea: Idea;
}

const categoryColorMap: Record<IdeaCategory["color"], string> = {
  primary: "bg-primary text-primary-foreground",
  teal: "bg-badge-teal text-white",
  orange: "bg-badge-orange text-white",
  indigo: "bg-badge-indigo text-white",
};

export function IdeaCard({ idea }: IdeaCardProps) {
  return (
    <Card className="group flex flex-col overflow-hidden border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
      {/* Cover Image */}
      <div className="relative h-48 w-full overflow-hidden">
        <Image
          src={idea.image}
          alt={idea.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="line-clamp-2 text-lg font-semibold leading-tight">
          {idea.title}
        </CardTitle>

        {/* Category Tags */}
        <div className="flex flex-wrap gap-2 pt-2">
          {idea.categories.map((category, index) => (
            <Badge
              key={index}
              className={cn(
                "border-0 text-xs font-medium",
                categoryColorMap[category.color]
              )}
            >
              {category.name}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 text-sm">
        {/* Problem */}
        <div>
          <h4 className="mb-1 font-medium text-muted-foreground">Problem</h4>
          <p className="line-clamp-2 text-foreground">{idea.problem}</p>
        </div>

        {/* Solution */}
        <div>
          <h4 className="mb-1 font-medium text-muted-foreground">Solution</h4>
          <p className="line-clamp-2 text-foreground">{idea.solution}</p>
        </div>

        {/* Target Users */}
        <div>
          <h4 className="mb-1 font-medium text-muted-foreground">
            Target Users
          </h4>
          <p className="line-clamp-2 text-foreground">{idea.targetUsers}</p>
        </div>
      </CardContent>

      <CardFooter className="pt-3">
        <Button variant="outline" className="w-full">
          View Full PRD
        </Button>
      </CardFooter>
    </Card>
  );
}

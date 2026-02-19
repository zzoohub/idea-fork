import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";

export default function NotFound() {
  return (
    <PageContainer maxWidth="feed">
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <FileQuestion size={32} className="text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">
          Page not found
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          The page you&rsquo;re looking for doesn&rsquo;t exist or has been
          moved.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/">Browse feed</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/briefs">View briefs</Link>
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}

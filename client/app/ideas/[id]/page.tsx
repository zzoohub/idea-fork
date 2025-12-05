import { notFound } from "next/navigation";

interface IdeaDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function IdeaDetailPage({ params }: IdeaDetailPageProps) {
  const { id } = await params;

  // TODO: Fetch idea data from API
  // For now, show a placeholder
  if (!id) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 lg:px-8">
        <h1 className="text-3xl font-bold">Idea Detail</h1>
        <p className="mt-4 text-muted-foreground">
          Viewing idea with ID: {id}
        </p>
        <p className="mt-2 text-muted-foreground">
          This page will display the full PRD for the selected idea.
        </p>
      </main>
    </div>
  );
}

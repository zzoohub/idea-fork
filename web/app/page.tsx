import { Header, SearchFilters, IdeaCard, mockIdeas } from "@/features/feed";

export default function FeedPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 lg:px-8">
        {/* Hero Section */}
        <section className="mb-10 text-center">
          <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Daily AI-Generated Ideas
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Discover your next big product, powered by AI.
          </p>
        </section>

        {/* Search & Filters */}
        <section className="mb-8">
          <SearchFilters />
        </section>

        {/* Ideas Grid */}
        <section>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {mockIdeas.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

import { Header, SearchFilters, IdeaCard } from "@/features/feed";
import { mockIdeas } from "@/features/feed/data/mock-ideas";

/**
 * Hero section component displaying the page title and subtitle
 */
function HeroSection() {
  return (
    <div className="mt-8 flex flex-wrap justify-between gap-3 p-4">
      <div className="flex min-w-72 flex-col gap-3">
        <h1 className="text-4xl font-black leading-tight tracking-[-0.033em] text-white">
          Daily AI-Generated Ideas
        </h1>
        <p className="text-base font-normal leading-normal text-[var(--color-text-secondary)]">
          Discover your next big product, powered by AI.
        </p>
      </div>
    </div>
  );
}

/**
 * Ideas grid component displaying all idea cards
 */
function IdeasGrid() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-6 p-4 md:grid-cols-2 xl:grid-cols-3">
      {mockIdeas.map((idea) => (
        <IdeaCard key={idea.id} idea={idea} />
      ))}
    </div>
  );
}

/**
 * Home page - Daily Ideas Feed
 * Displays a grid of AI-generated product ideas with search and filtering capabilities
 */
export default function HomePage() {
  return (
    <>
      <Header />
      <HeroSection />
      <div className="mt-4">
        <SearchFilters />
      </div>
      <IdeasGrid />
    </>
  );
}

import { Suspense } from "react";
import { SearchResultsPage } from "@/src/views/search-results/ui/search-results-page";

export const dynamic = "force-dynamic";

export default function SearchPage() {
  return (
    <Suspense>
      <SearchResultsPage />
    </Suspense>
  );
}

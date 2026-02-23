import { Suspense } from "react";
import { BriefsListingPage } from "@/src/views/briefs-listing/ui";

export const dynamic = "force-dynamic";

export default function BriefsPage() {
  return (
    <Suspense>
      <BriefsListingPage />
    </Suspense>
  );
}

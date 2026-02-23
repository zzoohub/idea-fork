import { Suspense } from "react";
import { FeedPage } from "@/src/views/feed/ui";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <Suspense>
      <FeedPage />
    </Suspense>
  );
}

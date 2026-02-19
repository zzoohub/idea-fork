import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-container";
import { FeedList } from "@/components/feed/feed-list";

export const metadata: Metadata = {
  title: "Mealio — Real user complaints, ranked",
};

export default function FeedPage() {
  return (
    <PageContainer>
      <h1 className="sr-only">Feed</h1>
      <FeedList />
    </PageContainer>
  );
}

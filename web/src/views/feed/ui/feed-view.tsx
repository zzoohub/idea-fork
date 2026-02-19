import { PageContainer } from "@/shared/ui/page-container";
import { FeedList } from "@/widgets/feed";

export function FeedView() {
  return (
    <PageContainer>
      <h1 className="sr-only">Feed</h1>
      <FeedList />
    </PageContainer>
  );
}

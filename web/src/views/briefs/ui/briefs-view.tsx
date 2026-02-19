import { PageContainer } from "@/shared/ui/page-container";
import { BriefsListClient } from "@/widgets/brief-list";

export function BriefsView() {
  return (
    <PageContainer maxWidth="feed">
      <BriefsListClient />
    </PageContainer>
  );
}

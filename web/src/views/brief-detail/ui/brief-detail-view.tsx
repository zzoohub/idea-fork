import { notFound } from "next/navigation";
import { mockBriefDetails } from "@/shared/mocks/data";
import { PageContainer } from "@/shared/ui/page-container";
import { BriefDetailClient } from "@/widgets/brief-detail";

interface BriefDetailViewProps {
  id: string;
}

export function BriefDetailView({ id }: BriefDetailViewProps) {
  const brief = mockBriefDetails.find((b) => b.id === id);

  if (!brief) notFound();

  return (
    <PageContainer maxWidth="feed">
      <BriefDetailClient brief={brief} />
    </PageContainer>
  );
}

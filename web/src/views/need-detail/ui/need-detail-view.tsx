import { notFound } from "next/navigation";
import { mockNeedDetails } from "@/shared/mocks/data";
import { PageContainer } from "@/shared/ui/page-container";
import { NeedDetailClient } from "@/widgets/need-detail";

interface NeedDetailViewProps {
  id: string;
}

export function NeedDetailView({ id }: NeedDetailViewProps) {
  const need = mockNeedDetails.find((n) => n.id === id);

  if (!need) notFound();

  return (
    <PageContainer maxWidth="feed">
      <NeedDetailClient need={need} />
    </PageContainer>
  );
}

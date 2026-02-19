import type { Metadata } from "next";
import { mockNeedDetails } from "@/shared/mocks/data";
import { NeedDetailView } from "@/views/need-detail";

interface NeedDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: NeedDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const need = mockNeedDetails.find((n) => n.id === id);
  if (!need) return { title: "Need not found" };
  return {
    title: need.title,
    description: `${need.frequency} posts about "${need.title}". Trend: ${need.trend}.`,
    openGraph: {
      title: `${need.title} — Mealio`,
      description: `${need.frequency} posts. Intensity: ${need.intensity}/5. Trend: ${need.trend}.`,
    },
  };
}

export default async function NeedDetailPage({ params }: NeedDetailPageProps) {
  const { id } = await params;
  return <NeedDetailView id={id} />;
}

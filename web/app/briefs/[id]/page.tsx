import type { Metadata } from "next";
import { mockBriefDetails } from "@/shared/mocks/data";
import { BriefDetailView } from "@/views/brief-detail";

interface BriefDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: BriefDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const brief = mockBriefDetails.find((b) => b.id === id);
  if (!brief) return { title: "Brief not found" };
  const description = brief.sections[0]?.body.slice(0, 160) ?? "";
  return {
    title: brief.title,
    description,
    openGraph: {
      title: `${brief.title} — idea-fork`,
      description,
    },
  };
}

export default async function BriefDetailPage({
  params,
}: BriefDetailPageProps) {
  const { id } = await params;
  return <BriefDetailView id={id} />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { mockBriefDetails } from "@/lib/mock-data";
import { PageContainer } from "@/components/layout/page-container";
import { BriefDetailClient } from "./brief-detail-client";

interface BriefDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: BriefDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const brief = mockBriefDetails.find((b) => b.id === id);
  if (!brief) return { title: "Brief not found" };
  return {
    title: brief.title,
    description: brief.problemSummary.slice(0, 160),
    openGraph: {
      title: `${brief.title} — Mealio`,
      description: brief.problemSummary.slice(0, 160),
    },
  };
}

export default async function BriefDetailPage({
  params,
}: BriefDetailPageProps) {
  const { id } = await params;
  const brief = mockBriefDetails.find((b) => b.id === id);

  if (!brief) notFound();

  return (
    <PageContainer maxWidth="feed">
      <BriefDetailClient brief={brief} />
    </PageContainer>
  );
}

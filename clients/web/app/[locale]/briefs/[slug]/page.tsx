import { notFound } from "next/navigation";
import { fetchBrief } from "@/src/entities/brief/api";
import { BriefDetailPage } from "@/src/views/brief-detail/ui";

// Next.js 16: params is a Promise
export default async function BriefDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const result = await fetchBrief(slug).catch(() => null);
  if (!result?.data) notFound();

  return <BriefDetailPage brief={result.data} />;
}

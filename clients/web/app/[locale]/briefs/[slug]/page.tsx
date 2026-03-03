import { notFound } from "next/navigation";
import { queryBrief } from "@/src/shared/db/queries/briefs";
import { BriefDetailPage } from "@/src/views/brief-detail/ui";

// Next.js 16: params is a Promise
export default async function BriefDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const result = await queryBrief(slug);
    return <BriefDetailPage brief={result.data} />;
  } catch {
    notFound();
  }
}

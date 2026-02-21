import { use } from "react";
import { BriefDetailPage } from "@/src/views/brief-detail/ui";

export default function BriefDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return <BriefDetailPage slug={slug} />;
}

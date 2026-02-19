import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-container";
import { BriefsListClient } from "./briefs-list-client";

export const metadata: Metadata = {
  title: "AI Briefs",
  description:
    "Auto-generated opportunity assessments from clustered user needs across Reddit, Product Hunt, and app stores.",
};

export default function BriefsPage() {
  return (
    <PageContainer maxWidth="feed">
      <BriefsListClient />
    </PageContainer>
  );
}

import type { Metadata } from "next";
import { BriefsView } from "@/views/briefs";

export const metadata: Metadata = {
  title: "AI Briefs",
  description:
    "Auto-generated opportunity assessments from clustered user needs across Reddit, Product Hunt, and app stores.",
};

export default function BriefsPage() {
  return <BriefsView />;
}

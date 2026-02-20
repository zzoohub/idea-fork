import type { Metadata } from "next";
import { BriefsView } from "@/views/briefs";

export const metadata: Metadata = {
  title: "AI Briefs",
  description:
    "Synthesized product opportunities from real user complaints across Reddit, Product Hunt, and app stores.",
};

export default function BriefsPage() {
  return <BriefsView />;
}

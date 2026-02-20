import type { Metadata } from "next";
import { FeedView } from "@/views/feed";

export const metadata: Metadata = {
  title: "idea-fork — Real user complaints, real opportunities",
};

export default function FeedPage() {
  return <FeedView />;
}

import type { Metadata } from "next";
import { FeedView } from "@/views/feed";

export const metadata: Metadata = {
  title: "Mealio — Real user complaints, ranked",
};

export default function FeedPage() {
  return <FeedView />;
}

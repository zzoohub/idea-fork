import type { Metadata } from "next";
import { BookmarksView } from "@/views/bookmarks";

export const metadata: Metadata = {
  title: "Bookmarks",
};

export default function BookmarksPage() {
  return <BookmarksView />;
}

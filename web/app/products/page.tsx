import type { Metadata } from "next";
import { ProductsView } from "@/views/products";

export const metadata: Metadata = {
  title: "Products",
  description:
    "Trending products paired with user complaints from Reddit, Product Hunt, and app stores.",
};

export default function ProductsPage() {
  return <ProductsView />;
}

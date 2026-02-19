import type { Metadata } from "next";
import { ProductsView } from "@/views/products";

export const metadata: Metadata = {
  title: "Products",
  description:
    "Trending and newly launched products with aggregated user complaints from Reddit, Product Hunt, and app stores.",
};

export default function ProductsPage() {
  return <ProductsView />;
}

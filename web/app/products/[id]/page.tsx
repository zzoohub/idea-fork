import type { Metadata } from "next";
import { mockProductDetails } from "@/shared/mocks/data";
import { ProductDetailView } from "@/views/product-detail";

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = mockProductDetails.find((p) => p.id === id);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.description.slice(0, 160),
    openGraph: {
      title: `${product.name} — Mealio`,
      description: product.description.slice(0, 160),
    },
  };
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { id } = await params;
  return <ProductDetailView id={id} />;
}

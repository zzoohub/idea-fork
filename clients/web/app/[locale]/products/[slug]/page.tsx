import { notFound } from "next/navigation";
import { fetchProduct } from "@/src/entities/product/api";
import { ProductDetailPage } from "@/src/views/product-detail/ui";

// Next.js 16: params is a Promise
export default async function ProductDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const result = await fetchProduct(slug).catch(() => null);
  if (!result?.data) notFound();

  return <ProductDetailPage product={result.data} />;
}

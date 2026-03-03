import { notFound } from "next/navigation";
import { queryProduct } from "@/src/shared/db/queries/products";
import { ProductDetailPage } from "@/src/views/product-detail/ui";

// Next.js 16: params is a Promise
export default async function ProductDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const result = await queryProduct(slug);
    return <ProductDetailPage product={result.data} />;
  } catch {
    notFound();
  }
}

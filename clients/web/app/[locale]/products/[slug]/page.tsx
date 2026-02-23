import { ProductDetailPage } from "@/src/views/product-detail/ui";

// Next.js 16: params is a Promise
export default async function ProductDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ProductDetailPage slug={slug} />;
}

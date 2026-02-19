import { notFound } from "next/navigation";
import { mockProductDetails } from "@/shared/mocks/data";
import { PageContainer } from "@/shared/ui/page-container";
import { ProductDetailClient } from "@/widgets/product-detail";

interface ProductDetailViewProps {
  id: string;
}

export function ProductDetailView({ id }: ProductDetailViewProps) {
  const product = mockProductDetails.find((p) => p.id === id);

  if (!product) notFound();

  return (
    <PageContainer maxWidth="feed">
      <ProductDetailClient product={product} />
    </PageContainer>
  );
}

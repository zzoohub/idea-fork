import { PageContainer } from "@/shared/ui/page-container";
import { ProductsListClient } from "@/widgets/product-list";

export function ProductsView() {
  return (
    <PageContainer maxWidth="feed">
      <ProductsListClient />
    </PageContainer>
  );
}

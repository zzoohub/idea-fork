import { Suspense } from "react";
import { ProductsListingPage } from "@/src/views/products-listing/ui";

export const dynamic = "force-dynamic";

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsListingPage />
    </Suspense>
  );
}

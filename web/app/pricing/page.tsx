import type { Metadata } from "next";
import { PricingView } from "@/views/pricing";

export const metadata: Metadata = {
  title: "Pricing",
};

export default function PricingPage() {
  return <PricingView />;
}

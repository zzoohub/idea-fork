import type { Metadata } from "next";
import { TrackingView } from "@/views/tracking";

export const metadata: Metadata = {
  title: "Tracking",
};

export default function TrackingPage() {
  return <TrackingView />;
}

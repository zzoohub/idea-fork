import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { UserProvider } from "@/context/user-context";
import { SkipToContent } from "@/components/layout/skip-to-content";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { TierSwitcher } from "@/components/layout/tier-switcher";
import { NetworkStatus } from "@/components/network-status";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Mealio — Real user complaints, ranked",
    template: "%s — Mealio",
  },
  description:
    "Discover what users are complaining about across Reddit, Product Hunt, and app stores. Find your next product idea from real pain points.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased flex min-h-svh flex-col`}
      >
        <UserProvider>
          <TooltipProvider>
            <SkipToContent />
            <Header />
            {children}
            <Footer />
            <Toaster position="bottom-right" />
            <NetworkStatus />
            <TierSwitcher />
          </TooltipProvider>
        </UserProvider>
      </body>
    </html>
  );
}

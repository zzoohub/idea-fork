import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/app/providers";
import { SkipToContent } from "@/shared/ui/skip-to-content";
import { Header } from "@/widgets/header";
import { Footer } from "@/widgets/footer";
import "@/app/globals.css";

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
        <Providers>
          <SkipToContent />
          <Header />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

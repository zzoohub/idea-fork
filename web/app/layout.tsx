import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/src/app/globals.css";
import { NavigationBar } from "@/src/widgets/navigation/ui";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Idea Fork",
  description:
    "Discover product opportunities from real user complaints across Reddit, App Store, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${inter.variable} antialiased`}
      >
        {/* Skip to content — first focusable element for keyboard users */}
        <a
          href="#main-content"
          className={[
            "sr-only focus:not-sr-only",
            "fixed top-space-sm left-space-sm z-[100]",
            "rounded-card bg-interactive px-space-lg py-space-sm",
            "text-body-sm font-semibold text-white",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
          ].join(" ")}
        >
          Skip to content
        </a>

        <NavigationBar />

        {/* Main content area with padding for fixed nav bars */}
        <main
          id="main-content"
          className={[
            /* Desktop: account for fixed 56px top bar */
            "md:pt-[56px]",
            /* Mobile: sticky top bar handled by the browser, bottom tab bar needs clearance */
            "pb-[72px] md:pb-0",
          ].join(" ")}
        >
          {children}
        </main>
      </body>
    </html>
  );
}

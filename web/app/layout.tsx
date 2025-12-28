import type { Metadata } from "next";
import { Manrope } from "next/font/google";

import { Providers } from "@/providers/Providers";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Daily Ideas Feed - Idea Fork",
  description: "Discover your next big product, powered by AI.",
  keywords: ["ideas", "product", "AI", "startup", "innovation"],
  authors: [{ name: "Idea Fork" }],
  openGraph: {
    title: "Daily Ideas Feed - Idea Fork",
    description: "Discover your next big product, powered by AI.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <Providers>
        <body className={`${manrope.variable} font-sans antialiased`}>
          <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
            <div className="flex h-full grow flex-col">
              <div className="flex flex-1 justify-center py-5">
                <div className="flex w-full max-w-6xl flex-col px-4">
                  {children}
                </div>
              </div>
            </div>
          </div>
        </body>
      </Providers>
    </html>
  );
}

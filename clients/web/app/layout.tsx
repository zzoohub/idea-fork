// Root layout — minimal shell. The actual layout with html/body/providers
// lives in app/[locale]/layout.tsx. This file exists only because Next.js
// requires a root layout when using route groups.

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

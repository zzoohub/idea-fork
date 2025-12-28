export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Override parent layout styles for full-screen login
  return <div className="fixed inset-0">{children}</div>;
}

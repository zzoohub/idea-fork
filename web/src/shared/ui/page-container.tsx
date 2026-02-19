import { cn } from "@/shared/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: "content" | "feed";
  className?: string;
}

export function PageContainer({
  children,
  maxWidth = "content",
  className,
}: PageContainerProps) {
  return (
    <main
      id="main-content"
      className={cn(
        "mx-auto w-full px-4 py-6 sm:px-6 lg:px-8",
        maxWidth === "content" ? "max-w-[1280px]" : "max-w-[720px]",
        className
      )}
    >
      {children}
    </main>
  );
}

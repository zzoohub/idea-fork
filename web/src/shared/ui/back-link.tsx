import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface BackLinkProps {
  href: string;
  label: string;
}

export function BackLink({ href, label }: BackLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-11"
    >
      <ChevronLeft size={16} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}

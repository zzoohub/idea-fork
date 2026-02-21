import Link from "next/link";
import { Icon } from "./icon";

interface BackLinkProps {
  href: string;
  label: string;
  className?: string;
}

export function BackLink({ href, label, className }: BackLinkProps) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center gap-space-xs",
        "text-body-sm text-text-secondary",
        "hover:text-text-primary",
        "transition-colors no-underline",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        transitionDuration: "var(--duration-fast)",
        transitionTimingFunction: "var(--ease-out)",
      }}
    >
      <Icon name="arrow-left" size={16} />
      {label}
    </Link>
  );
}

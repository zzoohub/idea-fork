import Link from "next/link";
import { type ReactNode } from "react";

interface CardProps {
  as?: "article" | "div";
  href?: string;
  className?: string;
  children: ReactNode;
}

const CARD_CLASSES = [
  "block",
  "bg-bg-secondary border border-border rounded-card p-card-padding",
  "transition-[box-shadow,transform]",
  "hover:shadow-md hover:-translate-y-px",
].join(" ");

const TRANSITION_STYLE = {
  transitionDuration: "var(--duration-fast)",
  transitionTimingFunction: "var(--ease-out)",
};

export function Card({
  as: Tag = "article",
  href,
  className,
  children,
}: CardProps) {
  const classes = [CARD_CLASSES, className].filter(Boolean).join(" ");

  if (href) {
    return (
      <Link
        href={href}
        className={[classes, "no-underline"].join(" ")}
        style={TRANSITION_STYLE}
      >
        <Tag className="contents">{children}</Tag>
      </Link>
    );
  }

  return (
    <Tag className={classes} style={TRANSITION_STYLE}>
      {children}
    </Tag>
  );
}

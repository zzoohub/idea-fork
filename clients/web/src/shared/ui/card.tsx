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
  "bg-white dark:bg-[#1b2531]",
  "border border-slate-200 dark:border-[#283039]",
  "rounded-xl p-5",
  "transition-colors",
  "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10",
].join(" ");

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
      >
        <Tag className="contents">{children}</Tag>
      </Link>
    );
  }

  return (
    <Tag className={classes}>
      {children}
    </Tag>
  );
}

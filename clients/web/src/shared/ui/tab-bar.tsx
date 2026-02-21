import Link from "next/link";
import { Icon } from "./icon";

interface TabItem {
  href: string;
  label: string;
  icon?: string;
  active?: boolean;
}

interface TabBarProps {
  items: TabItem[];
  variant?: "desktop" | "mobile";
  className?: string;
}

export function TabBar({ items, variant = "desktop", className }: TabBarProps) {
  if (variant === "mobile") {
    return (
      <nav
        className={[
          "fixed inset-x-0 bottom-0 z-50",
          "flex items-center justify-around",
          "h-[56px] border-t border-border bg-bg-secondary",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="Navigation"
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={[
              "flex flex-col items-center justify-center gap-[2px]",
              "min-w-[48px] min-h-[48px] px-space-sm",
              "text-caption no-underline transition-colors",
              item.active
                ? "text-interactive font-semibold"
                : "text-text-tertiary",
            ].join(" ")}
            style={{
              transitionDuration: "var(--duration-fast)",
              transitionTimingFunction: "var(--ease-out)",
            }}
          >
            {item.icon && <Icon name={item.icon} size={22} />}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav
      className={[
        "flex items-center gap-space-xs border-b border-border",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Navigation"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={[
            "relative px-space-lg py-space-sm",
            "text-body-sm font-semibold no-underline transition-colors",
            item.active
              ? "text-interactive"
              : "text-text-secondary hover:text-text-primary",
          ].join(" ")}
          style={{
            transitionDuration: "var(--duration-fast)",
            transitionTimingFunction: "var(--ease-out)",
          }}
        >
          {item.label}
          {item.active && (
            <span
              className="absolute inset-x-0 bottom-[-1px] h-[2px] bg-interactive"
              aria-hidden="true"
            />
          )}
        </Link>
      ))}
    </nav>
  );
}

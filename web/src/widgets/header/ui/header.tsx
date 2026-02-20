"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Newspaper, FileText, Package } from "lucide-react";
import { cn } from "@/shared/lib/utils";

const navItems = [
  { href: "/", label: "Feed", icon: Newspaper },
  { href: "/briefs", label: "Briefs", icon: FileText },
  { href: "/products", label: "Products", icon: Package },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight min-h-11 flex items-center"
        >
          idea-fork
        </Link>

        <nav
          className="hidden sm:flex items-center gap-1"
          aria-label="Primary navigation"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors min-h-11 flex items-center",
                isActive(pathname, item.href)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Spacer on mobile so logo is left-aligned */}
        <div className="sm:hidden w-11" />
      </div>
    </header>
  );
}

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 flex h-14 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      aria-label="Primary navigation"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
              active
                ? "text-foreground"
                : "text-muted-foreground"
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={20} aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

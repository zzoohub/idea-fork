"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Logo icon component - Idea Fork brand mark
 */
function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        clipRule="evenodd"
        d="M39.475 21.6262C40.358 21.4363 40.6863 21.5589 40.7581 21.5934C40.7876 21.655 40.8547 21.857 40.8082 22.3336C40.7408 23.0255 40.4502 24.0046 39.8572 25.2301C38.6799 27.6631 36.5085 30.6631 33.5858 33.5858C30.6631 36.5085 27.6632 38.6799 25.2301 39.8572C24.0046 40.4502 23.0255 40.7407 22.3336 40.8082C21.8571 40.8547 21.6551 40.7875 21.5934 40.7581C21.5589 40.6863 21.4363 40.358 21.6262 39.475C21.8562 38.4054 22.4689 36.9657 23.5038 35.2817C24.7575 33.2417 26.5497 30.9744 28.7621 28.762C30.9744 26.5497 33.2417 24.7574 35.2817 23.5037C36.9657 22.4689 38.4054 21.8562 39.475 21.6262ZM4.41189 29.2403L18.7597 43.5881C19.8813 44.7097 21.4027 44.9179 22.7217 44.7893C24.0585 44.659 25.5148 44.1631 26.9723 43.4579C29.9052 42.0387 33.2618 39.5667 36.4142 36.4142C39.5667 33.2618 42.0387 29.9052 43.4579 26.9723C44.1631 25.5148 44.659 24.0585 44.7893 22.7217C44.9179 21.4027 44.7097 19.8813 43.5881 18.7597L29.2403 4.41187C27.8527 3.02428 25.8765 3.02573 24.2861 3.36776C22.6081 3.72863 20.7334 4.58419 18.8396 5.74801C16.4978 7.18716 13.9881 9.18353 11.5858 11.5858C9.18354 13.988 7.18717 16.4978 5.74802 18.8396C4.58421 20.7334 3.72865 22.6081 3.36778 24.2861C3.02574 25.8765 3.02429 27.8527 4.41189 29.2403Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}

/**
 * Navigation items configuration
 */
const navItems = [
  { label: "Feed", href: "/", isActive: true },
  { label: "My Ideas", href: "/my-ideas", isActive: false },
];

/**
 * Header component with logo, navigation, and user menu.
 * Includes responsive mobile menu using Sheet component.
 */
export function Header() {
  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-[var(--color-border)] px-4 py-3 sm:px-6 lg:px-8">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-4 text-white">
        <LogoIcon className="size-6 text-[var(--color-primary)]" />
        <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">
          Idea Fork
        </h2>
      </Link>

      {/* Desktop Navigation */}
      <div className="hidden flex-1 justify-end gap-8 md:flex">
        <nav className="flex items-center gap-9">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-medium leading-normal transition-colors ${
                item.isActive
                  ? "text-white"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Button size="default">Submit Idea</Button>

        <Avatar>
          <AvatarImage
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA4-0008E1-kLEg_-_Cw3ASuCy4NxQBs00xFa2qdPLnQ53QHgq_QMIIcBjxh2_An-_HWMtCvehniqCp8yViRpQBeAF-4kUzZc9GI_c0GAdYAY0s_mCvBn6aSokmW7PtZl0fe-i3N0a3WCU3G2ZoIQn1nKNU-EOOo7dSlF3q-ElSTQzsgqBz7bdo3ZqQ2hwy2sXGcWDwXEKo4mln3qCmAiuIgjJWLc2ntyPfjeYJZfrMHPNrMgKnNoaMMEsrkqbD0LW2ZXQd7XHZX_e9"
            alt="User profile avatar"
          />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      </div>

      {/* Mobile Menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[300px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              <LogoIcon className="size-5 text-[var(--color-primary)]" />
              Idea Fork
            </SheetTitle>
          </SheetHeader>

          <nav className="mt-8 flex flex-col gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-base font-medium transition-colors ${
                  item.isActive
                    ? "text-white"
                    : "text-[var(--color-text-secondary)] hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-8">
            <Button className="w-full">Submit Idea</Button>
          </div>

          <div className="mt-8 flex items-center gap-3 border-t border-[var(--color-border)] pt-8">
            <Avatar>
              <AvatarImage
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuA4-0008E1-kLEg_-_Cw3ASuCy4NxQBs00xFa2qdPLnQ53QHgq_QMIIcBjxh2_An-_HWMtCvehniqCp8yViRpQBeAF-4kUzZc9GI_c0GAdYAY0s_mCvBn6aSokmW7PtZl0fe-i3N0a3WCU3G2ZoIQn1nKNU-EOOo7dSlF3q-ElSTQzsgqBz7bdo3ZqQ2hwy2sXGcWDwXEKo4mln3qCmAiuIgjJWLc2ntyPfjeYJZfrMHPNrMgKnNoaMMEsrkqbD0LW2ZXQd7XHZX_e9"
                alt="User profile avatar"
              />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <span className="text-sm text-white">User Name</span>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

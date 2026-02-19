"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User as UserIcon,
  Bookmark,
  Radar,
  Settings,
  LogOut,
  LogIn,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useUser } from "@/entities/user";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/ui/sheet";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";

const navItems = [
  { href: "/", label: "Feed" },
  { href: "/briefs", label: "Briefs" },
];

export function Header() {
  const pathname = usePathname();
  const { user, isLoggedIn } = useUser();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const avatarInitial = user?.name?.[0]?.toUpperCase() ?? "?";

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="text-lg font-bold tracking-tight min-h-11 flex items-center"
        >
          Mealio
        </Link>

        {/* Desktop nav tabs */}
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
                isActive(item.href)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop avatar menu */}
        <div className="hidden sm:block">
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-full"
                  aria-label="User menu"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {avatarInitial}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/bookmarks" className="cursor-pointer">
                    <Bookmark size={16} />
                    Bookmarks
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/tracking" className="cursor-pointer">
                    <Radar size={16} />
                    Tracking
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/account" className="cursor-pointer">
                    <Settings size={16} />
                    Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <LogOut size={16} />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-11 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogIn size={16} />
              Sign in
            </Link>
          )}
        </div>

        {/* Mobile avatar / sheet menu */}
        <div className="sm:hidden">
          {isLoggedIn ? (
            <Sheet>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-full"
                  aria-label="User menu"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {avatarInitial}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <SheetHeader>
                  <SheetTitle className="text-left">{user?.name}</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 mt-4" aria-label="User menu">
                  <Link
                    href="/bookmarks"
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent min-h-11"
                  >
                    <Bookmark size={16} />
                    Bookmarks
                  </Link>
                  <Link
                    href="/tracking"
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent min-h-11"
                  >
                    <Radar size={16} />
                    Tracking
                  </Link>
                  <Link
                    href="/account"
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent min-h-11"
                  >
                    <Settings size={16} />
                    Account
                  </Link>
                  <div className="border-t my-2" />
                  <button
                    type="button"
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent min-h-11 w-full text-left"
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </nav>
              </SheetContent>
            </Sheet>
          ) : (
            <Link
              href="/login"
              className="flex h-11 w-11 items-center justify-center rounded-full"
              aria-label="Sign in"
            >
              <UserIcon size={20} className="text-muted-foreground" />
            </Link>
          )}
        </div>
      </div>

      {/* Mobile tab bar */}
      <nav
        className="sm:hidden flex border-t"
        aria-label="Primary navigation"
      >
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex-1 py-2 text-center text-sm font-medium transition-colors min-h-11 flex items-center justify-center",
              isActive(item.href)
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground"
            )}
            aria-current={isActive(item.href) ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

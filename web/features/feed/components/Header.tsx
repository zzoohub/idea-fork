"use client";

import Link from "next/link";
import { Menu, LogOut, User, Settings } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { LogoIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { AuthUser } from "@/types/auth";

/**
 * Navigation items configuration
 */
const NAV_ITEMS = [
  { label: "Feed", href: "/", isActive: true },
  { label: "My Ideas", href: "/my-ideas", isActive: false },
] as const;

/**
 * User avatar component with fallback
 */
interface UserAvatarProps {
  user: AuthUser;
  className?: string;
}

function UserAvatar({ user, className }: UserAvatarProps) {
  const initials = user.name?.[0]?.toUpperCase() || "U";

  return (
    <Avatar className={className}>
      <AvatarImage
        src={user.avatarUrl || undefined}
        alt={user.name || "User avatar"}
      />
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}

/**
 * User info display component
 */
function UserInfo({ user }: { user: AuthUser }) {
  return (
    <div>
      <p className="text-sm font-medium text-white">{user.name}</p>
      <p className="text-xs text-[var(--color-text-secondary)]">{user.email}</p>
    </div>
  );
}

/**
 * Desktop user dropdown menu
 */
interface UserMenuProps {
  user: AuthUser;
  onLogout: () => void;
}

function UserMenu({ user, onLogout }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--color-background)]"
        >
          <UserAvatar user={user} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <UserInfo user={user} />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onLogout}
          className="cursor-pointer text-red-400 focus:text-red-400"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Navigation links component
 */
function NavLinks({ className }: { className?: string }) {
  return (
    <nav className={className}>
      {NAV_ITEMS.map((item) => (
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
  );
}

/**
 * Mobile navigation menu content
 */
interface MobileMenuContentProps {
  user: AuthUser | null;
  isAuthenticated: boolean;
  onLogout: () => void;
}

function MobileMenuContent({
  user,
  isAuthenticated,
  onLogout,
}: MobileMenuContentProps) {
  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-3">
          <LogoIcon className="size-5 text-[var(--color-primary)]" />
          Idea Fork
        </SheetTitle>
      </SheetHeader>

      <nav className="mt-8 flex flex-col gap-4">
        {NAV_ITEMS.map((item) => (
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

      {isAuthenticated && user ? (
        <div className="mt-8 border-t border-[var(--color-border)] pt-8">
          <div className="flex items-center gap-3">
            <UserAvatar user={user} />
            <UserInfo user={user} />
          </div>
          <Button
            variant="ghost"
            className="mt-4 w-full justify-start text-red-400 hover:text-red-400"
            onClick={onLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      ) : (
        <div className="mt-8 border-t border-[var(--color-border)] pt-8">
          <Button asChild className="w-full">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      )}
    </>
  );
}

/**
 * Loading placeholder for auth state
 */
function AuthLoadingPlaceholder() {
  return (
    <div
      className="h-10 w-10 animate-pulse rounded-full bg-[var(--color-surface)]"
      aria-label="Loading user"
    />
  );
}

/**
 * Header component with logo, navigation, and user menu.
 * Includes responsive mobile menu using Sheet component.
 */
export function Header() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

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
        <NavLinks className="flex items-center gap-9" />

        <Button size="default">Submit Idea</Button>

        {isLoading ? (
          <AuthLoadingPlaceholder />
        ) : isAuthenticated && user ? (
          <UserMenu user={user} onLogout={logout} />
        ) : (
          <Button asChild size="default" variant="secondary">
            <Link href="/login">Sign in</Link>
          </Button>
        )}
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
          <MobileMenuContent
            user={user}
            isAuthenticated={isAuthenticated}
            onLogout={logout}
          />
        </SheetContent>
      </Sheet>
    </header>
  );
}

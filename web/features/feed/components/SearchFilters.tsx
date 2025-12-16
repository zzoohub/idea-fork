"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Sort options for the ideas feed
 */
type SortOption = "newest" | "oldest" | "popular" | "alphabetical";

interface CategoryOption {
  value: string;
  label: string;
}

interface SortOptionItem {
  value: SortOption;
  label: string;
}

/**
 * Available category options for filtering
 */
const categories: CategoryOption[] = [
  { value: "all", label: "All Categories" },
  { value: "ai", label: "AI" },
  { value: "healthtech", label: "HealthTech" },
  { value: "fintech", label: "FinTech" },
  { value: "edtech", label: "EdTech" },
  { value: "logistics", label: "Logistics" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "developer-tools", label: "Developer Tools" },
  { value: "saas", label: "SaaS" },
];

/**
 * Available sort options
 */
const sortOptions: SortOptionItem[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "popular", label: "Most Popular" },
  { value: "alphabetical", label: "Alphabetical" },
];

interface SearchFiltersProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  category?: string;
  onCategoryChange?: (category: string) => void;
  sortBy?: string;
  onSortChange?: (sort: string) => void;
}

/**
 * Search and filter bar component for the ideas feed.
 * Includes search input, category dropdown, and sort dropdown.
 */
export function SearchFilters({
  searchQuery = "",
  onSearchChange,
  category = "all",
  onCategoryChange,
  sortBy = "newest",
  onSortChange,
}: SearchFiltersProps) {
  return (
    <div className="flex flex-col items-center gap-4 border-y border-[var(--color-border)] px-4 py-3 md:flex-row">
      {/* Search Input */}
      <div className="w-full flex-1">
        <label className="flex h-12 w-full min-w-40 flex-col">
          <div className="flex h-full w-full flex-1 items-stretch rounded-lg">
            <div className="flex items-center justify-center rounded-l-lg border-r-0 bg-[var(--color-input)] pl-4 text-[var(--color-text-secondary)]">
              <Search className="h-5 w-5" />
            </div>
            <Input
              className="h-full rounded-l-none border-l-0 pl-2"
              placeholder="Search for ideas or keywords..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
            />
          </div>
        </label>
      </div>

      {/* Filter Dropdowns */}
      <div className="flex w-full shrink-0 gap-3 md:w-auto">
        {/* Category Select */}
        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-full md:w-auto">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort Select */}
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-full whitespace-nowrap md:w-auto">
            <span className="mr-1 text-[var(--color-text-secondary)]">
              Sort By:
            </span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

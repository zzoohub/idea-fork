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
type SortOption = "newest" | "oldest" | "popular";

interface FilterOption {
  value: string;
  label: string;
}

interface SortOptionItem {
  value: SortOption;
  label: string;
}

/**
 * Function options - what the product does
 */
const functions: FilterOption[] = [
  { value: "all", label: "All Functions" },
  { value: "create", label: "Create" },
  { value: "automate", label: "Automate" },
  { value: "analyze", label: "Analyze" },
  { value: "connect", label: "Connect" },
  { value: "sell", label: "Sell" },
  { value: "learn", label: "Learn" },
  { value: "manage", label: "Manage" },
  { value: "protect", label: "Protect" },
];

/**
 * Industry options - target industry/domain
 */
const industries: FilterOption[] = [
  { value: "all", label: "All Industries" },
  { value: "healthcare", label: "Healthcare" },
  { value: "finance", label: "Finance" },
  { value: "education", label: "Education" },
  { value: "e-commerce", label: "E-commerce" },
  { value: "entertainment", label: "Entertainment" },
  { value: "technology", label: "Technology" },
  { value: "retail", label: "Retail" },
  { value: "real-estate", label: "Real Estate" },
  { value: "travel", label: "Travel" },
  { value: "food", label: "Food & Beverage" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "legal", label: "Legal" },
  { value: "marketing", label: "Marketing" },
  { value: "media", label: "Media" },
];

/**
 * Available sort options
 */
const sortOptions: SortOptionItem[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "popular", label: "Most Popular" },
];

interface SearchFiltersProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  functionSlug?: string;
  onFunctionChange?: (func: string) => void;
  industrySlug?: string;
  onIndustryChange?: (industry: string) => void;
  sortBy?: string;
  onSortChange?: (sort: string) => void;
}

/**
 * Search and filter bar component for the ideas feed.
 * Includes search input, function filter, industry filter, and sort dropdown.
 */
export function SearchFilters({
  searchQuery = "",
  onSearchChange,
  functionSlug = "all",
  onFunctionChange,
  industrySlug = "all",
  onIndustryChange,
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
        {/* Function Select */}
        <Select value={functionSlug} onValueChange={onFunctionChange}>
          <SelectTrigger className="w-full md:w-auto">
            <SelectValue placeholder="Function" />
          </SelectTrigger>
          <SelectContent>
            {functions.map((func) => (
              <SelectItem key={func.value} value={func.value}>
                {func.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Industry Select */}
        <Select value={industrySlug} onValueChange={onIndustryChange}>
          <SelectTrigger className="w-full md:w-auto">
            <SelectValue placeholder="Industry" />
          </SelectTrigger>
          <SelectContent>
            {industries.map((industry) => (
              <SelectItem key={industry.value} value={industry.value}>
                {industry.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort Select */}
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-full whitespace-nowrap md:w-auto">
            <span className="mr-1 text-[var(--color-text-secondary)]">
              Sort:
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

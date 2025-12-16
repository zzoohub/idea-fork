/**
 * Global types - Domain entities and core application types only
 */

/**
 * Category badge representing an idea category
 */
export interface CategoryBadge {
  label: string;
  variant: "primary" | "teal" | "orange" | "indigo" | "secondary";
}

/**
 * Idea entity representing a product idea (API model)
 */
export interface Idea {
  id: string;
  title: string;
  imageUrl: string;
  imageAlt: string;
  categories: CategoryBadge[];
  problem: string;
  solution: string;
  targetUsers: string;
  createdAt: string;
  popularity?: number;
}

/**
 * User entity (API model)
 */
export interface User {
  id: string;
  name: string;
  avatarUrl: string;
}

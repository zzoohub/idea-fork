/**
 * Global types - Domain entities and core application types only
 */

/**
 * Function type representing what the product does
 */
export type FunctionType =
  | "create"
  | "automate"
  | "analyze"
  | "connect"
  | "sell"
  | "learn"
  | "manage"
  | "protect";

/**
 * Industry type representing the target industry
 */
export type IndustryType =
  | "healthcare"
  | "finance"
  | "education"
  | "e-commerce"
  | "entertainment"
  | "technology"
  | "retail"
  | "real-estate"
  | "travel"
  | "food"
  | "manufacturing"
  | "legal"
  | "marketing"
  | "media";

/**
 * Target user type representing the primary audience
 */
export type TargetUserType =
  | "developers"
  | "creators"
  | "marketers"
  | "businesses"
  | "consumers"
  | "students"
  | "professionals"
  | "enterprises"
  | "freelancers"
  | "startups";

/**
 * Badge variant type for styling
 */
export type BadgeVariant = "primary" | "teal" | "orange" | "indigo" | "secondary";

/**
 * Idea entity representing a product idea (API model)
 */
export interface Idea {
  id: string;
  title: string;
  imageUrl: string;
  imageAlt: string;
  functionSlug: FunctionType;
  industrySlug?: IndustryType;
  targetUserSlug?: TargetUserType;
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

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
  image_url: string;
  image_alt: string;
  function_slug: FunctionType;
  industry_slug?: IndustryType;
  target_user_slug?: TargetUserType;
  problem: string;
  solution: string;
  target_users: string;
  created_at: string;
  popularity?: number;
}

/**
 * User entity (API model)
 */
export interface User {
  id: string;
  name: string;
  avatar_url: string;
}

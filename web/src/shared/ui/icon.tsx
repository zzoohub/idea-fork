import {
  House,
  Sparkles,
  Package,
  GitFork,
  Search,
  Sun,
  Moon,
  User,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Bookmark,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CircleCheck,
  Info,
  TriangleAlert,
  Activity,
  Lightbulb,
  MessagesSquare,
  Smartphone,
  Rocket,
  SlidersHorizontal,
  Compass,
  TrendingUp,
  TrendingDown,
  LayoutGrid,
  Globe,
  BellRing,
  MessageSquareWarning,
  Flame,
  MessageCircle,
  ExternalLink,
  Zap,
  ArrowUpDown,
  X,
  ThumbsUp,
  ThumbsDown,
  Tag,
  Clock,
  FileText,
  BadgeCheck,
  CreditCard,
  Briefcase,
  Cloud,
  Terminal,
  ShoppingCart,
  Landmark,
  Heart,
  GraduationCap,
  CircleCheckBig,
  Frown,
  HelpCircle,
  ChartLine,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  house: House,
  sparkles: Sparkles,
  package: Package,
  "git-fork": GitFork,
  search: Search,
  sun: Sun,
  moon: Moon,
  user: User,
  "chevron-down": ChevronDown,
  "chevron-up": ChevronUp,
  "chevron-right": ChevronRight,
  bookmark: Bookmark,
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  "arrow-up": ArrowUp,
  "circle-check": CircleCheck,
  info: Info,
  "triangle-alert": TriangleAlert,
  /* alias used by error-state and other components */
  warning: TriangleAlert,
  activity: Activity,
  lightbulb: Lightbulb,
  "messages-square": MessagesSquare,
  smartphone: Smartphone,
  rocket: Rocket,
  "sliders-horizontal": SlidersHorizontal,
  compass: Compass,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  "layout-grid": LayoutGrid,
  globe: Globe,
  "bell-ring": BellRing,
  "message-square-warning": MessageSquareWarning,
  flame: Flame,
  "message-circle": MessageCircle,
  "external-link": ExternalLink,
  zap: Zap,
  "arrow-up-down": ArrowUpDown,
  x: X,
  /* alias used for close/dismiss actions */
  close: X,
  "thumbs-up": ThumbsUp,
  "thumbs-down": ThumbsDown,
  tag: Tag,
  clock: Clock,
  "file-text": FileText,
  "badge-check": BadgeCheck,
  "credit-card": CreditCard,
  briefcase: Briefcase,
  cloud: Cloud,
  terminal: Terminal,
  "shopping-cart": ShoppingCart,
  landmark: Landmark,
  heart: Heart,
  "graduation-cap": GraduationCap,
  "circle-check-big": CircleCheckBig,
  frown: Frown,
  "help-circle": HelpCircle,
  "chart-line": ChartLine,
};

/* Custom SVG icons that Lucide doesn't have */
const CUSTOM_ICONS: Record<string, string> = {
  reddit:
    "M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.066 13.06c.058.33.088.668.088 1.01 0 3.48-4.054 6.3-9.054 6.3s-9.054-2.82-9.054-6.3c0-.342.03-.68.088-1.01a1.856 1.856 0 0 1-.788-1.518c0-1.025.832-1.857 1.857-1.857.497 0 .949.196 1.282.514 1.463-1.02 3.44-1.662 5.6-1.726l1.15-5.18a.31.31 0 0 1 .37-.235l3.637.764a1.332 1.332 0 0 1 1.242-.852c.738 0 1.336.598 1.336 1.336 0 .737-.598 1.335-1.336 1.335a1.333 1.333 0 0 1-1.328-1.216l-3.27-.687-1.025 4.612c2.1.085 4.012.728 5.44 1.725a1.85 1.85 0 0 1 1.283-.514c1.024 0 1.856.832 1.856 1.857 0 .63-.314 1.187-.795 1.524zM8.15 12.438c-.738 0-1.336.598-1.336 1.335 0 .738.598 1.336 1.336 1.336.737 0 1.335-.598 1.335-1.336 0-.737-.598-1.335-1.335-1.335zm7.635 1.335c0-.737-.598-1.335-1.336-1.335-.737 0-1.335.598-1.335 1.335 0 .738.598 1.336 1.335 1.336.738 0 1.336-.598 1.336-1.336zm-1.23 2.81a.248.248 0 0 0-.345.058 3.43 3.43 0 0 1-2.71 1.33 3.43 3.43 0 0 1-2.71-1.33.248.248 0 1 0-.403.288 3.93 3.93 0 0 0 3.113 1.538 3.93 3.93 0 0 0 3.113-1.538.248.248 0 0 0-.058-.345z",
  "app-store":
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-2 14.5v-9l7 4.5-7 4.5z",
};

interface IconProps {
  name: string;
  size?: number;
  className?: string;
  filled?: boolean;
  "aria-hidden"?: boolean;
}

export function Icon({
  name,
  size = 20,
  className,
  filled = false,
  "aria-hidden": ariaHidden = true,
}: IconProps) {
  /* Lucide icon */
  const LucideComponent = ICON_MAP[name];
  if (LucideComponent) {
    return (
      <LucideComponent
        width={size}
        height={size}
        className={className}
        aria-hidden={ariaHidden}
        {...(filled
          ? { fill: "currentColor", strokeWidth: 0 }
          : {})}
      />
    );
  }

  /* Custom SVG fallback */
  const path = CUSTOM_ICONS[name];
  if (path) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden={ariaHidden}
      >
        <path d={path} />
      </svg>
    );
  }

  return null;
}

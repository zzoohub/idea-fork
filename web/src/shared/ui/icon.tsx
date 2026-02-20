const ICONS: Record<string, string> = {
  reddit:
    "M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.066 13.06c.058.33.088.668.088 1.01 0 3.48-4.054 6.3-9.054 6.3s-9.054-2.82-9.054-6.3c0-.342.03-.68.088-1.01a1.856 1.856 0 0 1-.788-1.518c0-1.025.832-1.857 1.857-1.857.497 0 .949.196 1.282.514 1.463-1.02 3.44-1.662 5.6-1.726l1.15-5.18a.31.31 0 0 1 .37-.235l3.637.764a1.332 1.332 0 0 1 1.242-.852c.738 0 1.336.598 1.336 1.336 0 .737-.598 1.335-1.336 1.335a1.333 1.333 0 0 1-1.328-1.216l-3.27-.687-1.025 4.612c2.1.085 4.012.728 5.44 1.725a1.85 1.85 0 0 1 1.283-.514c1.024 0 1.856.832 1.856 1.857 0 .63-.314 1.187-.795 1.524zM8.15 12.438c-.738 0-1.336.598-1.336 1.335 0 .738.598 1.336 1.336 1.336.737 0 1.335-.598 1.335-1.336 0-.737-.598-1.335-1.335-1.335zm7.635 1.335c0-.737-.598-1.335-1.336-1.335-.737 0-1.335.598-1.335 1.335 0 .738.598 1.336 1.335 1.336.738 0 1.336-.598 1.336-1.336zm-1.23 2.81a.248.248 0 0 0-.345.058 3.43 3.43 0 0 1-2.71 1.33 3.43 3.43 0 0 1-2.71-1.33.248.248 0 1 0-.403.288 3.93 3.93 0 0 0 3.113 1.538 3.93 3.93 0 0 0 3.113-1.538.248.248 0 0 0-.058-.345z",
  "external-link":
    "M10 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5M14 3h7m0 0v7m0-7L10 14",
  "thumbs-up":
    "M7.5 15.5V8.3l3.7-5.6c.2-.3.5-.5.9-.5h.4c.8 0 1.5.7 1.5 1.5v4.3h5c.9 0 1.6.8 1.5 1.7l-1 8c-.1.8-.8 1.3-1.5 1.3H7.5m0-3H4.5a1.5 1.5 0 0 1-1.5-1.5v-7A1.5 1.5 0 0 1 4.5 8h3",
  "thumbs-down":
    "M16.5 8.5v7.2l-3.7 5.6c-.2.3-.5.5-.9.5h-.4c-.8 0-1.5-.7-1.5-1.5v-4.3H5c-.9 0-1.6-.8-1.5-1.7l1-8c.1-.8.8-1.3 1.5-1.3h11m0 3h3a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 19.5 16h-3",
  search:
    "M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15z",
  sort: "M3 6h18M3 12h12M3 18h6",
  trending:
    "M22 7l-8.5 8.5-5-5L2 17M22 7h-7m7 0v7",
  "arrow-left": "M19 12H5m0 0l7 7m-7-7l7-7",
  close: "M18 6L6 18M6 6l12 12",
  warning:
    "M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
  tag: "M7.5 7.5h.01M3 12l8.5-8.5a1 1 0 0 1 .7-.3H19a1 1 0 0 1 1 1v6.8a1 1 0 0 1-.3.7L12 20a1 1 0 0 1-1.4 0l-7.6-7.6A1 1 0 0 1 3 12z",
  clock:
    "M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0z",
  "app-store":
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-2 14.5v-9l7 4.5-7 4.5z",
  "chevron-down": "M6 9l6 6 6-6",
};

/* Stroke-based icons (use stroke instead of fill) */
const STROKE_ICONS = new Set([
  "external-link",
  "thumbs-up",
  "thumbs-down",
  "search",
  "sort",
  "trending",
  "arrow-left",
  "close",
  "warning",
  "tag",
  "clock",
  "chevron-down",
]);

interface IconProps {
  name: string;
  size?: number;
  className?: string;
  "aria-hidden"?: boolean;
}

export function Icon({
  name,
  size = 20,
  className,
  "aria-hidden": ariaHidden = true,
}: IconProps) {
  const path = ICONS[name];

  if (!path) {
    return null;
  }

  const isStroke = STROKE_ICONS.has(name);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={isStroke ? "none" : "currentColor"}
      stroke={isStroke ? "currentColor" : "none"}
      strokeWidth={isStroke ? 2 : 0}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={ariaHidden}
    >
      <path d={path} />
    </svg>
  );
}

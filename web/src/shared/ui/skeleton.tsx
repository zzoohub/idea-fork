interface SkeletonProps {
  variant?: "text" | "card" | "chip";
  className?: string;
}

const VARIANT_CLASSES = {
  text: "h-[16px] w-full rounded-[4px]",
  card: "h-[160px] w-full rounded-card",
  chip: "h-[32px] w-[80px] rounded-full",
} as const;

export function Skeleton({ variant = "text", className }: SkeletonProps) {
  return (
    <div
      className={["skeleton", VARIANT_CLASSES[variant], className]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    />
  );
}

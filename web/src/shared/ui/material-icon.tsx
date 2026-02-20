interface MaterialIconProps {
  name: string;
  size?: number;
  className?: string;
  filled?: boolean;
  "aria-hidden"?: boolean;
}

export function MaterialIcon({
  name,
  size = 20,
  className,
  filled = false,
  "aria-hidden": ariaHidden = true,
}: MaterialIconProps) {
  return (
    <span
      className={[
        "material-symbols-outlined",
        filled && "filled",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        fontSize: `${size}px`,
        fontVariationSettings: filled
          ? "'FILL' 1, 'wght' 400"
          : "'FILL' 0, 'wght' 400",
      }}
      aria-hidden={ariaHidden}
    >
      {name}
    </span>
  );
}

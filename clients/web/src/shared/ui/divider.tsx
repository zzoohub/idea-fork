interface DividerProps {
  className?: string;
}

export function Divider({ className }: DividerProps) {
  return (
    <hr
      className={["border-t border-border my-layout-sm", className]
        .filter(Boolean)
        .join(" ")}
      role="separator"
    />
  );
}

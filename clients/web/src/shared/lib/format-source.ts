const LABELS: Record<string, string> = {
  producthunt: "Product Hunt",
  app_store: "App Store",
  play_store: "Play Store",
};

export const formatSource = (s: string): string => LABELS[s] ?? s;

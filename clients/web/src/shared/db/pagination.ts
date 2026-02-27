const CURSOR_MAX_BYTES = 2048;

export function encodeCursor(values: Record<string, unknown>): string {
  const raw = JSON.stringify(values);
  // Base64url without padding (matches Python implementation)
  return Buffer.from(raw).toString("base64url").replace(/=+$/, "");
}

export function decodeCursor(cursor: string): Record<string, unknown> {
  if (cursor.length > CURSOR_MAX_BYTES) return {};
  try {
    const padded = cursor + "=".repeat((4 - (cursor.length % 4)) % 4);
    const raw = Buffer.from(padded, "base64url").toString("utf-8");
    const result = JSON.parse(raw);
    if (typeof result !== "object" || result === null || Array.isArray(result)) {
      return {};
    }
    return result as Record<string, unknown>;
  } catch {
    return {};
  }
}

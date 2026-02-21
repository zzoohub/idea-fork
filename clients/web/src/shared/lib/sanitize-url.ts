const SAFE_SCHEMES = ["https:", "http:"];

export function isSafeUrl(raw: string): boolean {
  try {
    const { protocol } = new URL(raw);
    return SAFE_SCHEMES.includes(protocol);
  } catch {
    return false;
  }
}

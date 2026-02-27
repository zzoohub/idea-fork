import "server-only";
import { neon } from "@neondatabase/serverless";

const neonSql = neon(process.env.DATABASE_URL!);

// The neon function supports both tagged template literals and
// parameterized queries (query, params[]) at runtime. The TypeScript
// types only expose the tagged template overload, so we provide a
// wrapper with the correct signature for parameterized queries.
export async function sql(
  query: string,
  params?: unknown[],
): Promise<Record<string, unknown>[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (neonSql as any)(query, params ?? []);
}

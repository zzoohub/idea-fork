import { neon } from "@neondatabase/serverless";

// Lazy-initialize the neon client so the module can be imported before
// DATABASE_URL is available (e.g. during Next.js static analysis).
let _neonSql: ReturnType<typeof neon> | null = null;

function getNeonSql() {
  if (!_neonSql) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    _neonSql = neon(process.env.DATABASE_URL);
  }
  return _neonSql;
}

// Use .query() for parameterized queries with $1, $2 placeholders.
// The direct call syntax (sql(query, params)) is no longer supported;
// only tagged template literals (sql`...`) and .query() work.
export async function sql(
  query: string,
  params?: unknown[],
): Promise<Record<string, unknown>[]> {
  return getNeonSql().query(query, params ?? []) as Promise<
    Record<string, unknown>[]
  >;
}

import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
const globalDb = globalThis as unknown as { hungryPool?: Pool };
export function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("Database is not configured.");
  globalDb.hungryPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    statement_timeout: 15000,
  });
  return drizzle(globalDb.hungryPool, { schema });
}

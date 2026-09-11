import { config } from "dotenv";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
config({ path: ".env.local", quiet: true });
async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED;
  if (!url) throw new Error("Set DATABASE_URL_UNPOOLED before migrating.");
  if (new URL(url).hostname.includes("-pooler"))
    throw new Error("Migrations require a direct connection.");
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
    console.log("Migrations applied successfully.");
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error("Migration failed. Check the direct connection and migration permissions.");
  process.exitCode = 1;
});

import { config } from "dotenv";
import { Pool } from "pg";
config({ path: ".env.local", quiet: true });
async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED;
  if (!connectionString) throw new Error("Set DATABASE_URL_UNPOOLED.");
  const pool = new Pool({ connectionString, max: 1 }),
    client = await pool.connect();
  try {
    await client.query("begin");
    const { rows } = await client.query<{ id: string }>(
      "select p.id from photos p where created_at < now() - interval '24 hours' and not exists (select 1 from stall_photos s where s.photo_id = p.id) limit 1000 for update of p skip locked",
    );
    for (const row of rows) {
      await client.query("delete from photos where id = $1", [row.id]);
    }
    await client.query("delete from app_session where expires_at < now()");
    await client.query("delete from app_verification where expires_at < now()");
    await client.query("delete from request_limits where expires_at < now()");
    await client.query(
      "delete from auth_rate_limit where last_request < extract(epoch from now() - interval '7 days') * 1000",
    );
    await client.query("commit");
    console.log(
      `Maintenance complete; removed ${rows.length} orphaned photos and expired authentication/limit records.`,
    );
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(() => {
  console.error("Maintenance failed. Check database access and photo directory permissions.");
  process.exitCode = 1;
});

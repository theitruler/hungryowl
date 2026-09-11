import { config } from "dotenv";
import { Pool } from "pg";
config({ path: ".env.local", quiet: true });
async function main() {
  const email = process.argv[2]?.toLowerCase();
  if (!email || !email.includes("@"))
    throw new Error("Usage: npm run db:admin -- verified@example.com");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED, max: 1 });
  try {
    const result = await pool.query(
      "update app_user set role = 'admin', updated_at = now() where lower(email) = $1 and email_verified = true returning id",
      [email],
    );
    console.log(
      result.rowCount
        ? "Administrator role granted."
        : "No verified user with that email. Sign up and verify first.",
    );
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error("Could not assign administrator. Verify database configuration and email.");
  process.exitCode = 1;
});

const required = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
];
if (process.env.DEMO_MODE === "true") {
  console.warn(
    "HungryOwl is running an explicitly enabled SAMPLE preview. All live writes are disabled.",
  );
} else {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(`Missing production configuration: ${missing.join(", ")}`);
    process.exit(1);
  }
  if (
    !process.env.BETTER_AUTH_URL.startsWith("https://") ||
    process.env.BETTER_AUTH_SECRET.length < 32
  ) {
    console.error(
      "Production requires an HTTPS app URL and an auth secret of at least 32 characters.",
    );
    process.exit(1);
  }
  console.log("Production configuration checks passed.");
}

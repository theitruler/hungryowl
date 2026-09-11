import { execFileSync } from "node:child_process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";

if (process.env.VERCEL_ENV === "production") {
  execFileSync(npm, ["run", "db:migrate"], { stdio: "inherit" });
}

execFileSync(npm, ["run", "build"], { stdio: "inherit" });

import { execSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const siteUrl = process.argv[2] ?? "http://localhost:5173";
const projectRoot = new URL("..", import.meta.url).pathname;

const keys = await generateKeyPair("RS256", { extractable: true });
const privateKey = await exportPKCS8(keys.privateKey);
const publicKey = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

// Write all three variables to a temp .env file and use --from-file --force.
// This avoids shell quoting / newline issues with multi-line PEM strings.
const tmpFile = join(projectRoot, ".convex-auth-env-tmp.env");

// The .env format used by `convex env set --from-file` is KEY=VALUE with
// multi-line values wrapped in double-quotes (PEM newlines preserved).
const pemSingleLine = privateKey.trimEnd().replace(/\n/g, "\\n");

const envFileContent =
  `JWT_PRIVATE_KEY="${pemSingleLine}"\n` +
  `JWKS=${JSON.stringify(jwks)}\n` +
  `SITE_URL=${siteUrl}\n`;

console.log("Setting Convex Auth environment variables...");
try {
  writeFileSync(tmpFile, envFileContent, "utf8");
  execSync(`npx convex env set --force --from-file ${tmpFile}`, {
    stdio: "inherit",
    cwd: projectRoot,
  });
  console.log("Done. Restart `npx convex dev` if it is running.");
} finally {
  try {
    unlinkSync(tmpFile);
  } catch (_) {}
}

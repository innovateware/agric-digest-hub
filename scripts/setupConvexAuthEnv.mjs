import { execSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

// Usage:
//   node scripts/setupConvexAuthEnv.mjs [siteUrl] [--prod]
//   npm run setup:auth:env                  → dev,  http://localhost:5173
//   node scripts/setupConvexAuthEnv.mjs https://example.com --prod → prod
const args = process.argv.slice(2);
const prodFlag = args.includes("--prod");
const siteUrlArg = args.find((a) => !a.startsWith("--"));
const siteUrl =
  siteUrlArg ?? (prodFlag ? "https://agri-digest-hub.vercel.app" : "http://localhost:5173");

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

const deploymentFlag = prodFlag ? "--prod" : "";
const target = prodFlag ? "prod (rosy-armadillo-249)" : "dev (terrific-gull-628)";

console.log(`Setting Convex Auth environment variables on ${target}...`);
try {
  writeFileSync(tmpFile, envFileContent, "utf8");
  execSync(
    `npx convex env set --force ${deploymentFlag} --from-file ${tmpFile}`,
    { stdio: "inherit", cwd: projectRoot }
  );
  console.log("Done. Remember to redeploy if pushing to prod.");
} finally {
  try {
    unlinkSync(tmpFile);
  } catch (_) {}
}

import { execSync } from "node:child_process";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const siteUrl = process.argv[2] ?? "http://localhost:5173";

const keys = await generateKeyPair("RS256", { extractable: true });
const privateKey = await exportPKCS8(keys.privateKey);
const publicKey = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

function setEnv(name, value) {
  execSync(`npx convex env set ${name} ${JSON.stringify(value)}`, {
    stdio: "inherit",
    cwd: new URL("..", import.meta.url).pathname,
  });
}

console.log("Setting Convex Auth environment variables...");
setEnv("JWT_PRIVATE_KEY", privateKey.trimEnd());
setEnv("JWKS", jwks);
setEnv("SITE_URL", siteUrl);
console.log("Done. Restart `npx convex dev` if it is running.");

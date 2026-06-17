# Agri Digest Hub — Bug Fixes & Known Issues

> **Last updated:** 2026-06-17
> **Maintainer:** FudratTech Dev Team

---

## Table of Contents

- [BUG-001: JWKS Double-Escaping Breaks Production Auth Discovery](#bug-001-jwks-double-escaping-breaks-production-auth-discovery)
- [BUG-002: Incorrect SITE\_URL in Convex Production Environment](#bug-002-incorrect-site_url-in-convex-production-environment)

---

## BUG-001: JWKS Double-Escaping Breaks Production Auth Discovery

| Field          | Detail                                                                 |
| -------------- | ---------------------------------------------------------------------- |
| **Severity**   | 🔴 Critical — blocks all authentication on production                  |
| **Status**     | ✅ Fixed (2026-06-17)                                                  |
| **Affected**   | `scripts/setupConvexAuthEnv.mjs`, `scripts/generateKeys.mjs`          |
| **Deployment** | Both dev (`terrific-gull-628`) and prod (`rosy-armadillo-249`)         |

### Symptoms

When accessing the production app, the browser console shows repeated WebSocket reconnections followed by an auth discovery failure:

```
convex-jbBU5h6x.js:17 WebSocket reconnected at t=9.4s
convex-jbBU5h6x.js:17 WebSocket reconnected at t=10.6s
convex-jbBU5h6x.js:17 WebSocket reconnected at t=11.9s
convex-jbBU5h6x.js:17 Failed to authenticate:
  "Auth provider discovery of https://rosy-armadillo-249.convex.site failed",
  check your server auth config
```

Mutations that require authentication (e.g., `users:ensureProfile`) also fail with a server error:

```
convex-jbBU5h6x.js:17 [CONVEX M(users:ensureProfile)]
  [Request ID: 284dc3a7ff45c1f3] Server Error
```

### Root Cause

The `JWKS` environment variable stored on the Convex deployment contained **double-escaped JSON**, causing the `/.well-known/jwks.json` endpoint to return invalid JSON that the Convex auth system could not parse.

#### How the double-escaping happened

In both `scripts/setupConvexAuthEnv.mjs` (line 33) and `scripts/generateKeys.mjs` (line 9), the `jwks` variable was constructed as a JSON string using `JSON.stringify()`, then **wrapped in a second `JSON.stringify()`** when writing it out:

```javascript
// Line 21 — jwks is ALREADY a valid JSON string
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });
// Result: '{"keys":[{"use":"sig","kty":"RSA","n":"...","e":"AQAB"}]}'

// Line 33 (setupConvexAuthEnv.mjs) — BUG: double-stringifies
`JWKS=${JSON.stringify(jwks)}\n`
// Result: 'JWKS="{\"keys\":[{\"use\":\"sig\",...}]}"'
//          ^^^^ escaped quotes inside a quoted string

// Line 9 (generateKeys.mjs) — same BUG
console.log(`JWKS=${JSON.stringify(jwks)}`);
```

This caused the Convex `JWKS` env var to store a value like:

```
"{\"keys\":[{\"use\":\"sig\",\"kty\":\"RSA\",\"n\":\"...\",\"e\":\"AQAB\"}]}"
```

Instead of the correct:

```
{"keys":[{"use":"sig","kty":"RSA","n":"...","e":"AQAB"}]}
```

When the `@convex-dev/auth` library served this value at `/.well-known/jwks.json`, it returned **double-escaped JSON**, which the Convex platform's internal auth provider discovery could not parse — resulting in the `"Auth provider discovery ... failed"` error.

### How to Diagnose

1. **Check the JWKS endpoint directly:**

   ```bash
   curl -s https://<deployment>.convex.site/.well-known/jwks.json | head -c 30
   ```

   - ✅ **Correct output** starts with: `{"keys":[{"use":"sig"`
   - ❌ **Broken output** starts with: `{\"keys\":[{\"use\":\"sig\"`

2. **Check the stored env var:**

   ```bash
   npx convex env list --prod
   ```

   Look at the `JWKS` value. If it starts with `"{\"keys\"` (quoted string with escaped quotes inside), it is double-escaped.

3. **Check the OpenID discovery endpoint:**

   ```bash
   curl -s https://<deployment>.convex.site/.well-known/openid-configuration
   ```

   This should return valid JSON with `issuer`, `jwks_uri`, and `authorization_endpoint`. If this returns 200 but auth still fails, the issue is specifically with the JWKS content format.

### Fix Applied

**File: `scripts/setupConvexAuthEnv.mjs`** — Line 33

```diff
 const envFileContent =
   `JWT_PRIVATE_KEY="${pemSingleLine}"\n` +
-  `JWKS=${JSON.stringify(jwks)}\n` +
+  `JWKS=${jwks}\n` +
   `SITE_URL=${siteUrl}\n`;
```

**File: `scripts/generateKeys.mjs`** — Line 9

```diff
 console.log(`JWT_PRIVATE_KEY=${JSON.stringify(privateKey.trimEnd())}`);
-console.log(`JWKS=${JSON.stringify(jwks)}`);
+console.log(`JWKS=${jwks}`);
```

### Steps to Re-apply Fix (if keys need regeneration)

After fixing the scripts, you must regenerate and redeploy:

```bash
# 1. Regenerate auth keys for production
npm run setup:auth:env:prod

# 2. Redeploy Convex functions so the new env vars take effect
npx convex deploy --cmd 'npm run build' --yes

# 3. (Optional) Also fix dev deployment
npm run setup:auth:env
```

### Why Dev Appeared to Work

The dev deployment (`terrific-gull-628`) had the same double-escaping issue, but local development may have appeared to work because:

- The `@convex-dev/auth` library may handle certain edge cases differently in dev mode
- WebSocket reconnections in dev are more tolerant
- The dev deployment may have had older, correctly-formatted keys from before the bug was introduced

Regardless, the fix was applied to both deployments for consistency.

---

## BUG-002: Incorrect SITE_URL in Convex Production Environment

| Field          | Detail                                                                          |
| -------------- | ------------------------------------------------------------------------------- |
| **Severity**   | 🟠 High — can cause auth callback failures and CORS issues in production        |
| **Status**     | ✅ Fixed (2026-06-17)                                                           |
| **Affected**   | `scripts/setupConvexAuthEnv.mjs` (hardcoded default URL)                        |
| **Deployment** | Production (`rosy-armadillo-249`)                                               |

### Symptoms

Auth callbacks (OAuth redirects, password reset links, etc.) redirect to the wrong URL, or CORS errors appear because the `SITE_URL` doesn't match the actual Vercel deployment domain.

### Root Cause

The `setupConvexAuthEnv.mjs` script had a hardcoded default production URL that was incorrect:

```javascript
// WRONG
const siteUrl = siteUrlArg ?? (prodFlag
  ? "https://agri-digest-hub.vercel.app"    // ← does not exist
  : "http://localhost:5173");

// CORRECT
const siteUrl = siteUrlArg ?? (prodFlag
  ? "https://agricdigesthub.vercel.app"      // ← actual Vercel URL
  : "http://localhost:5173");
```

### How to Diagnose

1. **Check the current SITE_URL on production:**

   ```bash
   npx convex env get SITE_URL --prod
   ```

2. **Compare with your actual Vercel deployment URL.** Open the Vercel dashboard or run:

   ```bash
   # The SITE_URL should exactly match your production domain
   # (no trailing slash)
   ```

3. **Signs of a mismatch:**
   - OAuth redirects go to a 404 page
   - Password reset emails contain wrong links
   - CORS errors in the browser console mentioning the wrong origin

### Fix Applied

**File: `scripts/setupConvexAuthEnv.mjs`** — Line 14

```diff
 const siteUrl =
-  siteUrlArg ?? (prodFlag ? "https://agri-digest-hub.vercel.app" : "http://localhost:5173");
+  siteUrlArg ?? (prodFlag ? "https://agricdigesthub.vercel.app" : "http://localhost:5173");
```

### Steps to Re-apply Fix

```bash
# 1. Re-run the auth env setup for production
npm run setup:auth:env:prod

# 2. Verify the change
npx convex env get SITE_URL --prod
# Expected output: https://agricdigesthub.vercel.app

# 3. Redeploy
npx convex deploy --cmd 'npm run build' --yes
```

### Prevention

- If the Vercel project domain changes (e.g., custom domain), update line 14 in `scripts/setupConvexAuthEnv.mjs` and re-run the setup.
- Alternatively, pass the URL explicitly to avoid relying on the hardcoded default:

  ```bash
  node scripts/setupConvexAuthEnv.mjs https://yourcustomdomain.com --prod
  ```

---

## General Troubleshooting: Convex Auth Issues

If you encounter auth-related errors in the future, follow this checklist:

### 1. Verify Convex Environment Variables

```bash
# Dev deployment
npx convex env list

# Production deployment
npx convex env list --prod
```

All three must be set: `JWKS`, `JWT_PRIVATE_KEY`, `SITE_URL`.

### 2. Verify Auth Discovery Endpoints

```bash
# OpenID Configuration
curl -s https://<deployment>.convex.site/.well-known/openid-configuration | python3 -m json.tool

# JWKS (must return valid, non-escaped JSON)
curl -s https://<deployment>.convex.site/.well-known/jwks.json | python3 -m json.tool
```

If `python3 -m json.tool` fails to parse the output, the JSON is malformed.

### 3. Verify HTTP Routes

Ensure `convex/http.ts` includes the auth routes:

```typescript
import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);

export default http;
```

### 4. Regenerate Keys (Nuclear Option)

If keys are suspected to be corrupted or mismatched:

```bash
# Dev
npm run setup:auth:env

# Production
npm run setup:auth:env:prod
npx convex deploy --cmd 'npm run build' --yes
```

> ⚠️ **Warning:** Regenerating keys will invalidate all existing user sessions. Users will need to sign in again.

### 5. Useful Debug Queries

The codebase includes debug queries in `convex/users.ts`:

```typescript
// Check what the server sees for SITE_URL / CONVEX_SITE_URL
export const testEnv = query({ ... });

// Test if a URL is reachable from the Convex deployment
export const testFetch = action({ ... });
```

You can invoke these from the Convex dashboard or via:

```bash
npx convex run users:testEnv
npx convex run users:testFetch '{"url": "https://<deployment>.convex.site/.well-known/jwks.json"}'
```

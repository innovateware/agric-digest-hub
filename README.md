# Agri Digest Hub

Statistical Digest Management System — a full-stack application for managing agricultural commodity statistics. Built with React, Vite, Tailwind CSS, and [Convex](https://convex.dev) as the backend.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (Vite + React)                                │
│  - Dashboard, Data Table, Import, Analytics, Reports    │
│  - Convex React hooks for real-time data                │
│  - Convex Auth for authentication                       │
└──────────────────────┬──────────────────────────────────┘
                       │ VITE_CONVEX_URL
┌──────────────────────▼──────────────────────────────────┐
│  Convex Backend                                         │
│  - statisticalData table (CRUD + bulk import)           │
│  - auditLog table (activity tracking)                   │
│  - userProfiles table (role-based access control)       │
│  - Convex Auth (email/password + optional Google OAuth) │
└─────────────────────────────────────────────────────────┘
```

### User Roles

| Role | Permissions |
|------|-------------|
| `admin` | Full access: create, edit, delete, import, export, audit logs |
| `data_entry` | Create, edit, import, export |
| `viewer` | Read-only access to dashboard, data, analytics, reports |

The first registered user is automatically assigned the `admin` role.

---

## CI/CD Architecture

```
Developer
    │
git push origin main
    │
GitHub Repository
    │
    ├─────────────────────────────────────┐
    │                                     │
    ▼                                     ▼
Vercel (automatic)              GitHub Actions
Frontend Deploy                 convex-deploy.yml
    │                                     │
    ▼                                     ▼
Production UI               Convex Production Backend
(Vercel CDN)                (Functions + Schema + DB)
```

| Push to `main` | Triggers |
|----------------|---------|
| Vercel detects push | Builds & deploys frontend automatically |
| GitHub Actions runs | Runs `npx convex deploy` → backend live |

---

## Prerequisites

- Node.js 18+
- npm
- A [Convex](https://convex.dev) account (free tier available)
- A [Vercel](https://vercel.com) account
- A [GitHub](https://github.com) account

---

## Quick Start (Local Development)

```bash
# 1. Clone
git clone https://github.com/innovateware/agric-digest-hub.git
cd agric-digest-hub

# 2. Install
npm install

# 3. Copy env template
cp .env.example .env.local

# 4. Terminal 1 — Start Convex dev backend
npx convex dev
# On first run: log in, create/link a project → writes VITE_CONVEX_URL to .env.local

# 5. Configure auth keys (required before first login)
npm run setup:auth:env
# Then restart `npx convex dev`

# 6. Terminal 2 — Start Vite frontend
npm run dev
# → http://localhost:5173
```

---

## Environment Variables

### Local development — `.env.local`

```
VITE_CONVEX_URL=https://your-dev-deployment.convex.cloud
VITE_CONVEX_SITE_URL=https://your-dev-deployment.convex.site
CONVEX_DEPLOYMENT=dev:your-deployment   # written automatically by npx convex dev
```

### Production — set in Vercel Dashboard

| Variable | Description |
|----------|-------------|
| `VITE_CONVEX_URL` | Production Convex deployment URL |
| `VITE_CONVEX_SITE_URL` | Production Convex site URL (auth callbacks) |

### Production — set in Convex Dashboard

| Variable | Description | Required |
|----------|-------------|----------|
| `JWT_PRIVATE_KEY` | JWT signing key (run `npm run setup:auth:env`) | ✅ Yes |
| `JWKS` | JWK Set (run `npm run setup:auth:env`) | ✅ Yes |
| `SITE_URL` | Your production frontend URL (e.g. `https://agri-digest-hub.vercel.app`) | ✅ Yes |
| `AUTH_GOOGLE_ID` | Google OAuth client ID | Optional |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret | Optional |
| `AUTH_RESEND_KEY` | Resend API key for password-reset emails | Optional |
| `AUTH_EMAIL_FROM` | Sender email for password reset | Optional |

---

## Convex Auth Setup

Convex Auth requires JWT signing keys on your deployment. Without them, login/signup fails with `Missing environment variable JWT_PRIVATE_KEY`.

**Option A — Automated (recommended):**

```bash
npm run setup:auth:env
```

**Option B — Interactive wizard:**

```bash
npx @convex-dev/auth
```

**Option C — Manual:**

```bash
npm run setup:auth
# Copy the output and:
npx convex env set SITE_URL https://your-production-domain.com
npx convex env set JWT_PRIVATE_KEY "<paste private key>"
npx convex env set JWKS '<paste jwks json>'
```

---

## Production Deployment

### Step 1 — Set up Convex Production

```bash
# Deploy backend to Convex production
npx convex deploy
```

Copy the production URL shown after deploy (e.g. `https://your-prod.convex.cloud`).

Then set auth keys on the **production** deployment:

```bash
npx convex env set SITE_URL https://your-vercel-app.vercel.app
npx convex env set JWT_PRIVATE_KEY "..."
npx convex env set JWKS '...'
```

### Step 2 — Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → Import from GitHub
2. Select `innovateware/agric-digest-hub`
3. Framework preset: **Vite** (auto-detected via `vercel.json`)
4. Add environment variables:
   - `VITE_CONVEX_URL` = your production Convex URL
   - `VITE_CONVEX_SITE_URL` = your production Convex site URL
5. Click **Deploy**

### Step 3 — Configure Automatic Convex Deployment (GitHub Actions)

Get your Convex deploy key:

1. [Convex Dashboard](https://dashboard.convex.dev) → your project → **Settings** → **Deploy keys**
2. Copy the **Production** deploy key

Add it to GitHub:

```
GitHub → Repository → Settings
  → Secrets and Variables → Actions
  → New repository secret
  Name:  CONVEX_DEPLOY_KEY
  Value: <paste deploy key>
```

After this, every `git push origin main` automatically:
- Deploys the frontend via Vercel
- Deploys the backend via GitHub Actions (`convex deploy`)

### Git Branch Strategy

```
main        ← production branch (Vercel + Convex auto-deploy)
  │
  └── development  ← integration branch
        │
        └── feature/*   ← feature branches (PR → development → main)
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run dev:convex` | Start Convex dev server |
| `npm run setup:auth` | Print JWT keys for manual Convex env setup |
| `npm run setup:auth:env` | Generate and set JWT keys on Convex deployment |
| `npm run seed` | Seed sample statistical data |
| `npm run build` | Production Vite build |
| `npm run build:all` | Regenerate Convex types + production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests (vitest) |

---

## Data Import

The Import page accepts `.xlsx`, `.xls`, and `.csv` files. Parsing runs client-side using the SheetJS library — no external AI service required.

Download the template from the Import page or use columns:

`Year, Zone, State, Category, Commodity Name, Unit of Measurement, January–December, Total, Average`

---

## Project Structure

```
agri-digest-hub/
├── .github/
│   └── workflows/
│       └── convex-deploy.yml    # GitHub Actions: deploy Convex on push to main
├── convex/                      # Convex backend
│   ├── schema.ts                # Database schema
│   ├── auth.ts                  # Authentication config
│   ├── statisticalData.ts       # Data CRUD mutations/queries
│   ├── auditLog.ts              # Audit log functions
│   ├── users.ts                 # User profile & roles
│   └── lib/                     # Shared backend utilities
├── src/
│   ├── components/              # UI components (shadcn/ui)
│   ├── pages/                   # Route pages
│   ├── lib/                     # Frontend utilities & hooks
│   └── main.jsx                 # App entry point
├── scripts/
│   ├── generateKeys.mjs         # Generate JWT keys
│   └── setupConvexAuthEnv.mjs   # Auto-set Convex auth env vars
├── .env.example                 # Environment variable template (committed)
├── vercel.json                  # Vercel deployment config (SPA routing)
├── vite.config.js               # Vite build config
└── convex.json                  # Convex project config
```

---

## Google OAuth (Optional)

1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com)
2. Add authorized redirect URI: `https://<your-convex-deployment>.convex.site/api/auth/callback/google`
3. Set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` in Convex Dashboard
4. Set `VITE_ENABLE_GOOGLE_AUTH=true` in `.env.local` (dev) or Vercel (production)

---

## Security

- All data mutations require authentication
- Role-based access enforced server-side in Convex functions
- Passwords hashed via Convex Auth
- Audit logging for all data changes
- No secrets committed to repository (`.env.*` is gitignored)

---

## License

Private — All rights reserved.

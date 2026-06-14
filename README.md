# Agri Digest Hub

Statistical Digest Management System — a full-stack application for managing agricultural commodity statistics. Built with React, Vite, Tailwind CSS, and [Convex](https://convex.dev) as the backend.

This application is fully independent and no longer depends on Base44 infrastructure.

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
│  - auditLog table (activity tracking)                     │
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

## Prerequisites

- Node.js 18+
- npm
- A [Convex](https://convex.dev) account (free tier available)

## Installation

```bash
git clone <repository-url>
cd agri-digest-hub
npm install
```

## Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

### Frontend (`.env.local`)

| Variable | Description |
|----------|-------------|
| `VITE_CONVEX_URL` | Your Convex deployment URL (set automatically by `npx convex dev`) |

### Convex Dashboard (Production)

Set these in the [Convex Dashboard](https://dashboard.convex.dev) under Settings → Environment Variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `AUTH_GOOGLE_ID` | Google OAuth client ID | Optional |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret | Optional |
| `AUTH_RESEND_KEY` | Resend API key for password reset emails | Optional |
| `AUTH_EMAIL_FROM` | Sender email for password reset | Optional |

## Local Development

Run the Convex backend and frontend in **two terminals**:

**Terminal 1 — Convex backend:**

```bash
npx convex dev
```

On first run, this will:
1. Prompt you to log in to Convex
2. Create a new project (or link an existing one)
3. Deploy your functions and write `VITE_CONVEX_URL` to `.env.local`

**Terminal 2 — Frontend:**

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### First-time setup

1. Register a new account at `/register`
2. The first user becomes an `admin` automatically
3. Start adding data via the Data Table or Import page

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run dev:convex` | Start Convex dev server |
| `npm run seed` | Seed sample statistical data (local) |
| `npm run build:all` | Regenerate Convex types + production build |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Deployment

### Frontend — Vercel

1. Push your repository to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Set environment variable:
   - `VITE_CONVEX_URL` = your **production** Convex deployment URL
4. Deploy — `vercel.json` is preconfigured for SPA routing

### Backend — Convex

1. Create a production deployment:

```bash
npx convex deploy
```

2. Set production environment variables in the Convex Dashboard
3. Copy the production deployment URL to Vercel as `VITE_CONVEX_URL`

### Google OAuth (Optional)

1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com)
2. Add authorized redirect URI: `https://<your-convex-deployment>.convex.site/api/auth/callback/google`
3. Set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` in Convex Dashboard

## Data Import

The Import page accepts `.xlsx`, `.xls`, and `.csv` files. Parsing runs client-side using the SheetJS library — no external AI service required.

Download the template from the Import page or use columns:

`Year, Zone, State, Category, Commodity Name, Unit of Measurement, January–December, Total, Average`

## Project Structure

```
agri-digest-hub/
├── convex/                  # Convex backend
│   ├── schema.ts            # Database schema
│   ├── auth.ts              # Authentication config
│   ├── statisticalData.ts   # Data CRUD mutations/queries
│   ├── auditLog.ts          # Audit log functions
│   ├── users.ts             # User profile & roles
│   └── lib/                 # Shared backend utilities
├── src/
│   ├── components/          # UI components (shadcn/ui)
│   ├── pages/               # Route pages
│   ├── lib/                 # Frontend utilities & hooks
│   └── main.jsx             # App entry point
├── .env.example             # Environment variable template
├── vercel.json              # Vercel deployment config
└── vite.config.js           # Vite build config
```

## Security

- All data mutations require authentication
- Role-based access enforced server-side in Convex functions
- Passwords hashed via Convex Auth
- Audit logging for all data changes

## License

Private — All rights reserved.

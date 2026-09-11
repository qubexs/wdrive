# ![Google Drive Clone](./public/logo.png) WDrive — Google Drive Clone

A Google Drive-inspired file manager built with **Next.js (Pages Router), NextAuth, PostgreSQL, Prisma**, and **Cloudinary** — with a **local-disk upload fallback**, per-user quotas, granular permissions, public share links, and an admin dashboard.

> **Base path note:** this app is served under the sub-path **`/wdrive`**.
> Local dev → `http://localhost:3000/wdrive`
> Docker → `http://localhost:8001/wdrive` (or your reverse-proxy `https://your-host/wdrive`)

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED)
![License: MIT](https://img.shields.io/badge/License-MIT-green)

---

## Table of Contents

- [Demo](#demo)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quickstart — Local Development](#quickstart--local-development)
- [Quickstart — Docker Compose (recommended for self-host)](#quickstart--docker-compose-recommended-for-self-host)
- [Environment Variables](#environment-variables)
- [Authentication Guide](#authentication-guide)
- [Admin Guide](#admin-guide)
- [Storage Notes](#storage-notes)
- [Sharing Notes](#sharing-notes)
- [API Overview](#api-overview)
- [NPM Scripts](#npm-scripts)
- [Deployment](#deployment)
  - [Vercel](#vercel)
  - [Docker / VM / Intranet server](#docker--vm--intranet-server)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgements](#acknowledgements)

---

## Demo

| Desktop | Desktop (grid) |
|---|---|
| ![Desktop mode](./public/desktop.png) | ![Desktop mode 2](./public/desktop2.png) |

| Tablet | Mobile |
|---|---|
| ![Tablet mode](./public/tablet.png) | ![Mobile mode](./public/mobile.png) |

---

## Features

**Files & folders**

- Create, rename, move, copy, star, trash, restore, delete-forever
- Nested folders with breadcrumbs (`/drive/[...Folder]`)
- Folder upload support + drag-and-drop (`DropZone`)
- List / grid view toggle, search, file-type icons
- In-browser preview modal, including `docx` (`docx-preview`) and `xlsx` (`xlsx`)

**Uploads & storage**

- Cloudinary signed uploads when Cloudinary env vars are set
- Automatic **local-disk fallback** (`POST /wdrive/api/upload/local`) stored in `public/google-drive-clone/{userId}/...` and served via `GET /wdrive/api/serve/...`
- Per-user quota, default **200 MB** (`src/constants/storage.ts` → `USER_STORAGE_LIMIT_BYTES`)
- Quota enforced server-side in `POST /api/files` (HTTP 413 when exceeded)
- Per-user override via `User.storageLimitBytes` (`null` = unlimited)

**Auth & permissions**

- Credentials login (email + password, `bcryptjs`) — **default, works without Google**
- Optional Google OAuth (only enabled if `GOOGLE_CLIENT_ID/SECRET` are set)
- Public self-registration with **admin approval** + **email domain allowlist** (`AllowedDomain`)
- Registration collects: name, email, password (≥4 chars), IC number, department, profile
- Granular per-user permissions refreshed from DB on every request:
  `canUpload, canDownload, canRename, canMove, canCopy, canShare, canEdit, canDelete`, plus `isActive / isApproved / role`
- Special admin: `demo@local.dev` + any email in `ADMIN_EMAILS`

**Sharing**

- File-based public links with `Only you` / `Anyone with the link`
- Backed by `FileEntry.shareToken`, rendered at `/wdrive/share/[token]` without Drive layout

**Admin dashboard** (`/wdrive/admin`)

- Overview stats, pending approvals, user management, allowed domains
- Toggle permissions, activate/disable users, set per-user storage limits

**UI**

- Responsive desktop / tablet / mobile layout with Tailwind CSS
- Google-style dark sign-in / register cards

---

## Tech Stack

| Layer | Technology / Version |
|---|---|
| Framework | Next.js `^16.2.6` (Pages Router), React `18.2.0` |
| Language | TypeScript `^5.1.6` |
| Styling | Tailwind CSS `^3.3.3`, PostCSS, `prettier-plugin-tailwindcss` |
| Auth | NextAuth.js `^4.23.0`, `@next-auth/prisma-adapter`, `bcryptjs`, Google + Credentials providers |
| DB / ORM | PostgreSQL `15`, Prisma `^5.1.1` (`@prisma/client`) |
| Uploads | Cloudinary (signed upload) + local filesystem fallback, `formidable` |
| Validation | `zod`, `@t3-oss/env-nextjs` (`src/env.mjs`) |
| Icons / UX | `react-icons`, `react-spinners`, `docx-preview`, `xlsx` |
| DevOps | Docker (Node 20-alpine), Docker Compose, Vercel-ready |

---

## Project Structure

```text
.
├── Dockerfile
├── docker-compose.yml      # app (8001:3000) + postgres:15, volumes pgdata/uploads
├── prisma/schema.prisma    # User, Account, Session, FileEntry, AllowedDomain
├── public/                 # logo.png, wpre.png, desktop/tablet/mobile screenshots
├── src/
│   ├── pages/
│   │   ├── index.tsx                 # landing → redirect to drive / signin
│   │   ├── auth/signin.tsx           # 2-step Google-style credentials login
│   │   ├── auth/register.tsx         # self-registration (pending approval)
│   │   ├── drive/my-drive/           # main drive
│   │   ├── drive/[...Folder].tsx     # nested folders
│   │   ├── drive/starred/ trash/     # filtered views
│   │   ├── share/[token].tsx         # public link view
│   │   ├── admin/index.tsx           # overview / pending / users / domains
│   │   └── api/
│   │       ├── auth/[...nextauth].ts  # NextAuth config
│   │       ├── auth/register.ts        # public registration + domain check
│   │       ├── files/index.ts + [id].ts# CRUD + quota check
│   │       ├── upload/local.ts         # base64 → public/google-drive-clone/...
│   │       ├── serve/[...path].ts      # serve local files
│   │       ├── cloudinary/sign-upload.ts + destroy.ts
│   │       ├── admin/stats.ts users.ts domains.ts
│   │       └── user/list.ts profile.ts password.ts
│   ├── server/auth.ts        # authOptions, JWT + session callbacks, perm refresh
│   ├── server/db.ts          # Prisma client
│   ├── server/files.ts       # serializeFileEntry helper
│   ├── server/cloudinary.ts  # Cloudinary config
│   ├── components/           # Header, SideMenu, GetFiles/GetFolders, PreviewModal,
│   │                         # ShareDialog, TransferDialog, Rename, DropZone, etc.
│   ├── hooks/                # useFileEntries, fetchFiles, fetchAllFiles, useViewMode
│   ├── constants/storage.ts  # USER_STORAGE_LIMIT_BYTES = 200 MB
│   ├── interfaces/ utils/ API/# types, formatBytes, client API wrappers
│   └── env.mjs               # validated env schema (t3-env)
├── next.config.mjs           # basePath: "/wdrive", images.unoptimized
└── .env.example
```

Key routes (remember the `/wdrive` prefix):

- `/wdrive/` → landing
- `/wdrive/auth/signin`, `/wdrive/auth/register`
- `/wdrive/drive/my-drive`, `/wdrive/drive/starred`, `/wdrive/drive/trash`
- `/wdrive/share/[token]`
- `/wdrive/admin`

---

## Prerequisites

Choose **one** of the two paths below. Docker is easiest because Postgres is included.

**For local dev:**

- Node.js `20.x` + npm `9.8.0` (`packageManager: npm@9.8.0`)
- PostgreSQL `15` running locally (or remote `DATABASE_URL`)
- (Optional) Google Cloud OAuth client for Google login
- (Optional) Cloudinary account for cloud uploads — without it, uploads use local disk

**For Docker:**

- Docker + Docker Compose v2
- Ports free: `8001` (app), `127.0.0.1:3309` (db, host-only)

Check versions:

```bash
node -v   # v20.x
npm -v    # 9.x
docker --version
docker compose version
psql --version  # local-dev only
```

---

## Quickstart — Local Development

Step-by-step for beginners. All commands run from the repo root (`wdrive/`).

**1. Clone and install**

```bash
git clone <your-repo-url> wdrive
cd wdrive
npm install
# postinstall runs `prisma generate` automatically
```

What to expect: `node_modules/` created, no errors about peer deps.

**2. Create your env file**

```bash
cp .env.example .env
```

Minimal `.env` for local credentials-only dev (no Google, no Cloudinary):

```env
DATABASE_URL="postgresql://wdrive:wdrive_secret@localhost:5432/wdrive"
NEXTAUTH_SECRET="generate-a-long-random-string"
NEXTAUTH_URL="http://localhost:3000/wdrive/api/auth"

# Optional — leave empty to disable Google login
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Optional — leave empty to use local-disk uploads
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# Optional — comma-separated admin emails
ADMIN_EMAILS="you@your-domain.com"
```

Generate a secret:

```bash
openssl rand -base64 32
```

**3. Create the database + push schema**

```bash
# make sure Postgres is running and DATABASE_URL is reachable
npx prisma db push
npx prisma studio   # optional: open DB GUI at http://localhost:5555
```

What to expect: `Your database is now in sync with your Prisma schema.`

**4. (Optional) Seed an admin**

There is no seed script. Easiest path:

1. Start the app (next step), register via UI, then promote yourself:

```bash
# replace with your email
npx prisma studio
# → User table → set role=ADMIN, isActive=true, isApproved=true
```

Or via SQL:

```sql
UPDATE "User" SET role='ADMIN', "isActive"=true, "isApproved"=true
WHERE email='you@your-domain.com';
```

`demo@local.dev` is always treated as admin in code if that user exists.

**5. Run the dev server**

```bash
npm run dev
```

Open **`http://localhost:3000/wdrive`** (not `/` — `basePath` is `/wdrive`).

Register → wait for admin approval → sign in → open My Drive.

---

## Quickstart — Docker Compose (recommended for self-host)

This spins up **app + Postgres** with persistent volumes.

**1. Prepare env + network**

```bash
cp .env.example .env
# edit .env — set at least:
# DATABASE_URL="postgresql://wdrive:wdrive_secret@wdrive-db:5432/wdrive"
# NEXTAUTH_SECRET="<long-random>"
# NEXTAUTH_URL="http(s)://<your-host>/wdrive/api/auth"
# ADMIN_EMAILS="you@your-domain.com"
```

The shipped `docker-compose.yml` attaches to an external network `intranet_intranet`. If you don't use it, either create it or remove that network:

```bash
# option A: create the external network (for reverse-proxy setups)
docker network create intranet_intranet

# option B: standalone — edit docker-compose.yml and delete the
# `intranet_intranet` entry under app.networks
```

**2. Build and start**

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

What to expect:

- `wdrive-db` healthy (`pg_isready`)
- `wdrive-app` listening on `3000` inside container → `http://localhost:8001/wdrive` on host

**3. Database**

The Docker `build` script runs `prisma db push --accept-data-loss && next build`, so tables are created at build time. If you change `prisma/schema.prisma` later:

```bash
docker compose exec app npx prisma db push
```

**4. Data persistence**

- Postgres data → `pgdata` volume
- Local uploads → `uploads` volume mounted at `/app/public/google-drive-clone`

```bash
docker volume ls | grep wdrive
```

**5. Stop / update**

```bash
docker compose down        # stop, keep volumes
docker compose down -v     # stop + DELETE db + uploads (careful!)
docker compose up -d --build  # rebuild after git pull
```

Service map:

| Service | Container | Host port | Inside |
|---|---|---|---|
| app | `wdrive-app` | `8001` | `3000` |
| db | `wdrive-db` | `127.0.0.1:3309` | `5432` |

---

## Environment Variables

Template: [`.env.example`](./.env.example). Validated in [`src/env.mjs`](./src/env.mjs). Use `SKIP_ENV_VALIDATION=1` only for Docker builds.

| Variable | Required? | Example | Notes |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | `postgresql://wdrive:wdrive_secret@wdrive-db:5432/wdrive` | Local: `@localhost:5432/wdrive`. Docker: `@wdrive-db:5432/wdrive`. |
| `NEXTAUTH_SECRET` | **Yes (prod)** | `openssl rand -base64 32` | Required in production. |
| `NEXTAUTH_URL` | **Yes** | `http://localhost:3000/wdrive/api/auth` | Must include `/wdrive/api/auth`. Docker behind proxy: `https://host/wdrive/api/auth`. |
| `GOOGLE_CLIENT_ID` | No | `...apps.googleusercontent.com` | If empty, Google button is disabled; Credentials still works. |
| `GOOGLE_CLIENT_SECRET` | No | `GOCSPX-...` | Same as above. |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | No | `my-cloud` | If empty, uploads fall back to local disk. `NEXT_PUBLIC_*` is client-visible. |
| `CLOUDINARY_API_KEY` | No | `123456...` | Server-only. |
| `CLOUDINARY_API_SECRET` | No | `abc...` | Server-only, never prefix with `NEXT_PUBLIC_`. |
| `ADMIN_EMAILS` | No | `admin@company.com,cto@company.com` | Comma-separated; these users get `ADMIN` role automatically. |
| `SKIP_ENV_VALIDATION` | Build only | `1` | Set in Dockerfile / compose to allow build without live env. |

---

## Authentication Guide

**Default: Credentials (no Google needed)**

1. Go to `/wdrive/auth/register`.
2. Fill: full name *, email *, password (≥4) *, IC number *, department *, profile/job title (optional).
3. Submit → you see **“Request submitted — pending admin approval.”**
4. An admin approves you in `/wdrive/admin` → Pending section.
5. Sign in at `/wdrive/auth/signin` (2-step Google-style UI, but uses email + password).

Login errors you may see:

| Message | Meaning |
|---|---|
| `Account pending admin approval` | `isApproved=false` — ask admin to approve |
| `Account disabled` | `isActive=false` — ask admin to re-enable |
| `Wrong password` | Bad credentials |
| `Email domain is not allowed` | Your `@domain` is not in `AllowedDomain` allowlist — admin must add it |

**Google OAuth (optional)**

1. In [Google Cloud Console](https://console.cloud.google.com/), create OAuth client (Web application).
2. Authorized redirect URI: `<NEXTAUTH_URL>/callback/google`, e.g.:
   - Local: `http://localhost:3000/wdrive/api/auth/callback/google`
   - Prod: `https://your-host/wdrive/api/auth/callback/google`
3. Set `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`, restart.
4. First Google login creates a `User`; if the user has no password, the first Credentials login sets one (see `src/server/auth.ts`).

**Permissions model**

New users default to: upload/download/rename/move/copy/share/edit = `true`, delete (`remove`) = `false`. Admins can toggle each flag per user; changes apply on next request (JWT refreshes from DB). `demo@local.dev` and `ADMIN_EMAILS` are always admin.

---

## Admin Guide

Open `/wdrive/admin` as an admin user. Sections:

- **Overview** — user/file counts, storage usage (`GET /api/admin/stats`)
- **Pending** — approve (`isApproved=true, isActive=true`) or reject registration requests
- **Users** — search, toggle `canUpload/canDownload/canRename/canMove/canCopy/canShare/canEdit/canDelete`, activate/disable, change `role`, set `storageLimitBytes` (empty/`null` = unlimited), view `fileCount/storageUsed` (`GET/PUT /api/admin/users`)
- **Domains** — add/remove allowed email domains, enable/disable (`GET/POST/DELETE /api/admin/domains`)

> New registrations fail with `403 Email domain is not allowed` unless the sender's exact domain exists and `isActive=true` in `AllowedDomain`. Add e.g. `company.com` (not `@company.com`) first.

---

## Storage Notes

- Default quota: **200 MB per user** — `export const USER_STORAGE_LIMIT_BYTES = 200 * 1024 * 1024` in [`src/constants/storage.ts`](./src/constants/storage.ts).
- Quota = `SUM(FileEntry.fileSize)` where `isFolder=false` for that `ownerId`. Checked in `POST /api/files`; folders cost `0`.
- Per-user override: `User.storageLimitBytes` (default `209715200` in schema; `null` = unlimited).
- Cloudinary path for new uploads: `google-drive-clone/{userId}/...`.
- Without Cloudinary keys, files go to `public/google-drive-clone/{userId}/{unique-name}` with a random hex suffix to avoid overwrites.
- Old rows created before size tracking have `fileSize=0` — backfill if quota accuracy matters.
- Docker persists local uploads in the `uploads` volume (`/app/public/google-drive-clone`).

---

## Sharing Notes

- Sharing is **file-based** (folders cannot be shared publicly in current UI).
- Toggle per file: `Only you` (`isShared=false`) ↔ `Anyone with the link` (`isShared=true`, generates `shareToken`).
- Public URL: `/wdrive/share/[token]` — renders a standalone preview page, no Drive layout, no login required.
- Revoking = set back to `Only you` (token cleared server-side).
- Respect `canShare=false` users: share dialog / API will reject with `403`.

---

## API Overview

All API routes are under `/wdrive/api/...` due to `basePath`. Auth via NextAuth session (JWT).

| Method & Path | Auth | Description |
|---|---|---|
| `POST /api/auth/register` | Public | Register pending user; validates domain allowlist; hashes password |
| `GET /api/files` | User | List own `FileEntry`s |
| `POST /api/files` | `canUpload` | Create file metadata or folder; enforces quota (413 if exceeded) |
| `GET/PUT/DELETE /api/files/[id]` | Owner + perm | Rename/move/star/trash/restore/share/copy/delete; delete calls Cloudinary destroy or removes local file |
| `POST /api/upload/local` | User | `{fileName, folder, dataBase64, mimeType}` → `{public_id, resource_type, secure_url}` (`/wdrive/api/serve/...`) |
| `GET /api/serve/[...path]` | Public/owner* | Streams files from `public/google-drive-clone/` |
| `POST /api/cloudinary/sign-upload` | User | Returns signed params for direct Cloudinary upload |
| `POST /api/cloudinary/destroy` | Owner | Deletes Cloudinary asset by `publicId` |
| `GET /api/admin/stats` | Admin | Counts + storage totals |
| `GET/PUT /api/admin/users` | Admin | List / update role, perms, quota, active state |
| `GET/POST/DELETE /api/admin/domains` | Admin | Manage `AllowedDomain` allowlist |
| `GET/PUT /api/user/profile` | User | Own profile (name, icNumber, department, profile) |
| `POST /api/user/password` | User | Change own password |
| `GET /api/user/list` | User/Admin | User listing (scoped) |

*Serve route is intentionally public so share links work; do not store sensitive files expecting auth-only access via local URLs.

---

## NPM Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server (`next dev`) → `http://localhost:3000/wdrive` |
| `npm run build` | `prisma db push --accept-data-loss && next build` (also used in Docker) |
| `npm run start` | Start production server (`next start`) |
| `npm run lint` | `eslint "src/**/*.{ts,tsx}"` |
| `npm run db:push` | `prisma db push` (sync schema without migrations) |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npx prisma generate` | Regenerate Prisma client (runs on `postinstall`) |

---

## Deployment

### Vercel

Vercel + serverless Postgres (Neon / Supabase / Railway) is the fastest cloud option. Note: **local-disk uploads do not persist on Vercel** — set Cloudinary env vars for production.

1. Push repo to GitHub, import in Vercel.
2. Set **all** env vars in Vercel dashboard (same table as above). Use production `DATABASE_URL` and `NEXTAUTH_URL=https://<your-app>.vercel.app/wdrive/api/auth`.
3. Build & start commands default from `package.json` (`npm run build` / `npm run start`). The build step runs `prisma db push`.
4. Add Google OAuth redirect `https://<your-app>.vercel.app/wdrive/api/auth/callback/google` if using Google.
5. Deploy, then register → promote first user to `ADMIN` via DB GUI → add allowed domains → approve users.

> `basePath: /wdrive` also applies on Vercel — your app will live at `/wdrive`, not `/`.

### Docker / VM / Intranet server

1. On the server, clone + configure `.env` with public `NEXTAUTH_URL` (e.g. `http://10.44.145.220/wdrive/api/auth` or `https://intranet.company.com/wdrive/api/auth`).
2. Ensure external proxy network exists if used: `docker network create intranet_intranet` (or remove it from compose for standalone).
3. `docker compose up -d --build`, verify `docker compose ps` + `logs -f app`.
4. Put a reverse proxy (Nginx / Traefik) in front if you need HTTPS, forwarding `/wdrive/*` to `app:3000` preserving the path.
5. Back up `pgdata` volume + `uploads` volume regularly:
   ```bash
   docker run --rm -v wdrive_pgdata:/data -v $(pwd):/backup alpine tar czf /backup/pgdata-backup.tar.gz /data
   docker run --rm -v wdrive_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz /data
   ```

---

## Troubleshooting

**App 404 at `/` but works at `/wdrive`**
→ Expected. `basePath: "/wdrive"` in `next.config.mjs` prefixes everything. Always use `/wdrive/...` in links, `NEXTAUTH_URL`, and proxy rules. Client code should use `router.basePath` (signin/register already do).

**`SKIP_ENV_VALIDATION` / build fails on missing env**
→ Dockerfile sets `SKIP_ENV_VALIDATION=1` + dummy env for `next build`. For local `npm run build`, either set real env or `SKIP_ENV_VALIDATION=1 npm run build`.

**`docker compose` fails: `network intranet_intranet declared as external, but could not be found`**
→ `docker network create intranet_intranet`, or delete the `intranet_intranet` lines from `docker-compose.yml` for standalone use.

**DB connection refused / `prisma db push` hangs**
→ Check `DATABASE_URL` host: `localhost` for local dev, `wdrive-db` inside compose. Ensure Postgres is up: `docker compose ps`, `pg_isready -U wdrive -d wdrive`. Local: `sudo systemctl status postgresql`.

**Google login: `redirect_uri_mismatch` / 404 callback**
→ Redirect must be exactly `<NEXTAUTH_URL>/callback/google` including `/wdrive`. Update both Google Console and `NEXTAUTH_URL`, then restart.

**Uploads work locally but 404 after Docker rebuild**
→ You used local-disk mode without the `uploads` volume, or hit `public/` 404 for runtime files — this app serves them via `/wdrive/api/serve/...`, not static. Keep the `uploads:` volume in compose.

**`413 Storage limit exceeded`**
→ User hit quota. Admin → Users → raise `storageLimitBytes` (or `null` = unlimited). Check `SUM(fileSize)` — old `0`-size rows may hide real usage.

**Share link 404 / no preview**
→ Only files (not folders) have tokens. Ensure link is `.../wdrive/share/<token>` and file is set to `Anyone with the link`.

**`Account pending / disabled` loop**
→ Admin must set `isApproved=true` + `isActive=true` in `/wdrive/admin` → Pending/Users.

**Port already in use (`8001` / `3309`)**
→ `docker compose down`, `lsof -i :8001`, or change `ports:` in compose.

Still stuck? Open an issue with: `docker compose logs app`, `node -v`, relevant `.env` keys (redacted secrets), and steps to reproduce.

---

## Contributing

1. Create a branch from `dev`: `git checkout -b feat/my-change dev`
2. Make changes + test locally (`npm run dev`, `npm run lint`, `npx prisma db push` if schema changed)
3. Keep `/wdrive` basePath in mind for all new routes/links
4. Open a pull request into `dev` with screenshots for UI changes

---

## License

MIT License — Copyright (c) 2026 Coder77. See [LICENSE](./LICENSE).

---

## Acknowledgements

- Inspired by Google Drive's core features and UI.
- Built with Next.js, PostgreSQL, Prisma, and Cloudinary docs.
- Personal learning exercise — not affiliated with Google.
- Found a bug or have an idea? Please open an issue or submit a PR!
- Made with ❤️ by Coder77
- Happy coding and stay productive!

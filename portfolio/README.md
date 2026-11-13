# Aditya Rajput — Portfolio

A static portfolio site (HTML/CSS/JS, no build step) styled as a backend
service directory — projects shown as endpoints with live/building status,
experience as a timeline, an "about" section styled like a terminal.

## Structure
```
portfolio/
├── index.html
├── style.css
├── script.js
├── assets/
│   └── resume.pdf     ← swap this whenever your resume updates
└── README.md
```

## Run locally
Just open `index.html` in a browser, or serve it:
```bash
npx serve .
```

## Push to GitHub
```bash
cd portfolio
git init
git add .
git commit -m "portfolio site"
git branch -M main
git remote add origin https://github.com/cryptobitter/portfolio.git
git push -u origin main
```
(Create the empty `portfolio` repo on GitHub first, or use `gh repo create portfolio --public --source=. --push` if you have the GitHub CLI.)

## Deploy on Vercel
1. Go to https://vercel.com/new
2. Import the `portfolio` GitHub repo
3. Framework preset: **Other** (it's static — no build command, no output directory needed)
4. Click **Deploy**

Vercel will give you a `*.vercel.app` URL immediately, and redeploys
automatically on every push to `main`. You can add a custom domain later
under Project → Settings → Domains.

## Updating content later
- **New project** → edit `api/sections-content.html` inside `#projects`.
- **New role/experience** → edit `api/sections-content.html` inside `#experience`.
- **Resume update** → replace `api/private/resume.pdf` with the new file (keep the same filename).

---

## What is and isn't protected

### What is protected (Server-side Gated)
- **All non-hero sections**: `#projects` (including the 3D Books Showcase), `#process` (including the waving cloth banner and interactive Tech Castle), `#experience` (interactive pulley hoist), `#animatedFooterGateway`, and `#contact`.
  - These sections are **not** present in the initial HTML or client JS bundles. They are stored on the server in `api/sections-content.html` and served exclusively via `/api/content` after verifying a valid Supabase JWT Bearer token.
- **Curriculum Vitae**: The resume file (`resume.pdf`) is moved out of the public assets directory into `api/private/resume.pdf`. Direct unauthenticated requests return `401 Unauthorized`. It is accessible only via `/api/download-cv` with a valid session token.

### What is NOT protected (Publicly Accessible)
- **The 3D Hero Orbit**: The landing hero with all 3 stations (`01. FRONT`, `02. PROFILE`, `03. BACK`), 3D statue orbit canvas, station dots, torches, and introductory typography remain public and search-engine indexable.
- **Public Assets & Frame Images**: The WebP frame images in `frames/` and public CSS/fonts remain fetchable if someone knows their exact asset URLs.

---

## Deploying to Vercel

1. **Commit and push branch `access-gate`**:
   ```bash
   git push -u origin access-gate
   ```
2. **Set Environment Variables in Vercel Dashboard** (`Project Settings` → `Environment Variables`):
   - `SUPABASE_URL`: `https://rhclizphxdneznjzqrir.supabase.co`
   - `SUPABASE_ANON_KEY`: `sb_publishable_BiqeeMo2hFAihh9zn50woA_jvtCamYV`
   - `SUPABASE_SERVICE_ROLE_KEY`: Your private Supabase Service Role secret from Supabase Dashboard.
   - `ALLOW_GUEST`: `false` (default)
3. **Configure Redirect URLs in Supabase Dashboard** (`Authentication` → `URL Configuration`):
   - Add `https://<your-vercel-domain>.vercel.app/**`
   - Add `http://localhost:5173/**` (or your local dev URL)

---

## How to Switch `ALLOW_GUEST`

- **To allow guest access on Vercel**:
  1. Go to Vercel Dashboard → Project Settings → Environment Variables.
  2. Set `ALLOW_GUEST` = `true` and redeploy.
  3. When enabled, a "Continue as guest →" link appears on the castle gate card, and `/api/content` serves the archive to guest visitors without requiring signup.
- **To test guest mode locally**:
  - Visit the site with `?guest=true` in the URL (e.g. `http://localhost:5173/?guest=true`).


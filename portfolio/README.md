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
- **New project** → duplicate a `<article class="proj ...">` block in
  `index.html` inside `#projects`, use `proj--live` or `proj--build` as the
  status class.
- **New role/experience** → duplicate the `.tl-item` block in `#experience`.
- **New cert/achievement** → add a `.cl-row` in `#log`.
- **Resume update** → replace `assets/resume.pdf` with the new file (keep the
  same filename so the link doesn't break).

# Repository Guidelines

## Project Structure & Module Organization
- `pages/`: Next.js routes (popup/options pages). File-based routing.
- `components/`: Reusable UI and view logic (PascalCase folders/files).
- `public/`: Static assets, `manifest.json`, `service_worker.ts` (compiled to JS).
- `styles/`: Global and module CSS (use `*.module.css` for scoped styles).
- `react_content_scripts/`: Vite-based React content scripts. Keep this path name so Next.js ignores it during builds.
- `out/`: Built extension output to load in Chrome. `.next/` is Next.js internal.
- Build helpers: `out.js` (rewrites asset paths), `refreshPublic.cjs` (copies `public/` → `out/`).

## Build, Test, and Development Commands
- `npm run dev`: Run Next.js dev server for fast iteration.
- `npm run build`: Build Next.js app, then rewrite `/_next` → `./next` in `out/`.
- `npm run buildall`: Full build (Next.js + content scripts under `react_content_scripts`).
- `npm run refreshcs`: Rebuild only the content scripts.
- `npm run refreshpb`: Copy `public/` to `out/` (refresh service worker/assets).
- Load in Chrome: `chrome://extensions` → Enable Developer Mode → Load unpacked → select `extension/out/`.

## Coding Style & Naming Conventions
- Language: TypeScript + React (Next.js, MUI, styled-components). 2-space indent.
- Components: PascalCase (`components/ProfilePage.tsx`). Hooks camelCase (`useSomething`).
- Pages: Lowercase route files under `pages/` using file-based routing.
- Styles: Prefer CSS Modules for component/page-specific CSS; keep globals minimal in `styles/globals.css`.
- UI: Prefer MUI components and styled-components; avoid mixing ad-hoc inline styles.

## Testing Guidelines
- No formal automated tests in this package. Validate manually:
  1) `npm run buildall`
  2) Load `out/` in Chrome and exercise features
  3) Check console logs and network calls.

## Commit & Pull Request Guidelines
- Commits: concise, imperative; Conventional Commits preferred (e.g., `feat: add course importer`).
- PRs: include summary, linked issues, test steps (how you validated in Chrome), and screenshots/GIFs for UI changes.
- Ensure `npm run buildall` succeeds and the extension loads without errors.

## Security & Configuration Tips
- Do not commit secrets. If env vars are introduced, use `.env.local` and `.gitignore` them.
- When touching build paths, verify `out.js` still rewrites asset URLs and `out/` remains loadable.

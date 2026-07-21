# katomatik-web

Static site for **katomatik.com**.

Conventions and the reasoning behind them. For setup, commands, and how to add
content, see [`README.md`](README.md) — don't duplicate it here.

## Stack

- **Astro 7** (`^7.1.2`) — static output, no SSR adapter
- **Tailwind 4** via `@tailwindcss/vite`
- **TypeScript** — `astro/tsconfigs/strict` + `strictNullChecks`
- `@astrojs/mdx`, `@astrojs/sitemap`, `sharp`
- Node **24** (LTS). Declared in four places that must not drift: `.nvmrc` (the source CI reads), `package.json` `engines`, the `Dockerfile` build stage, and `.devcontainer/devcontainer.json`. `engines` is a floor, so CI reads `.nvmrc` instead — otherwise setup-node would happily resolve a newer, non-LTS major.
- Deployed as a container to k8s, fronted by Cloudflare Tunnel

## Development

`astro` is a local dependency, not a global binary — prefix with `npx` (or use the
`package.json` scripts). Start the dev server in background mode:

```bash
npx astro dev --background    # serves http://localhost:4321
npx astro dev status | logs | stop
```

The `npm` scripts are listed in the README.

`build` runs `astro check` first, so a type error fails the build rather than shipping. That costs roughly 7s over a bare `astro build`; worth it, and it means CI needs no separate typecheck step. Vite alone does **not** typecheck — without `astro check`, a bad component prop builds and deploys silently.

A **devcontainer** is defined in `.devcontainer/devcontainer.json` — open the repo in VS Code (Dev Containers) or Codespaces and the toolchain comes with it. It has no Docker access, so building the image is a host operation; add the `docker-in-docker` feature if that changes.

Extensions are listed twice on purpose: `devcontainer.json` **installs** them in the container, `.vscode/extensions.json` **recommends** them to people working on the host. Keep the two lists in step, or host users silently lose Tailwind class sorting and format-on-save.

## Contributing

`main` is protected by a ruleset with **no bypass actors** — it applies to admins too. Direct pushes are rejected.

- Work on a branch, open a PR.
- `Checks` and `Build image` must pass before merge.
- Branches must be **up to date with `main`** before merging, so CI result reflects the code that will actually land.
- No approving review is required — either of us can merge our own PR once CI is green. That's a deliberate starting point, not a statement that review doesn't matter; revisit if the project grows.
- Force pushes to `main` and branch deletion are blocked.

## Formatting

Prettier owns formatting — tabs, single quotes, semicolons. Config in `.prettierrc.mjs`.

- **`prettier-plugin-tailwindcss` must stay last** in the `plugins` array. It wraps the other plugins; anywhere else and class sorting silently stops running with no error.
- It sorts Tailwind classes into a canonical order. Class attribute order never affects CSS (the cascade comes from stylesheet order), so this is purely cosmetic and safe.
- **`src/content/` is excluded** — Prettier re-indents fenced code samples inside posts, rewriting example code the author wrote deliberately. Content is authored, not code.
- Formatting is **not** wired into `build`. A formatting nit shouldn't block a deploy the way a type error should; run `format:check` in CI as its own step.
- `.devcontainer/devcontainer.json` and `.vscode/*.json` use the **`jsonc`** parser with `trailingComma: 'none'`. They carry comments, which the default `json` parser rejects outright; the trailing-comma setting keeps them readable by stricter parsers than VS Code's.

## Architecture

Content uses **content collections**, not loose page files.

- `src/content.config.ts` — collection definitions, at the `src` root
- `src/content/blog/` — blog posts (`.md` / `.mdx`)
- `src/content/projects/` — project write-ups (`.md` / `.mdx`)
- `src/consts.ts` — `SITE_TITLE`, `SITE_DESCRIPTION`, `GITHUB_URL`
- `src/layouts/` — page shells
- `src/pages/` — routes only; keep logic in layouts and components

**`BaseLayout.astro` owns the page chrome** — `<html>`, `<head>`, `Header`, `<main>`, `Footer`. Every page and layout goes through it; nothing else should render `<html>` or import `Header`/`Footer` directly. It takes `width="page"` (reading measure, default) or `width="wide"` (index grids).

`BlogPost.astro` and `ProjectPage.astro` wrap `BaseLayout` and add their own metadata headers.

Collections use the **glob loader**. Field lists live in `src/content.config.ts` and are summarised for authors in the README — don't restate them here, they drift.

Two things about the schemas that aren't obvious from reading them:

- They take the **`({ image })` form**, so `heroImage` resolves to an optimized asset rather than a bare path. A plain `z.string()` would typecheck and then skip image optimization entirely.
- A missing required field **fails the build**. That's intentional; don't loosen a schema to silence an error.

**Drafts** (`draft: true`) are visible in `astro dev` and excluded from production builds, via `import.meta.env.PROD` in both `projects/index.astro` and `projects/[...slug].astro`. Both need the filter — the listing and the route are separate queries, and filtering only one leaves an orphaned page or a dead link. `blog` has no draft field yet; add it to both places if you introduce one.

## Conventions

- **Tailwind only.** No new `.css` files, no `<style>` blocks in components. `src/styles/global.css` is the single stylesheet.
- **Fonts are configured in `astro.config.mjs`**, not CSS. Atkinson is self-hosted via Astro's font API and exposed as `--font-atkinson`. Wire that variable into the Tailwind theme; don't re-import the font or hardcode `@font-face`.
- Images go through `astro:assets` (`<Image />`), never bare `<img>`.
- Prefer `.astro` components. Framework components only for real client-side interactivity.
- `site:` in `astro.config.mjs` drives sitemap, RSS, and canonical URLs.

## Theming

Design language is carried over from the previous katomatik.com: charcoal `#454545` + whitesmoke, retro-web framing, playful hover motion. **Dark is the default theme**, light is the alternate.

All colors go through semantic tokens defined in `src/styles/global.css`:

`page` · `raised` · `edge` · `ink` · `ink-muted` · `accent` · `outline`

Use them as normal Tailwind utilities — `bg-page`, `text-ink`, `border-edge`.

- **Never write `dark:` variants.** Token values flip under `:root[data-theme]` and `prefers-color-scheme`, so one set of utilities covers both themes. Writing `dark:` doubles every color decision and is the thing this setup exists to avoid.
- **Never hardcode a hex** in a component. If a shade is missing, add a token.
- Theme is selected by `data-theme="light"|"dark"` on `<html>`. An `is:inline` script — the **first element in `<head>`** — resolves `localStorage` → system preference → dark and sets the attribute before first paint. Move it, bundle it, or let Astro defer it and you reintroduce a flash of the wrong theme on every load.
- `ThemeToggle.astro` owns the click, persists to `localStorage.theme`, and keeps `aria-label` in sync. Both `localStorage` reads and writes are wrapped in `try/catch` — it throws outright in some privacy modes.
- `theme-dark:` / `theme-light:` variants exist for elements that differ **structurally** between themes (the sun/moon icons). They are not an escape hatch for colors — colors still go through tokens.

Custom utilities salvaged from the old site, defined via `@utility`:

- `wavy` — the hand-drawn sine-wave divider. Rebuilt as a mask so it inherits `currentColor` instead of the old hardcoded white stroke.
- `frame` — the `6px ridge` retro picture frame, for project and post thumbnails.

A global `prefers-reduced-motion` guard neutralizes animation; don't reintroduce motion that bypasses it.

Notes:

- `body` is a flex column with `min-height: 100svh`, and `Footer` uses `mt-auto` — that's the sticky footer. Don't give the footer a fixed `mt-*`, it breaks the push.
- **Contrast is verified** — every text token pair passes WCAG AA in both themes (lowest is light `accent` at 4.58:1). `edge` is decorative only (borders, dividers, `frame`) and is deliberately below 3:1; don't use it for text or for anything that carries meaning on its own.
- **Code blocks are Shiki's theme**, inlined by Astro, so they ignore `--tw-prose-pre-bg` and stay dark in both themes. Change via `markdown.shikiConfig` in `astro.config.mjs`, not CSS.

## Gotchas

- **Astro 7's Rust compiler is strict about HTML.** Unclosed non-void tags are build errors, not warnings. Tutorials predating v7 will steer you wrong.
- **Do not install `@astrojs/tailwind`** — that's the Tailwind 3 integration. This project uses `@tailwindcss/vite` via `astro add tailwind`.
- Docs and blog posts older than Astro 5 show `src/content/config.ts` and `type: 'content'`. Both are outdated.
- Astro's own content-collections docs show `src/data/<collection>/` as the glob base. **This project uses `src/content/blog/`** — match the repo, not the docs.
- Fully static: content changes need a rebuild and redeploy. No runtime CMS.

## Deployment

Build and release are split across repos on purpose:

| Repo                       | Owns                                     |
| -------------------------- | ---------------------------------------- |
| `katomatik-web` (this one) | Source, Dockerfile, image build          |
| `homelab`                  | k8s manifests, cloudflared ingress route |

- **Image:** multi-stage — `node:24-alpine` builds, `nginx:alpine` serves `/usr/share/nginx/html` on port **8080** (not 80, so the container can run as non-root). ~94MB, no Node in the final image.
- **Multi-arch:** built for `linux/amd64,linux/arm64` via buildx. The cluster node is arm64 (Apple silicon / Asahi); a single-arch amd64 push leaves the kubelet with no matching manifest and the pod stuck in `ImagePullBackOff`. CI adds `setup-qemu-action` so the amd64 runner can build the arm64 stage under emulation.
- **CI:** `.github/workflows/ci.yml` builds on every push and PR, pushes to **GHCR** only on push to `main`. Tagged by commit SHA, never `latest` — a k8s rollout must reference an immutable tag.
- The image build runs `npm run build`, which runs `astro check`, so a type error fails CI without a separate step.
- This repo stays unaware it runs on Kubernetes.

nginx config lives in `docker/nginx.conf`. Three things there are load-bearing:

- **`absolute_redirect off`** — without it nginx builds redirect URLs from its own listen port, so `/blog` sends visitors to `http://host:8080/blog/`, unreachable through the Cloudflare Tunnel.
- **`try_files $uri $uri/ $uri.html =404`** — no SPA fallback. A bad URL must 404, not silently render the homepage.
- **Cache split** — `/_astro/` is immutable for a year (fingerprinted); `.html` is `no-cache` so deploys reach returning visitors. Set `Cache-Control` via `add_header` only; adding `expires` too emits a second, conflicting header.

**GHCR packages do not inherit repo visibility** — they have their own setting. This one is public, so the cluster pulls with no `imagePullSecret`. A new `katomatik-*` package will default to private and need the same change.

Sibling `katomatik-*` services get their own repos. Deliberately not a monorepo — no shared language or dependency tree.

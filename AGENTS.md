# katomatik-web

Static site for **katomatik.com**.

## Stack

- **Astro 7** (`^7.1.2`) — static output, no SSR adapter
- **Tailwind 4** via `@tailwindcss/vite`
- **TypeScript** — `astro/tsconfigs/strict` + `strictNullChecks`
- `@astrojs/mdx`, `@astrojs/sitemap`, `sharp`
- Node `>=22.12.0`
- Deployed as a container to k8s, fronted by Cloudflare Tunnel

## Development

`astro` is a local dependency, not a global binary — prefix with `npx` (or use the
`package.json` scripts). Start the dev server in background mode:

```bash
npx astro dev --background    # serves http://localhost:4321
npx astro dev status | logs | stop
```

```bash
npm run dev           # foreground dev server
npm run check         # astro check — typechecks .astro files, not just .ts
npm run format        # prettier --write .
npm run format:check  # prettier --check . (for CI)
npm run build         # astro check && astro build → ./dist
npm run preview       # serve ./dist locally
```

`build` runs `astro check` first, so a type error fails the build rather than shipping. That costs roughly 7s over a bare `astro build`; worth it, and it means CI needs no separate typecheck step. Vite alone does **not** typecheck — without `astro check`, a bad component prop builds and deploys silently.

## Formatting

Prettier owns formatting — tabs, single quotes, semicolons. Config in `.prettierrc.mjs`.

- **`prettier-plugin-tailwindcss` must stay last** in the `plugins` array. It wraps the other plugins; anywhere else and class sorting silently stops running with no error.
- It sorts Tailwind classes into a canonical order. Class attribute order never affects CSS (the cascade comes from stylesheet order), so this is purely cosmetic and safe.
- **`src/content/` is excluded** — Prettier re-indents fenced code samples inside posts, rewriting example code the author wrote deliberately. Content is authored, not code.
- Formatting is **not** wired into `build`. A formatting nit shouldn't block a deploy the way a type error should; run `format:check` in CI as its own step.

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

Collections use the **glob loader**. The blog schema takes the `({ image })` form so `heroImage` resolves to an optimized asset rather than a bare path:

```ts
const blog = defineCollection({
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
		}),
});
```

Adding a frontmatter field means updating the Zod schema. A missing required field fails the build — that's intentional. Don't loosen the schema to silence an error.

The `projects` collection has its own schema: `title`, `description`, `startDate`, `status` (`active` | `paused` | `shipped`), `tags`, `repoUrl`, `liveUrl`, `heroImage`, `draft`.

**Drafts** (`draft: true`) are visible in `astro dev` and excluded from production builds, via `import.meta.env.PROD` in both `projects/index.astro` and `projects/[...slug].astro`. Both need the filter — the listing and the route are separate queries, and filtering only one leaves an orphaned page or a dead link. `blog` has no draft field yet; add it to both places if you introduce one.

## Conventions

- **Tailwind only.** No new `.css` files, no `<style>` blocks in components. Anything still carrying template CSS is pending conversion, not a pattern to copy.
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
- `bounce-hover` — the hover hop, halo themed via `--color-outline`.

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

- **Image:** multi-stage — `node:lts` builds, `nginx:alpine` serves `/app/dist` on port **8080**. No Node in the final image.
- **CI:** GitHub Actions → **GHCR** on merge to `main`, tagged by commit SHA (not `latest`) so rollouts are deterministic.
- This repo stays unaware it runs on Kubernetes.

Sibling `katomatik-*` services get their own repos. Deliberately not a monorepo — no shared language or dependency tree.

## Setup still pending

- [x] `astro add tailwind`
- [x] Token layer + theme switching in `global.css`
- [x] `@tailwindcss/typography`, wired to the tokens via `.prose`
- [x] Convert all `<style>` blocks to Tailwind utilities — none remain in `src/`
- [x] `SITE_TITLE` / `SITE_DESCRIPTION`
- [x] Theme toggle, persisted, no flash on load
- [ ] `GITHUB_URL` in `consts.ts` is empty — header link stays hidden until set
- [ ] `site:` is still `https://example.com` → `https://katomatik.com`
- [ ] Real homepage content (`index.astro` is title + description only)
- [ ] `about.astro` is still lorem ipsum
- [ ] Replace 5 sample posts and placeholder images in `src/assets/`
- [x] `projects` collection, listing, detail route, draft filtering
- [x] Extract `BaseLayout.astro` so page chrome lives in one place
- [x] Verify contrast — all text pairs pass WCAG AA in both themes (lowest: light accent 4.58:1)
- [ ] Dockerfile, GitHub Actions workflow

## Astro documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

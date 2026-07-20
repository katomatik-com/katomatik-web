# katomatik-web

[![CI](https://github.com/katomatik-com/katomatik-web/actions/workflows/ci.yml/badge.svg)](https://github.com/katomatik-com/katomatik-web/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/katomatik-com/katomatik-web)](LICENSE)

Static site for [katomatik.com](https://katomatik.com) — projects and blog.

Built with [Astro](https://astro.build) and Tailwind, output as static HTML,
served from a container.

## Quick start

Requires Node 24 (see `.nvmrc`).

```sh
npm install
npm run dev        # http://localhost:4321
```

## Commands

| Command                | Action                           |
| :--------------------- | :------------------------------- |
| `npm run dev`          | Dev server at `localhost:4321`   |
| `npm run build`        | Typecheck, then build to `dist/` |
| `npm run preview`      | Serve the built site locally     |
| `npm run check`        | Typecheck `.astro` files         |
| `npm run format`       | Format with Prettier             |
| `npm run format:check` | Check formatting without writing |

`build` runs `check` first, so a type error fails the build. Vite alone does
not typecheck.

## Adding a post

Create a Markdown file in `src/content/blog/`. The filename becomes the URL
(`my-post.md` → `/blog/my-post/`).

```markdown
---
title: 'Post title'
description: 'One or two sentences. Used for the meta description and RSS.'
pubDate: 2026-07-20
---

Write here.
```

Optional: `updatedDate`, and `heroImage` pointing at a file in `src/assets/`.

## Adding a project

Same idea, in `src/content/projects/`.

```markdown
---
title: 'Project name'
description: 'What it is, in a sentence.'
startDate: 2026-07-20
status: 'active' # active | paused | shipped
tags: ['astro', 'kubernetes']
draft: false
---

Write here.
```

Optional: `repoUrl`, `liveUrl`, `heroImage`.

**Drafts** (`draft: true`) show in `npm run dev` and are excluded from the
production build — useful for writing something over several sittings.

Frontmatter is schema-checked, so a missing or misspelled field fails the build
rather than silently rendering wrong. The schemas are in `src/content.config.ts`.

## Structure

```text
src/
├── content/        # blog posts and project write-ups (Markdown)
├── layouts/        # BaseLayout owns the page chrome; others wrap it
├── components/
├── pages/          # routes
└── styles/         # global.css — design tokens and theming
docker/             # nginx config for the container image
```

## Deployment

Pushing to `main` builds a container image and publishes it to GHCR, tagged by
commit SHA:

```text
ghcr.io/katomatik-com/katomatik-web:<sha>
```

Kubernetes manifests live in the `homelab` repo, not here.

## More

- [`AGENTS.md`](AGENTS.md) — project conventions and the reasoning behind them
- [Astro docs](https://docs.astro.build)

## License

Code is [MIT](LICENSE).

Site content — blog posts, project write-ups, images — is © Katomatik and not
covered by that license.

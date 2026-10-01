# Second Brain Cockpit

Personal dashboard that reads an Obsidian vault network (read-only) and layers mutable state — habits, inbox, weekly checklist, priority order — on top via SQLite.

## Stack

Next.js 16 (App Router) · Prisma + SQLite · single process, port 3005.

## Develop

```bash
npm install
npm run dev        # http://localhost:3005
npm run db:push     # apply prisma/schema.prisma to SQLite
npm run db:studio   # inspect the DB
```

No test suite.

## Configure

Everything vault-related lives in `vault.config.js` — vault ids, labels, paths, pillar colors, and the central vault. To add a vault: add an entry to `config.vaults`, drop a `STATUS.md` at that vault's root, and add its id to the color maps in `components/PriorityPanel.jsx` and `components/HabitPanel.jsx` (keys must match vault ids).

`STATUS.md` (YAML frontmatter) is owned by Obsidian — the app never writes to it except non-habit field edits via the PATCH API. Habit *keys* come from `STATUS.md`; daily checked state lives in SQLite (`HabitHistory`), so a habit auto-resets each day by absence of a row.

See `CLAUDE.md` for the full architecture/data-flow breakdown.

## Deploy

`Dockerfile` builds a standalone Next.js image; `docker-compose.yml` mounts the vaults read-only and persists the SQLite file on a named volume.

```bash
docker compose up -d --build   # local build
```

### Auto-deploy on push (GHCR + Watchtower)

`.github/workflows/deploy.yml` builds and pushes `ghcr.io/totorios99/atrium` on every push to `main`. On the host, `docker-compose.yml` pulls that image and a `watchtower` service polls the registry every 5 minutes, recreating the container when a new tag lands — no inbound webhook or self-hosted runner needed.

```bash
docker compose up -d   # first run on the host; watchtower takes it from here
```

If the GHCR package is private, `docker login ghcr.io` on the host once with a PAT (`read:packages` scope).

### CasaOS

`docker-compose.yml` carries an `x-casaos` block (icon, title, category, port), so it can be imported directly as a CasaOS app card.

### iOS home screen

`public/manifest.json` + `apple-touch-icon.png` make "Add to Home Screen" launch standalone with a proper icon instead of a bookmarked browser tab.

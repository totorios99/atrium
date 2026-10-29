# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Next.js dev server on port 3005
npm run build      # prisma generate + next build
npm run start      # production server on port 3005
npm run db:push    # push Prisma schema changes to SQLite
npm run db:studio  # open Prisma Studio
```

No test suite exists.

## Architecture

**Second Brain Cockpit** — personal dashboard that reads Obsidian vault files (read-only) and stores mutable state in SQLite via Prisma.

### Single-process runtime

Next.js 16 App Router on **port 3005**. API routes live in `app/api/`. No separate Express server.

### Configuration

`vault.config.js` — sole place for vault paths and central vault. Every other file imports from it. To add a vault: add entry to `config.vaults`, add `STATUS.md` at vault root, and add its id to the color maps in `PriorityPanel.jsx` / `HabitPanel.jsx` (keys must match vault ids).

### Data sources

| Data | Storage | API |
|------|---------|-----|
| Vault status / projects | `<vault>/STATUS.md` (YAML frontmatter, read-only) | `GET /api/status` |
| Habit checked state (daily) | SQLite `HabitHistory` | `GET /api/status`, `PATCH /api/status/[vaultId]` |
| Habit history (7-day) | SQLite `HabitHistory` | `GET /api/habits/[vaultId]/history` |
| Inbox items | SQLite `InboxItem` (+ `InboxMedia`, files in `MEDIA_DIR`) | `/api/inbox`, `/api/inbox/[id]`, `/api/inbox/[id]/media`, `/api/inbox/media/[file]` |
| Weekly checklist + archive | SQLite `WeeklyItem` | `/api/weekly`, `PATCH /api/weekly/[id]` |
| Pinned priorities | SQLite `Setting` (key `priority_pins`) | `/api/priority-order` |
| Hype hero clips | `HYPE_DIR` (`/srv/media/hype`, `:ro` mount at `/hype`): `manifest.json` + `clips/<id>.mp4/.jpg`, written by homelab's `hype-add.sh` | `GET /api/hype/manifest.json`, `GET /api/hype/clips/<file>` (HTTP Range → 206, needed by Safari) |

### Prisma schema (`prisma/schema.prisma`)

```prisma
model InboxItem    { id, text, tag, body?, meta? (JSON str), source, createdAt, media[] }
model InboxMedia   { id, itemId → InboxItem (cascade), file, mime, createdAt }
model WeeklyItem   { id, weekKey, label, status, pos, completedAt? }
model Setting      { key (PK), value }
model HabitHistory { id, vaultId, date, habitKey, value — @@unique([vaultId, date, habitKey]) }
```

`DATABASE_URL="file:./cockpit.db"` — relative paths resolve from `prisma/` (the schema dir), so the DB file lives at `prisma/cockpit.db`.

### Key server behaviors

- **STATUS.md is read-only**: Obsidian owns these files. The app never writes to them except non-habit field edits via PATCH. Habit keys come from STATUS.md; their daily checked state lives in SQLite `HabitHistory`.
- **Habit merge**: `GET /api/status` calls `statusWithHabits()` — reads STATUS.md for habit keys, overlays today's SQLite rows. If no rows for today, all habits return `false` (auto-reset by absence).
- **Habit write**: `PATCH /api/status/[vaultId]` with `habits.*` keys upserts into `HabitHistory`; non-habit keys go to STATUS.md via dot-notation (`setNested()` from `utils/shared.js`).
- **Weekly rows are per-week**: `GET /api/weekly` looks up rows for the current ISO week key and creates them from `defaultWeeklyItems()` if missing. Marking `done` stamps `completedAt`; done rows drop out of `items` 24 h later but stay in `archive` (all weeks, newest first). Rows are addressed by id, not index.
- **Open vault**: the vault label in `PriorityPanel` is an `<a href="obsidian://open?vault=<folder>">` — opens on the viewer's device (no server route; the container has no `xdg-open`).

### Shared modules

| File | Purpose |
|------|---------|
| `lib/vault.js` | `readStatus(vault)` — reads + parses STATUS.md; `writeStatusField()`; weekly helpers (server-only, uses fs) |
| `lib/db.js` | Prisma singleton client |
| `utils/shared.js` | Pure helpers usable client+server: `getWeekNumber()`, `setNested()` |
| `vault.config.js` | Vault list, central vault path |

### Frontend data flow

```
vault STATUS.md → GET /api/status → useStatus() → App → panel components
SQLite           ↗
```

- All hooks live in `hooks/useStatus.js`: `useStatus`, `useInbox`, `useWeekly`, `usePriorityOrder`
- All `fetch()` calls centralised in `utils/api.js` — components never call `fetch` directly
- Mutations use **optimistic UI**: state updates immediately, rolls back on server error
- `useStatus` polls every 30 s. `Header` owns its own 1 s clock interval (vault panels don't re-render every second)

### Layout (`components/App.jsx`)

```
HypeHero (full width, 34vh, outside .shell)
Header (glass card):  [greeting / clock+date] | [gradient divider] | [QuoteWidget]
Main row (1fr 1fr 1fr, height 486px):  PriorityPanel | ProjectPanel | HabitPanel
Bottom row (1fr 1fr, height 384px):    InboxPanel    | WeeklyPanel
```

- No photo/polaroid widget
- `HypeHero` — motivational clip reel above the shell. Reads the manifest at runtime (new clips need no redeploy). Two layers swap: front plays, back preloads the next clip; crossfade starts `FADE_S` before the end. Each clip renders at native aspect (never cropped — subtitles/heads sit at edges) with feathered sides over a blurred poster. Scroll fades/scales it via `--hype-p` and pauses it past the band or on hidden tab. Muted until the first gesture; speaker toggle persists `hype-sound` in localStorage. Reduced motion → posters only
- `PriorityPanel` — max 5 rows (`+N more` toggle). Hides vaults with empty/placeholder `next_move`. Order: pinned (drag a row to pin it there) → auto: `blocked` → `next_move_scope` (today > this-week > someday) → oldest `last_updated`. Logic in `usePriorityOrder`. Vault label opens Obsidian; `next_move` inline-editable
- `HabitPanel` — paginated (4 habits/page); only today's pip is interactive, days 0–5 are display-only
- `ProjectPanel` milestones: short pills (`label`, 1–2 words); hover/focus shows `desc` in a shared `.ms-desc` line under the pills (no popover — card `overflow:hidden` + `backdrop-filter` would clip it)
- `ProjectPanel` / `HabitPanel` paginate with shared `Pager.jsx` (iOS chevrons + dots) pinned to the card bottom
- `InboxPanel` — subject-only list; clicking a row opens `InboxModal` (native `<dialog>`) **read-only**; "Edit" unlocks subject, notes, photo add/remove and delete. Photos open in `PhotoViewer`, a separate top-layer `<dialog>` (← → Esc). Polls every 30 s (Hermes posts). Tags fixed `width: 66px`
- `WeeklyPanel` — inline-edit checklist labels; `archive` toggle lists completed items with dates

### Animations (`app/globals.css`, end of file)

- Entrance: header + cards stagger in via `fadeUp` with per-card `animation-delay`
- Habit pip toggle: `pipPop` scale keyframe on `.pip.on`
- Weekly checkmark: `stroke-dashoffset` draw-in on `.check-item.done`
- `prefers-reduced-motion: reduce` kills all animation/transition durations — keep this block last in the file

### Panel height pattern

Cards use `height: 486px` / `height: 384px` with `display:flex; flex-direction:column; overflow:hidden`. Inner scroll region uses `.card-scroll { flex:1; min-height:0; overflow-y:auto }`.

### Docker

```dockerfile
# runner stage needs Prisma CLI's full dep tree for db push on startup —
# copy whole node_modules from the deps stage, not a hand-picked subset
# (@prisma/config -> effect -> fast-check -> ... shifts between versions).
# Must come BEFORE the .prisma copy — deps never ran `prisma generate`,
# so its node_modules/.prisma would otherwise clobber the generated client.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma  ./node_modules/.prisma
CMD ["sh", "-c", "node node_modules/prisma/build/index.js db push --skip-generate && node server.js"]
```

Vault directories mount `:ro` (read-only). SQLite file must be on a writable volume (`DATABASE_URL=file:/data/cockpit.db` in compose).

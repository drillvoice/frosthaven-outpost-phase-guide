# Frosthaven Outpost Phase guide

A small, offline-capable, mobile-first checklist for stepping through the
Frosthaven Outpost Phase at the table (rulebook pp. 59–68).

- Five phases as collapsible sections; the first unfinished one is "active"
  and opens automatically. Tap any heading to open or close it.
- Toggles sit directly under the step that raises the question (e.g. "Check
  the back for an attack" → *attack?*) and show or hide the steps that
  follow. Season is a Summer | Winter selector. Toggles marked **kept**
  carry over to the next Outpost Phase; the rest reset.
- Downtime repeats for each party member, with their own toggles.
- Tap ⓘ on a step for a short reminder and a **house notes** box. Notes are
  kept across phases (a dot on ⓘ means a note exists).
- **Start new Outpost Phase** logs the current one (date, optional note) and
  clears ticks. Party, notes and kept toggles stay.
- Everything is saved on the device automatically. *Log & settings* has
  backup export/import and light/dark mode.

## Editing steps

All steps, reminders and toggles live in
[`src/data/outpost-phase.ts`](src/data/outpost-phase.ts). Each step has:

| field          | meaning                                                          |
| -------------- | ---------------------------------------------------------------- |
| `id`           | stable key for ticks and house notes (renaming orphans notes)    |
| `title`        | the checklist text                                               |
| `reminder`     | 1–2 lines; refer to page/card numbers, never copy card text      |
| `when`         | `{ all: [...flags on], none: [...flags off] }`; hidden otherwise |
| `optional`     | shows an "optional" badge                                        |
| `perCharacter` | repeat for every party member                                    |
| `group`        | sub-heading (e.g. "Attack")                                      |
| `asks`         | toggle ids shown inline under this step                          |

Toggles are defined in `flags` at the top of the same file, with a `scope`
of `phase` (resets each Outpost Phase), `character` (per character, resets)
or `campaign` (kept). Show a toggle under the step that raises it with
`asks`, or at the top of a phase via the phase's `flags` array (for things
known before the phase starts). Give a toggle `choices: ['Summer', 'Winter']`
to show a two-way selector instead of a switch. Run `npm test` after editing: it catches unknown flag names,
duplicate ids, and phases that could end up with no visible steps.

## Development

```sh
npm install
npm run dev      # http://localhost:5173 (also reachable on your LAN)
npm test         # unit tests (logic, state, data checks)
npm run test:e2e # browser tests on a phone-sized Chromium (builds first)
npm run check    # everything CI runs
npm run build    # static site in dist/
npm run preview  # serve the production build (service worker active)
```

Stack: Vite + Preact + TypeScript + vite-plugin-pwa (Workbox). About 15 KB of
gzipped JS.

### Tests

- `src/**/*.test.ts` (Vitest): step data sanity checks, checklist logic,
  state actions, saving/loading, and compatibility with saved data.
- `e2e/` (Playwright): full Outpost Phase walk-through, toggles, resume
  after reload, groups by URL, and offline use, against the production
  build with its service worker.
- `src/state/__fixtures__/save-v1.json` is a frozen copy of saved data.
  Don't edit it; when the saved shape changes, bump `schemaVersion`, add a
  migration and a new fixture, and keep the old one loading.

The CI workflow runs all of this on every pull request.

### Code layout

```
src/data/     step definitions (content only)
src/logic/    pure functions: visible steps, progress, active phase
src/state/    actions + reducer, storage adapter, schema migration
src/ui/       Preact components (read state, dispatch actions)
src/route.ts  #/g/<group> hash routing
```

Each group's state is stored under its own key, and the URL is
`…/#/g/<group>` (default `local`). Saved data is all keyed maps and every
change is a named action, so a future sync layer (shared group URL +
password, backed by e.g. Supabase or a Cloudflare Worker) can implement the
`StorageAdapter` interface in `src/state/storage.ts` without touching the
checklist. Campaign tracking (resources, buildings, calendar,
morale/prosperity) would be a new `campaign` slice of `AppState` that can
derive toggles such as `winter` automatically.

## Deploying

The build is a static folder with relative paths, so it works at a domain
root or a sub-path.

**GitHub Pages:** merge to `main`, then go to *Settings → Pages → Build and
deployment → Source: GitHub Actions*. The included workflow
(`.github/workflows/deploy.yml`) tests, builds and publishes on every push
to `main`. The site appears at
`https://<user>.github.io/frosthaven-outpost-phase-guide/`. (Pages on a
private repo needs a paid GitHub plan; otherwise use Netlify.)

**Netlify:** *Add new site → Import an existing project*, pick the repo;
`netlify.toml` supplies the build settings. Or run `npm run build` and drag
the `dist/` folder onto app.netlify.com/drop.

## Installing on a phone

Open the site once while online, then:

- **iPhone (Safari):** Share → *Add to Home Screen*.
- **Android (Chrome):** ⋮ menu → *Install app* / *Add to Home screen*.

After that it works fully offline. New versions install automatically the
next time it's opened online (close and reopen to pick them up).

Progress is stored per device. Until sync exists, use one "table phone", or
move data between phones with Export/Import backup.

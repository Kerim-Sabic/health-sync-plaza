<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- All app data goes through the `Api` interface in `src/lib/api.tsx` (live = Lovable Cloud with RLS, demo = in-memory seeded store); screens never call the backend directly, so the demo preview and real accounts share every screen.
- Signed-in app lives under `/app` (client-only, `ssr: false`); its `beforeLoad` allows demo mode via a sessionStorage flag, otherwise requires a session.
- Account type is stored in `user_roles` (chosen once at onboarding); trainer access to client data is granted only through `trainer_clients` rows created by the client.
- Shared app-shell state (log sheets, live workout session) lives in `src/components/strata/shell.tsx` context, never exported from route files — route code-splitting duplicates module-level contexts and silently breaks buttons.
- UI primitives (Panel, Stat, Bars, SaveButton, Segmented, IconScale, Skeleton) in `src/components/strata/ui.tsx` own motion: intro animations play once per session via `useIntro`; use type-scale tokens (`text-display`…`text-caption`) for readable labels and numbers.
- Register the semantic type scale as font-size classes in the shared Tailwind merge utility so text-color classes cannot silently erase typography.
- Session helpers (haptics, sound, plate math, rest learning, share card, body map) live in `src/components/strata/session-extras.tsx`; UI-only prefs are stored in localStorage under `strata:` so no schema changes are needed.
- Train exercise detail is isolated in `train-detail.tsx`, with read-only strength projections in `train-history.ts` reusing the session estimate helper; this keeps recorded sets unchanged and estimates consistent.
- Fuel uses explicit date-bound drafts through the existing Api for reviewed copies and recent-food suggestions; source entries remain immutable and partial-copy retries skip completed entries. Water preferences are account/mode scoped with legacy reads to preserve prior local tracking.
- Recover renders read-only calendar projections from existing sleep and journal records; isolated sleep scrubbing and breathing UI never write logs, while logging stays in the shared shell sheets to preserve account/demo behavior.
- Progress charts live outside route modules and use read-only projections; recaps and milestones are derived from existing logs, while private photos and stored report summaries retain their original API flows.
- Program exercise prescriptions are optional fields in existing program-day JSON; edits update the same program through Api under existing RLS, preserving assignment IDs and completed workouts. Session prefill favors prescribed weight (including zero), applies lighter-day adjustment, and honors prescribed rest without overriding it with learned progression.
- Coach overview and client rows use read-only attention projections; swipe or button kudos opens a reviewed note sent through the existing Api.addNote flow, never a new messaging store.
- Live-session lifecycle (pause, rest, staleness, unfinished handling, save payload) lives as pure functions in `src/lib/session-state.ts`; UI only calls them, so timing rules stay testable and persisted sessions restore exactly.
- Log deletions use `useRemoveWithUndo` in `swipe-delete.tsx` (Api.remove, Undo re-inserts the same values); editing a workout saves by insert-then-remove with the original date, never by schema changes.
- Coach/personal navigation is UI-only context in `app-view.tsx`, persisted per account and API mode; it never changes roles, API identity, permissions or log ownership.
- Program lists reuse `ProgramSummary` and `searchPrograms`; client-page creation saves through Api then assigns the returned ID, retaining the ID for assignment-only retries to avoid duplicate programs.
- Profile customization stays behind Api with private signed avatar URLs and owner uploads; every role uses the same profile editor and demo overrides remain isolated from live data.
- Barcode lookup uses a fixed Open Food Facts URL in a server function exposed through Api; camera decoding is dynamically loaded, portions are reviewed before existing nutrition inserts, and incomplete labels never become fabricated zero macros.
- Design system "Obsidian" (dark, default) and "Porcelain" (light) lives in `src/styles.css` as tokens on `:root` / `[data-theme]`; legacy aliases are redeclared on every themed scope so nested themes resolve. Volt is a signal only (primary action, live state, records, goals). Use `panel`/`elev-*`/`glass`, `text-faint` for meta, and the four radii (`rounded-sm|tile|card|sheet`). `/styleguide` (dev only) shows every token and primitive.
- All motion imports `src/lib/motion.ts` (durations, eases, springs, `press`, `stagger`, `useIntro`). Animate transform/opacity/filter only; intros play once per route per session; wrap server-rendered previews in `IntroOff` so they hydrate in their final state. Haptics go through `src/lib/feedback.ts`.
- App chrome (tab bar, desktop sidebar, log hub, demo chip, page transitions, edge-swipe back, pull-to-refresh, launch shortcuts) lives in `app-chrome.tsx`; ⌘K is `command-palette.tsx`. Page transitions are entrance-only and directional; tabs keep their own scroll position.
- The live session is split under `components/strata/session/` (logic, controls, ExerciseCard, panels, SessionComplete); `session.tsx` re-exports the public API. Components that animate must never be declared inside a render function (the session re-renders four times a second).
- Theme preference is per device under `kinra:theme`, applied before paint by `themeBootScript`; the landing and auth pages are always dark.
- Coach and client messages share `trainer_notes` (`from_client` marks client replies, `Api.reply`, live via `Api.subscribeNotes`). Weekly check-ins use `check_ins` (`Api.checkIns/submitCheckIn/replyCheckIn`); a trigger stops coaches changing client answers. Both need migration `0003`; until it is applied, live reads return empty and writes explain the migration is needed. Demo mode implements everything in memory.
- Charts use `ScrubChart`/`Heatmap` in `charts.tsx` (no recharts on screens). PWA: `public/manifest.webmanifest`, generated icons, and a production-only `public/sw.js` (offline app shell, background rest notifications).


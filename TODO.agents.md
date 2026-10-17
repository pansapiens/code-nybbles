# TODO (agents)

Working task list for implementing the plans in [`plans/`](plans/). Section references like `01 §3.7` mean
`plans/01-product-and-architecture.md` section 3.7; `02` is the syllabus, `03` the content format.

Conventions:
- `[ ]` todo, `[~]` in progress / partial, `[x]` done. Add new subtasks under the task they came from, tagged `(new)`.
- Commit at each milestone or coherent chunk of work (user request, 2026-10-17).
- Update the "Session log" at the bottom at the end of every session.

## Repo layout (as built)

```
package.json, pnpm-workspace.yaml   # pnpm workspace: app, tools/content-build
app/                                # Vue 3 + Vite + TS PWA
  src/domain/                       # pure TS game rules, no Vue/Dexie imports (01 §5.2)
  src/db/                           # Dexie schema (commit()/rebuildDerived() in M2)
  src/content/loader.ts             # fetch manifest + section bundles (BASE_URL-relative)
  src/styles/tokens.css, base.css   # design tokens (01 §4.1)
  src/stores/                       # Pinia: settings (theme persisted), game (HUD placeholder)
  src/components/                   # base UI components
  src/views/                        # screens
tools/content-build/
  schema.ts                         # zod content schema; app imports types via @code-nybbles/content-build/schema
  build.ts                          # load -> validate -> cross-check -> verify -> emit (CLI + buildContent())
  verify.ts                         # rust-verify driver: rustc per snippet, cached outcomes
  build.test.ts                     # node:test fixtures that must pass/fail
tools/rust-verify/                  # rust-toolchain.toml pin (1.98.1), cases/ and .cache/ (gitignored)
content/                            # authored course content (03 §2)
```

Commands (from repo root): `pnpm content:build`, `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm type-check`;
in `app/`: `pnpm test:e2e`, `pnpm lint`, `pnpm lint:style`.

Local environment note: this machine's PATH `cc` is micromamba's conda gcc (old sysroot), which can't link
Rust std. Run content builds/tests with `RUST_VERIFY_LINKER=/usr/bin/gcc`. CI doesn't need it.

---

## M0: Foundations (01 §9 M0)

- [x] Scaffold Vite + Vue + TS + Pinia + router + Vitest + Playwright + ESLint/Prettier (create-vue)
- [x] pnpm workspace at root; git repo
- [x] Install vite-plugin-pwa, Dexie, zod, Reka UI, fake-indexeddb (tests)
- [x] Licences: `LICENSE-MIT`, `LICENSE-APACHE` at root; `content/LICENSE` (01 §13)
- [x] README with dev commands
- [x] Vite `base: '/code-nybbles/'`, router `createWebHistory(import.meta.env.BASE_URL)` (01 §5.5)
- [x] Design tokens light/dark in `styles/tokens.css`, `base.css` (01 §4.1)
  - (new) Uses CSS `light-dark()` + `color-scheme`, so one token block serves light, dark and system
  - [ ] (new) In-app "animations off" setting should apply the reduced-motion rule (`data-motion` attr) (01 §4.3.10)
  - [ ] (new) Limit precached font subsets to latin (currently all subsets, ~445 KiB precache)
  - [x] Self-hosted fonts: Nunito + JetBrains Mono (offline; via @fontsource)
  - [x] Theme switch: `[data-theme]` attribute set from localStorage before first paint (01 §5.1 "tiny flags")
- [x] Base components (01 §4.1, §9 M0)
  - [x] `DuoButton` (primary/secondary/danger/correct, ledge press, disabled)
  - [x] `AnswerTile` (idle/selected/correct/wrong/disabled)
  - [x] `HudChip` (streak/gems/hearts)
  - [x] `ProgressBar` (highlight stripe)
  - [x] `BottomSheet` (Reka UI Dialog)
  - [x] `TabBar` (mobile bottom tabs) + desktop sidebar -> one `AppNav.vue`, layout switched in CSS
  - [x] (new) `AppIcon` inline-SVG icon set (placeholder art; replace with designed icons)
  - [x] (new) `TopHud`; dev-only gallery at `/dev/components`
  - [x] `CodeCard` (monospace, horizontal scroll, font-size setting; highlighting comes in M1)
- [x] App shell: top HUD, bottom tabs, desktop sidebar + right rail at >= 1024px, routing skeleton (01 §4.2)
  - [x] Placeholder views: Learn, Practice, Shop, Profile, Settings, Lesson, Streak, Onboarding
- [x] PWA: manifest (01 §5.3), icons (192/512 + maskable), SW precache, `registerType: 'prompt'` update toast
  - Icons are a placeholder "four bits" mark (`public/icons/icon.svg`); real artwork with the mascot task
  - (new) Theme init is `public/theme-init.js` (not inline) so the CSP can forbid inline scripts
  - [x] Copy `index.html` -> `404.html` at build; `.nojekyll` (01 §5.5)
  - [x] CSP `<meta>` tag allowing `connect-src play.rust-lang.org` (01 §5.5)
- [x] Dexie schema `db/schema.ts` (01 §6) with namespaced DB name `code-nybbles`
  - Deviation: per-day streak status lives only in `StreakState.days` (not also `DailyStat.status`), single source of truth
- [x] Domain layer foundations (pure TS, unit-tested)
  - [x] `domain/dates.ts`: `LocalDate` arithmetic, date-only (no ms/86400000), `toLocalDate(ts, tz)`
  - [x] `domain/streak.ts`: `reconcileStreak`, `onSessionCompleted`, milestones, bounded loop (cap 400 days) (01 §3.4-3.7)
    - Also: starter freezes, `canRepair`/`repairCost`/`repairStreak`, earn-back (3 sessions same day), `isStreakAtRisk`
    - Pure: returns `{ state, events }` instead of emitting
    - [ ] (new) Forward timezone travel across the date line can skip a local date entirely; forgive it
      (01 §3.7 "accept the day if any event exists on either local date"). Needs event tz data in reconcile.
    - Milestones after 365 are every multiple of 100 (400, 500, ...); plan wording was ambiguous
  - [x] `domain/ids.ts`: UUIDv7 (01 §9.4)
- [x] Stylelint rule: no raw hex colours in components (01 §4.7)
- [x] Playwright: Pixel-sized project; offline smoke test of the built shell (01 §10)
  - Runs against `vite preview` of the production build; projects `mobile` (Pixel 7) and `desktop`
- [x] GitHub Actions: type-check, unit tests, build, deploy to Pages (01 §5.5) - `.github/workflows/deploy.yml`
  - [ ] (new) Not yet run: needs a GitHub remote (`pansapiens/code-nybbles`) and Pages source set to "GitHub Actions"
  - [ ] (new) Add content-build + rust-verify steps once they exist (M1)
- [~] Done-check: installable, offline-loading shell on mobile viewport; Lighthouse PWA checks pass
  - Offline reload verified by e2e; Lighthouse not yet run

## M1: Content pipeline + lesson engine (01 §9 M1, 03)

- [x] Content zod schema `tools/content-build/schema.ts` (03 §2), types inferred for app via `z.output`
  - [x] course.yaml, concepts.yaml, section.yaml, unit.yaml (path entries, sources), level.yaml, lessons, exercises
  - [x] Exercise schemas for the 10 MVP types (03 §1); `.strict()` objects so typos in field names fail
  - [x] Compiled output types (`CompiledSection`, `ContentManifest`, `verified.compilerOutput/stdout`)
  - (new) Added `expectErrorMessage` (substring) for compile errors without a code, e.g. missing `;`
  - (new) `spot-bug.answer` is a 1-based line number (token-level spotting later if needed)
  - (new) `hidden` is `{ before, after }`
  - [ ] (new) Schemas for Code Read and Build files (path entries are accepted but skipped with a warning)
- [~] `content-build`: parse YAML + Markdown, validate, cross-checks (03 §4.1)
  - [x] Unique IDs; concept refs exist; answers present in options/banks; >= 2 distractors; no duplicate options
  - [x] (new) Answers checked against reality: predict-output answer == real stdout; `compiles` answer agrees
    with the verify mode; decode-error must be compile-fail; fill-tokens markers <-> blanks; parsons orders
  - [x] Lesson length 8-15; level 3-5 lessons; unit has a checkpoint (warnings; `--strict` makes them errors)
  - [x] Code width (> 40 cols) and line-count warnings
  - [ ] Concept taught-before-tested check along path order
  - [~] Licence allow-list for `sources:` (enforced by schema enum); [ ] generate `ATTRIBUTIONS.md` (01 §13.3)
  - [x] Emit `app/public/content/section-<id>.json` + `manifest.json` (contentVersion, hashes) (01 §5.4)
  - [ ] Build-time syntax highlighting (Shiki or Lezer) (03 §4.1)
  - [ ] Guidebook Markdown -> HTML at build time (markdown-it); currently raw Markdown in the bundle
  - [ ] Turn on `--strict` in CI once the vertical slice meets the length rules
  - [ ] (new) Warn when a decode-error snippet uses `wrap: auto`/`hidden.before` (line numbers in the
    baked compiler output wouldn't match the shown code)
- [~] `rust-verify` (03 §4.2)
  - Deviation: implemented in TypeScript (`tools/content-build/verify.ts`) calling `rustc` directly, not as
    a Cargo project. One toolchain for the pipeline and no IPC; `tools/rust-verify/` keeps the toolchain pin.
    Revisit when `deps:` support needs a Cargo project.
  - [x] Generate per-case sources applying `wrap` and `hidden` (`cases/<hash>/main.rs`)
  - [x] Modes: run (10 s timeout, stdout, expectPanic), compile + compile-fail (`--emit=metadata`,
    `--error-format=json` codes), test (`--test`); `denyWarnings` -> `-D warnings`
  - [x] Pinned `rust-toolchain.toml` (1.98.1, edition from course.yaml)
  - [x] Capture rendered errors for `decode-error` (build paths stripped); cache by hash; parallel workers
  - [x] Toolchain/link failures are reported with a hint and never cached
  - [x] `node --test` fixtures (`build.test.ts`)
  - [ ] `deps:` cases in a shared Cargo project (later; needed from Section 2.4 `rand`)
  - [ ] Guidebook ```rust blocks with mdBook annotations (03 §4.3)
  - [x] Parsons `alternatives` orders verified via harness
  - [ ] Weekly CI job against latest stable reporting drift (03 §4.2)
- [ ] Lesson player: queue, CHECK -> feedback sheet -> CONTINUE, mistake re-queue, progress bar, exit confirm (01 §4.3.4)
  - [ ] `domain/lesson-planner.ts` -> `LessonPlan` (03 §6)
  - [ ] `exercises/registry.ts` (renderer + grader per type)
- [ ] Renderers + graders: concept, mcq, predict-output, fill-tokens, parsons, compiles, spot-bug, match-pairs, decode-error, true-false
- [ ] Sound (Web Audio) + haptics (`navigator.vibrate`) services, settings toggles
- [ ] Dev routes: `/dev/content/:levelId`, exercise gallery with answers (03 §5)
- [~] Content: Section 1, Units 1.1-1.2 vertical slice (02 §4)
  - [x] course.yaml, concepts.yaml (Units 1.1-1.2), section 1, unit 1.1 with guidebook
  - [x] Seed level `level-02-anatomy` lesson l1: 10 exercises, one of each MVP type, all verified
  - [ ] Rest of Unit 1.1 (levels 1, 3-5, 3-5 lessons each, checkpoint) and Unit 1.2
- [~] (new) App content loader `src/content/loader.ts` (manifest + cached section fetch); SW precaches bundles
- [ ] Done-check: complete real lessons offline; all snippets verified in CI

## M2: Path + gamification (01 §9 M2)

- [ ] Learning path: sine-wave nodes, banners, guidebook view, node popovers, locking rules, jump-to-current (01 §4.3.2)
- [ ] XP rules (01 §3.2); daily goal + chest (01 §3.3)
- [ ] Streak: reconciliation wired to app start / visibilitychange / midnight; freezes; repair + earn-back (01 §3.5-3.6)
- [ ] Hearts with setting (default off), refill rules (01 §3.8)
- [ ] Gems + shop (01 §3.9)
- [ ] Lesson-complete, streak-extended, milestone celebration screens
- [ ] Streak calendar screen; profile/stats; achievements v1 (01 §3.10)
- [ ] Event log `commit(events[])` + derived tables + `rebuildDerived()` (01 §6)
- [ ] Export/import JSON backup (zod-validated, merge by event ID) (01 §6)
- [ ] Domain unit tests: streak edge cases (DST, timezone travel, long absence), XP, hearts, economy

## M3: Beginner content (02 Sections 1-5)

- [ ] Section 1 (5 units) - [ ] Section 2 (4) - [ ] Section 3 (5) - [ ] Section 4 (5) - [ ] Section 5 (4)
- [ ] Guidebooks per unit; Code Reads every 2-3 units; checkpoints
- [ ] Content QA pass (03 §5 checklist)

## M4: Practice + review

- [ ] Leitner SRS `domain/srs.ts` (01 §3.11); practice node; mistakes review; practice hub UI
- [ ] Placement test (02 §6); onboarding flow (01 §4.3.1)
- [ ] Spike: in-browser compiler (Weblings / Rubrc), record go/no-go (01 §7)

## M5: Polish + launch

- [ ] Accessibility audit, WCAG AA contrast check of tokens, reduced motion, font scaling (01 §4.5)
- [ ] Performance on low-end Android
- [ ] Install prompt timing, update prompt, `navigator.storage.persist()`, backup reminders
- [ ] Optional: Periodic Background Sync experiment, `.ics` reminder (01 §8.1)
- [ ] Local error ring buffer included in backups

## M6: Playground + Android

- [ ] `services/code-runner.ts`: `RemotePlaygroundRunner` (throttled), `SelfCheckRunner` fallback (01 §7)
- [ ] Playground screen; Build nodes with runnable checks
- [ ] Capacitor Android project, local notifications, haptics (01 §8.2)

## Mascot (separate design task, 01 §4.6)

- [ ] `<Mascot pose>` component loading `public/mascots/<id>/<pose>.svg`; Ferris placeholder poses

## Open questions

- Custom domain before public launch? (01 §12)

---

## Session log

- 2026-10-17: Session 1. M0 essentially complete (shell, tokens, components, PWA, Dexie schema, streak domain
  with tests, CI workflow). M1 foundations: content schema, content-build with cross-checks, rust-verify,
  seed content level, app loader. Next: lesson player + exercise registry (M1), rest of the vertical slice.
  Not done: no GitHub remote yet, so CI/deploy hasn't run; Lighthouse not run.

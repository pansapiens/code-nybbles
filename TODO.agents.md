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
Rust std. Strip micromamba from PATH before every command (see `CLAUDE.md`). `RUST_VERIFY_LINKER=/usr/bin/gcc`
also works. CI doesn't need either.

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
  - [x] (new) In-app "Reduce animations" setting applies the reduced-motion rule via `data-motion` (01 §4.3.10)
    (not persisted yet: settings move to Dexie in M2)
  - [x] (new) Precache only latin font subsets (`globIgnores`); others still load online if ever needed
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
    - [x] (new) Forward timezone travel across the date line can skip a local date entirely; forgive it
      (01 §3.7). Done in `progress.ts` `forgiveTravel`: the skipped date is marked 'repaired'.
    - Milestones after 365 are every multiple of 100 (400, 500, ...); plan wording was ambiguous
  - [x] `domain/ids.ts`: UUIDv7 (01 §9.4)
- [x] Stylelint rule: no raw hex colours in components (01 §4.7)
- [x] Playwright: Pixel-sized project; offline smoke test of the built shell (01 §10)
  - Runs against `vite preview` of the production build; projects `mobile` (Pixel 7) and `desktop`
- [x] GitHub Actions: type-check, unit tests, build, deploy to Pages (01 §5.5) - `.github/workflows/deploy.yml`
  - [ ] (new) Not yet run: needs a GitHub remote (`pansapiens/code-nybbles`) and Pages source set to "GitHub Actions"
  - [ ] (new) Add content-build + rust-verify steps once they exist (M1)
- [x] (new) Fonts were inlined as data: URIs by Vite and blocked by the CSP; `assetsInlineLimit` now skips woff2
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
  - [x] Concept taught-before-tested check along path order (warning): an exercise's concepts and a level's
    `reviewConcepts` must be in some earlier-or-current level's `concepts:`
  - [x] Licence allow-list for `sources:` (enforced by schema enum); `ATTRIBUTIONS.md` generated at the repo
    root by the CLI, and `manifest.attributions` feeds Settings > Licences & attributions (01 §13.3)
    - [ ] (new) Full MIT/Apache notice texts in-app (currently a link to the repo)
  - [x] Emit `app/public/content/section-<id>.json` + `manifest.json` (contentVersion, hashes) (01 §5.4)
  - [x] Syntax highlighting: deviation, a tiny per-line regex lexer at runtime (`components/highlight.ts`,
    `HighlightedLine.vue`) rather than build-time Shiki/Lezer, because fill-tokens and spot-bug split the code
    themselves. Used by CodeCard, spot-bug, fill-tokens. Colour tokens `--c-syn-*` in tokens.css
    - [ ] (new) Check `--c-syn-*` contrast with a tool in the M5 accessibility audit
  - [x] Markdown -> HTML at build time (markdown-it, `html: false`): prompts, explanations, hints, `why`,
    concept cards, option text (not predict-output's, which is literal output), guidebooks
  - [x] (new) Id nesting check: unit ids start with the section id, level ids with the unit id (the app
    finds a level's bundle from the first segment)
  - [x] `--strict` on in CI (the vertical slice builds with 0 warnings)
  - [x] (new) Warn when a decode-error snippet is wrapped or uses `hidden.before` (line numbers in the
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
- [x] Lesson player `views/LessonView.vue` at `/lesson/:levelId/:lessonId`: queue, CHECK -> feedback
  footer (aria-live) -> CONTINUE, mistake re-queue, progress bar, exit confirm, simple complete screen
  (accuracy, time) (01 §4.3.4)
  - [x] `domain/lesson-planner.ts`: `planLesson`, `LessonRun`, `answerCurrent`, `progress`, `summarise` (tested)
    - [ ] (new) Pool sampling + SRS review items + Legendary subsets (M4)
  - [x] `exercises/registry.ts` (renderer per type) + `exercises/grade.ts` (grader + solution per type, tested)
  - [x] (new) Persist lesson completion (levelProgress, XP events) - M2 with the event log
  - [ ] (new) Hint button (v1), combo toasts, Enter-to-check keyboard shortcut
- [x] Renderers + graders for all 10 MVP types. Shared pieces: `OptionList` (mcq/decode-error/predict-output/
  true-false/compiles follow-up), `OrderExercise` (parsons + predict-output assemble mode)
  - predict-output assemble mode grades the words of the output, not its line breaks (use choose mode when
    layout matters)
  - Output options announce line breaks to screen readers ("Ready, new line, Go!")
  - [ ] (new) Parsons drag-and-drop (tap-to-place works now and stays as the accessible path)
  - [ ] (new) Indentation step for parsons (03 §1, optional)
- [x] Sound (Web Audio tones, no files) + haptics (`navigator.vibrate`) in `services/feedback.ts`; uses the
  existing settings toggles
- [x] Dev route `/dev/content/:levelId?`: every exercise of a level rendered, with its answer (03 §5)
  - [x] (new) Fixed `theme-init.js` path doubling the base in dev (`/theme-init.js`; Vite adds the base)
- [~] Content: Section 1, Units 1.1-1.2 vertical slice (02 §4)
  - [x] course.yaml, concepts.yaml (Units 1.1-1.2), section 1, unit 1.1 with guidebook
  - [x] Seed level `level-02-anatomy` lesson l1: 10 exercises, one of each MVP type, all verified
  - [x] Unit 1.1 complete: 5 levels x 3 lessons x 9 exercises + checkpoint (14); guidebook for the unit
  - [x] Unit 1.2 complete: 5 levels x 3 lessons (9-10 exercises) + checkpoint (14); guidebook
  - [x] All 303 exercises render without console errors (each level loaded in `/dev/content`)
  - [ ] (new) Verify option `code` in mcq/decode-error (e.g. per-option `verify`), so "this still fails"
    claims are checked; authors currently check these by hand
  - [ ] (new) Concept ids for scope/blocks and E0070 (Unit 1.2 tagged them `var.shadowing` / `var.const`)
  - [ ] (new) Human playtest of Units 1.1-1.2 on a phone (03 §5 step 6)
  - [ ] (new) Pools: lessons are exactly 9 items, no extra pooled exercises yet
  - [ ] (new) Build check: a parsons answer with a distractor swapped in must fail verification (catches
    distractors that also compile, e.g. a final `println!` without `;`)
  - [x] (new) Width check measures fill-tokens lines with answers in place of `___N___`
  - [x] (new) Warn on a top-level `fn` without `main` under `wrap: auto` (a misspelled `fn Main` was
    silently wrapped in a second `main`)
  - [x] (new) CLI writes `ATTRIBUTIONS.md` only when building the repo's own `content/`
  - Note: shell commands (`cargo new`, `cargo run`) appear only in prose; nothing verifies them
- [~] (new) App content loader `src/content/loader.ts` (manifest + cached section fetch); SW precaches bundles
- [~] Done-check: complete real lessons offline; all snippets verified in CI
  - Lessons play end to end from precached content; CI not yet run (no GitHub remote)

## M2: Path + gamification (01 §9 M2)

- [x] Learning path: sine-wave nodes, banners, guidebook view, node popovers, locking rules, jump-to-current (01 §4.3.2)
  - `domain/path.ts` (`nodeStates`, `nextLesson`, tested); `PathNode.vue` (Reka Popover, progress ring); `GuidebookView`
  - (new) Practice / Code Read / Build path entries are skipped until M4+; chest nodes added to both unit.yaml files
- [x] XP rules (01 §3.2); daily goal + chest (01 §3.3); daily goal picker in Settings (10/20/30/50)
- [x] Streak: reconciliation wired to app start / visibilitychange / midnight; freezes; repair + earn-back (01 §3.5-3.6)
  - Store `now` ticks every 60 s and on visibilitychange; `viewAt` settles the streak to today
- [x] Hearts with setting (default off), refill rules (01 §3.8); out-of-hearts sheet with gem refill
- [x] Gems + shop (01 §3.9): freeze, repair (when offered), hearts refill (hearts mode only)
  - [ ] (new) Freeze uses the star icon as placeholder art; needs an ice/freeze icon
- [x] Lesson-complete, streak-extended, milestone, daily-goal and achievement celebration screens
- [x] Streak calendar screen; profile/stats (7-day XP bars); achievements v1, 10 entries (01 §3.10)
- [x] Event log `commit(events[])` + derived tables + `rebuildDerived()` (01 §6)
  - Deviation: derived state is one snapshot row (`derived` table, `DERIVED_VERSION`), not per-entity tables;
    `freeze_used` / `streak_lost` are derived on replay, not stored, so live state always equals `fold(events)`
  - Deviation: settings live in localStorage (needed before first paint), included in backups
  - Settings has "Repair data" (rebuild) and "Reset progress" (confirmed)
- [x] Export/import JSON backup (zod-validated, merge by event ID) (01 §6); import reloads the page
  - [ ] (new) Backup reminder (01 §6) not done
- [x] Domain unit tests: streak edge cases (DST, timezone travel, long absence), XP, hearts, economy
  - [ ] (new) e2e that finishes a whole lesson and checks XP/streak (verified manually with a script so far)
- [ ] (new) Cross-tab sync (ponytail: a second tab sees changes on reload)

## M3: Beginner content (02 Sections 1-5)

- [ ] Section 1 (5 units) - [ ] Section 2 (4) - [ ] Section 3 (5) - [ ] Section 4 (5) - [ ] Section 5 (4)
  - [x] Section 1 complete: Units 1.1-1.5 (1.5 ends with the Section 1 checkpoint, for placement later)
  - [x] Section 2 Units 2.1-2.3 (2.3 ends with the Section 2 checkpoint)
  - [ ] Unit 2.4 Guessing Game is a Build project; needs Build nodes (M6) - skipped for now
  - [x] Section 3 complete: Units 3.1-3.5 (3.5 ends with the Section 3 checkpoint), diagrams on every level
  - [x] Section 4 written: Units 4.1-4.5 (4.5 ends with the Section 4 checkpoint); not yet QA-reviewed
  - [x] Section 5 written: Units 5.1-5.3, Code Read "Word frequency" (5.3), Section 5 checkpoint
    (`collections.hashmap.checkpoint`) ends the beginner course; not yet QA-reviewed. Unit 5.4 (Build) waits on M6
    - [ ] (new) Section 5 QA pass. Beyond-brief items to judge: `+=` on String, `.chars().nth/rev()`, map
      `keys/values/values_mut`, `push_front`; 5.1 level 5 snippets declare enums with no visible `fn main`
    - [ ] (new) Error codes used without concepts: E0507, E0596, E0597, E0515, E0433, E0368
    - [x] (new) HashMap output order: every `verify: run` HashMap program rebuilt uncached 3 times, stable
  - Authored by parallel subagents, one per unit; the parent pre-registers concept ids and section unit lists
    so agents only touch their own unit directory (briefs in the session log of 2026-10-17)
- [x] Guidebooks per unit; checkpoints
- [x] (new) Code Read node type (plans/03 type 14, pulled forward from v1 because M3 asks for them):
  `code-read-*.yaml` = verified `program` + `chunks` (`lines` revealed, then questions). Compiles to a one-lesson
  level with `program` and `reveals`; player shows the program above each question; 15 XP; no hearts
  - [x] Code Reads: 1.1 Ferris says hello, 1.3 Temperature converter, 2.1 Area calculator, 2.3 Collatz sequence,
    3.2 Who owns the String?, 3.5 Swap and sum, 4.2 Rectangle, 4.5 Traffic lights
- [x] (new) Memory diagrams (`diagram:` on concept/mcq/true-false): stack frames, heap boxes, pointer and reference
  arrows, moved and freed states; schema-validated targets; SVG renderer (`MemoryDiagram.vue`) with a text description
  - [ ] (new) Per-variable label (e.g. R/W/O permissions in 3.3 level 6 are in the caption for now)
  - [ ] (new) A string literal's text lives in the program binary, which diagrams can't show (prose covers it)
  - [ ] Code Reads library in the Practice hub (M4)
- [ ] Content QA pass (03 §5 checklist)
  - [x] Units 1.3-1.5 and 2.1-2.3 reviewed by two independent agents: 22 fixes (wrong claims, ambiguous
    items, unanswerable tile exercises, a concept used before it is taught)
  - [x] (new) Build: concept cards over 60 words of prose warn; predict-output tiles must be able to spell the answer
  - [ ] Judgement calls for a human: `if` preview card in 2.1 level 5; `std::env::args().count()` as a recipe
    in 1.4 level 4; `let x = println!(..)` (clippy `let_unit_value`) in 1.4 level 2; "char holds any emoji"
    simplification in 1.3 level 5; `fill-and-or` in 2.2 accepts `||` by values (prompt rules it out)
  - [ ] (new) plans/03 §3 says spacing inside output matters, but the tiles grader collapses whitespace;
    tile items with significant spacing were converted to options mode
  - [ ] (new) Clippy-clean check for snippets (03 §5) not automated
  - [ ] Units 1.1-1.2 haven't had an independent review
  - [x] (new) Section 4 QA pass (19 fixes: catch-all fill tiles, 40-column lines, items leaning on the previous one)
    - [ ] (new) Judgement calls: a few lines at 41-51 columns (Rectangle Code Read is at the 25-line limit;
      Traffic lights line 14 holds the `|` the questions ask about); `spot-missing-self` answer is line 4 but
      rustc points at line 5; `let ... else` wording omits `panic!`; Section 4 checkpoint uses US coins;
      `pairs-option-errors` has two "E0277" tiles; a redundant parsons alternative in `checkpoint-methods`
  - [x] Section 3 reviewed by two agents: 25 fixes (moved-value claims, drop timing, E0106 vs E0515,
    E0502 vs E0506, parsons distractors that formed valid programs, follow-ups made self-contained)
  - [ ] Judgement calls (Section 3): spot-bug items that expect the root-cause line, not the line rustc reports
    (`spot-add-tax`, `spot-str-param-type`, `spot-reset-not-mut`, `spot-joined`, `spot-missing-mut`); match-pairs
    with tiles that only resolve by elimination (`pairs-signatures`, `pairs-body-to-type`, `pairs-param-types`);
    `spot-mistake-swap` in 3.2 level 1 also fixable with `.clone()` on replay
- [x] (new) rust-verify compile checks used `--emit=metadata`, which skips deny-by-default MIR lints
  (`unconditional_panic`, `arithmetic_overflow`); now `--emit=mir`
- [x] (new) Parsons grading compares line text, so identical lines (two `}`) don't need listed alternatives
- [ ] (new) Register error-code concepts the authors wanted: E0277, E0004, E0317, E0061, E0425, E0069, E0604,
  E0505, E0506, E0507, E0596, E0597, E0063, E0560, E0594, E0609, E0618, E0369, E0005...
  (items are tagged with the nearest topic concept for now)
- [ ] (new) Verify `rust` code blocks in guidebooks (plans/03 §4.3); some are annotated mdBook-style already
- [ ] (new) Build check: spot-bug `answer` line vs the line the compiler reports
- [ ] (new) Build check: a fill-tokens bank tile that would also be correct (compile each alternative);
  plain identifiers in pattern positions are the common case (4.5 agent's script: /tmp/cn45tools/alts.py)
- [ ] (new) Width check doesn't cover parsons `lines`, mcq `options[].code` or Code Read programs
- [ ] (new) Shared prelude for snippets (struct definitions repeated across items in Section 4)
- [ ] (new) Fill-tokens: each bank tile can be placed once, so two blanks with the same answer need the tile twice
  in the bank; say so in plans/03 and have the build check the bank can spell the answer
- [ ] (new) Authoring note: answers with combining characters (`e\u{301}`) must match the real output's code
  points; a precomposed `é` looks the same but fails
- [ ] (new) spot-bug: optional "line the compiler reports" field, for "mistake here, error there" items
- [ ] (new) predict-output tiles join with spaces but the answer needs real newlines; document or normalise
- [ ] (new) predict-output can't express "this panics"; panics are mcq + `expectPanic` for now
- [ ] (new) Two items rely on rustc 1.98 not catching `a[a.len()]` at compile time (unit-04 level-04
  `spot-off-by-one`, checkpoint `spot-last-panic`); the build will flag them if that changes
- [ ] (new) Level `icon:` is in the schema but unused by the app
- [ ] (new) Linked follow-up questions: authors repeat code because a re-queued item can't rely on the one before it
- [ ] (new) Build bundles are only written when the whole course has 0 errors, so authors can't preview
  diagrams while other units are mid-edit (a `--partial` flag that skips failing units would help)

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
- 2026-10-17: Session 2. Conda note in CLAUDE.md. M1 lesson engine: planner, graders, renderers for all 10
  types, player with re-queue and complete screen, sound/haptics, dev content preview, runtime syntax
  highlighting, build-time Markdown, attributions, taught-before-tested and other build checks. Units 1.1
  and 1.2 authored by two subagents (303 exercises, 199 verified snippets, strict build clean). Next: M2 (learning
  path, XP, streak wiring, event log + Dexie persistence of progress). Still not done: GitHub remote/CI run,
  Lighthouse, human playtest.
- 2026-10-17: Session 3. M2 complete: event-sourced progress (`domain/progress.ts`: reducer, commands, achievements),
  Dexie event log with snapshot + rebuild + backup, progress store, learning path with popovers/chests/guidebook,
  celebration screens, Streak, Shop, Profile and Settings data controls. 31 unit + 6 e2e tests pass, strict content
  build clean. Next: M3 beginner content (Sections 1-5). Still not done: GitHub remote/CI run, Lighthouse, human
  playtest, backup reminder.

- 2026-10-17: Session 3 (cont.). M3 started: Units 1.3-1.5 and 2.1-2.3 by six parallel agents (Section 1 complete,
  Section 2 except the 2.4 Build project). Code Read nodes added, with four Code Reads. Fixed: verifier missed MIR
  lints; parsons identical lines; crypto.randomUUID on plain-http LAN. 1237 exercises, 918 verified snippets,
  strict build clean. Next: QA pass on the new units, then Sections 3-5.
- 2026-10-18: Session 3 (cont.). QA pass on Units 1.3-2.3 (22 fixes, tile assembly check). Memory diagrams.
  Section 3 by five parallel agents (paused by the API session limit overnight, then resumed). 1966 exercises,
  1446 verified snippets, strict build clean. Section 3 QA running. Next: Sections 4-5.
- 2026-10-18: Section 4 (Units 4.1-4.5, Code Reads Rectangle and Traffic lights) by five parallel agents.
  rustc corrections found by agents: `Option<i32> + i32` is E0369 (only `i32 + Option` is E0277); brace
  patterns on tuple structs are E0769. 2654 exercises, 1975 verified snippets, strict build clean, tests and
  e2e pass. Paused at the user's request. Next: Section 4 QA, then Section 5.

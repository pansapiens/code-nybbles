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
  src/db/                           # Dexie schema + commit()/rebuildDerived()
  src/styles/tokens.css, base.css   # design tokens (01 §4.1)
  src/components/                   # base UI components
  src/views/                        # screens
tools/content-build/                # YAML -> zod -> JSON bundles (03 §4.1)
tools/rust-verify/                  # snippet verification against real rustc (03 §4.2)
content/                            # authored course content (03 §2)
```

Commands (from repo root): `pnpm dev`, `pnpm build`, `pnpm test`; in `app/`: `pnpm test:unit`, `pnpm test:e2e`,
`pnpm type-check`, `pnpm lint`.

---

## M0: Foundations (01 §9 M0)

- [x] Scaffold Vite + Vue + TS + Pinia + router + Vitest + Playwright + ESLint/Prettier (create-vue)
- [x] pnpm workspace at root; git repo
- [x] Install vite-plugin-pwa, Dexie, zod, Reka UI, fake-indexeddb (tests)
- [ ] Licences: `LICENSE-MIT`, `LICENSE-APACHE` at root; `content/LICENSE` (01 §13)
- [ ] README with dev commands
- [ ] Vite `base: '/code-nybbles/'`, router `createWebHistory(import.meta.env.BASE_URL)` (01 §5.5)
- [ ] Design tokens light/dark in `styles/tokens.css`, `base.css` (01 §4.1)
  - [ ] Self-hosted fonts: Nunito + JetBrains Mono (offline; via @fontsource)
  - [ ] Theme switch: `[data-theme]` attribute set from localStorage before first paint (01 §5.1 "tiny flags")
- [ ] Base components (01 §4.1, §9 M0)
  - [ ] `DuoButton` (primary/secondary/danger/correct, ledge press, disabled)
  - [ ] `AnswerTile` (idle/selected/correct/wrong/disabled)
  - [ ] `HudChip` (streak/gems/hearts)
  - [ ] `ProgressBar` (highlight stripe)
  - [ ] `BottomSheet` (Reka UI Dialog)
  - [ ] `TabBar` (mobile bottom tabs) + desktop sidebar
  - [ ] `CodeCard` (monospace, horizontal scroll, font-size setting; highlighting comes in M1)
- [ ] App shell: top HUD, bottom tabs, desktop sidebar + right rail at >= 1024px, routing skeleton (01 §4.2)
  - [ ] Placeholder views: Learn, Practice, Shop, Profile, Settings, Lesson, Streak, Onboarding
- [ ] PWA: manifest (01 §5.3), icons (192/512 + maskable), SW precache, `registerType: 'prompt'` update toast
  - [ ] Copy `index.html` -> `404.html` at build; `.nojekyll` (01 §5.5)
  - [ ] CSP `<meta>` tag allowing `connect-src play.rust-lang.org` (01 §5.5)
- [ ] Dexie schema `db/schema.ts` (01 §6) with namespaced DB name `code-nybbles`
- [ ] Domain layer foundations (pure TS, unit-tested)
  - [ ] `domain/dates.ts`: `LocalDate` arithmetic, date-only (no ms/86400000), `toLocalDate(ts, tz)`
  - [ ] `domain/streak.ts`: `reconcileStreak`, `onSessionCompleted`, milestones, bounded loop (cap 400 days) (01 §3.4-3.7)
  - [ ] `domain/ids.ts`: UUIDv7 (01 §9.4)
- [ ] Stylelint rule: no raw hex colours in components (01 §4.7)
- [ ] Playwright: Pixel-sized project; offline smoke test of the built shell (01 §10)
- [ ] GitHub Actions: type-check, unit tests, build, deploy to Pages (01 §5.5)
- [ ] Done-check: installable, offline-loading shell on mobile viewport; Lighthouse PWA checks pass

## M1: Content pipeline + lesson engine (01 §9 M1, 03)

- [ ] Content zod schema `tools/content-build/schema.ts` (03 §2), types inferred for app via `z.infer`
  - [ ] course.yaml, concepts.yaml, section.yaml, unit.yaml (path entries, sources), level.yaml, lessons, exercises
  - [ ] Exercise schemas for the 10 MVP types (03 §1)
- [ ] `content-build`: parse YAML + Markdown, validate, cross-checks (03 §4.1)
  - [ ] Unique slug IDs; concept refs exist; answers present in options/banks; >= 2 distractors; no duplicate options
  - [ ] Lesson length 8-15; level 3-5 lessons; unit has a checkpoint
  - [ ] Code width (> 40 cols) and line-count warnings
  - [ ] Concept taught-before-tested check along path order
  - [ ] Licence allow-list for `sources:`; generate `ATTRIBUTIONS.md` (01 §13.3)
  - [ ] Emit `app/public/content/section-XX.json` + `manifest.json` (contentVersion, hashes) (01 §5.4)
  - [ ] Build-time syntax highlighting (Shiki or Lezer) (03 §4.1)
- [ ] `rust-verify` (03 §4.2)
  - [ ] Extract snippets to `cases/<global-id>.rs` applying `wrap` and `hidden`
  - [ ] Modes: run (timeout, stdout, expectPanic), compile, compile-fail (error codes via `--error-format=json`), test
  - [ ] Pinned `rust-toolchain.toml` (stable, edition 2024)
  - [ ] Capture rendered stderr for `decode-error`; cache by snippet hash; parallel
  - [ ] `deps:` cases in a shared Cargo project (later; needed from Section 2.4 `rand`)
  - [ ] Guidebook ```rust blocks with mdBook annotations (03 §4.3)
  - [ ] Parsons `alternatives` orders verified via harness
- [ ] Lesson player: queue, CHECK -> feedback sheet -> CONTINUE, mistake re-queue, progress bar, exit confirm (01 §4.3.4)
  - [ ] `domain/lesson-planner.ts` -> `LessonPlan` (03 §6)
  - [ ] `exercises/registry.ts` (renderer + grader per type)
- [ ] Renderers + graders: concept, mcq, predict-output, fill-tokens, parsons, compiles, spot-bug, match-pairs, decode-error, true-false
- [ ] Sound (Web Audio) + haptics (`navigator.vibrate`) services, settings toggles
- [ ] Dev routes: `/dev/content/:levelId`, exercise gallery with answers (03 §5)
- [ ] Content: Section 1, Units 1.1-1.2 vertical slice (02 §4)
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

- 2026-10-17: Session 1. Scaffolded workspace and app; started M0.

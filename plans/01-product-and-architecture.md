# Code Nybbles: a Duolingo-style app for learning Rust

> Name: **Code Nybbles** (a *nybble* is half a byte: bite-sized lessons). Naming forms:
> - Display name: `Code Nybbles` (manifest `name`); `short_name`: `Nybbles`
> - Slug (repo, URL path, package names, IndexedDB name, file prefixes): `code-nybbles`
> - Code identifiers where a slug can't be used: `CodeNybbles` (types/classes), `codeNybbles` (variables)
> - Hosted at <https://pansapiens.github.io/code-nybbles/>
>
> Companion documents:
> - [`02-syllabus.md`](./02-syllabus.md): the progressive Rust curriculum (sections, units, levels)
> - [`03-content-format-and-exercises.md`](./03-content-format-and-exercises.md): exercise types, lesson schema, authoring and verification pipeline

---

## 1. Vision and scope

A mobile-first, offline-capable, gamified app that teaches Rust from "never programmed in Rust" to "comfortable with traits, lifetimes, iterators, smart pointers, concurrency and async", in 3–5 minute daily lessons. The core loop and feel copy Duolingo: a winding path, chunky 3D buttons, streak flame, hearts, gems, celebration screens. The content is designed specifically for code: reading, predicting, assembling and fixing Rust, not just memorising syntax.

### Guiding principles

1. **Habit first.** One short lesson a day keeps the streak. Everything else (XP goals, gems, chests) is a bonus. This is Duolingo's evidence-backed design ([Duolingo blog: Improving the streak](https://blog.duolingo.com/improving-the-streak/)).
2. **Thumb-friendly code.** Typing code on a phone is painful, so most exercises use tap-to-place tokens, line ordering, tap-the-bug, or multiple choice. Free typing is rare and assisted by a Rust symbol key row.
3. **The compiler as the teacher.** Rust's compiler errors are a core teaching tool. Many exercises are "What does the compiler say?" or "Pick the fix for E0382".
4. **Offline by default.** All lesson content and grading works offline. Code *execution* is an optional, online enhancement (see section 7).
5. **Correct content, verified by machine.** Every Rust snippet in the content is compiled (and, where relevant, run) by real `rustc` in CI, so the app never claims code compiles when it doesn't.
6. **Single-user, local-only for v1.** No accounts and no server. The data model is designed so it can sync to a backend later without a rewrite (section 9.4).

### In scope for v1 (MVP and v1.x)

- Installable PWA (manifest + service worker), works fully offline after first load
- Learning path (sections → units → levels → lessons), the Duolingo-style winding path
- Lesson player with ~10 exercise types (see `03-content-format-and-exercises.md`)
- XP, daily XP goal, streak, streak freezes, streak repair, gems, hearts (configurable), shop
- Streak calendar, profile/stats, achievements (local)
- Practice hub: mistakes review, spaced-repetition practice, "Code Reads" (Duolingo Stories equivalent)
- Settings, dark mode, sound/haptics, data export/import (critical while local-only)
- Content for sections 1–5 of the syllabus (the beginner core) at launch, the rest progressively
- Optional online "Run" button / playground using a remote Rust sandbox

### Deferred (v2+)

- Accounts, server database, cross-device sync
- Leaderboards / leagues, friends, friend quests, follow feeds
- Server-sent web push notifications
- Server-side code-challenge grading with test harnesses
- AI hints / explanations of compiler errors (LLM)
- iOS wrapper

---

## 2. Inspiration and competitive notes

| App | What to borrow | What to avoid |
|---|---|---|
| **Duolingo** | Winding path, unit banners + guidebook, 3D ledge buttons, HUD chips (streak / gems / hearts), lesson top bar with progress + hearts, CHECK → feedback sheet → CONTINUE, mistake re-queue, lesson-complete takeover, streak calendar, freezes and repair, chests on the path, practice hub | Aggressive paywalls and heart scarcity; guilt-trip notifications |
| **[Coddy](https://play.google.com/store/apps/details?id=tech.coddy.coddyapp&hl=en)** (has a Rust course) | Bite-sized "learn by doing", built-in editor that runs real code (server-side compile), daily challenge, adaptive practice from weak areas, explanation when code is wrong | Ads during paid tiers |
| **[CodeLingo](https://play.google.com/store/apps/details?id=com.akinstudio.codelingo&hl=en)** | Live REPL playground, visualising program logic (their "Byte-bot"), global leagues (v2) | |
| **[Codalingo](https://play.google.com/store/apps/details?id=pro.flutters.app&hl=en)** (Dart/Flutter) | Playground on phone, end-of-level coding challenges, **Review Zone targeting weakest topics**, varied exercise formats (true/false, guess-the-word), daily quiz | "Theory too easy, challenges too hard" (review feedback). Keep the difficulty curve smooth. |
| **[Brown University interactive Rust Book](https://rust-book.cs.brown.edu/)** | Ownership/permission quizzes, "Does this program compile?" questions, memory diagrams | |

UI references:
- Duolingo design-token teardown: [awesome-ios-design-md / duolingo DESIGN.md](https://github.com/Meliwat/awesome-ios-design-md/blob/main/design-md/misc/duolingo/DESIGN.md)
- Screen map and flows (70 screens): [Revyl Atlas: Duolingo](https://revyl.com/atlas/duolingo/)
- Desktop learn path: [Screenrove: Duolingo learn path](https://screenrove.com/duolingo/product/duolingo-product-learn)
- Path redesign rationale: [Duolingo blog: new home screen](https://blog.duolingo.com/new-duolingo-home-screen-design/)

**Legal/brand note:** clone the *interaction patterns and feel*, not the trademarks. Don't use the owl, the Feather font, the Duolingo name, or copied artwork. Ferris the crab is public domain (see [rustacean.net](https://rustacean.net/)), so it's safe as a placeholder (see §4.6 for the mascot plan). Follow the [Rust Foundation trademark policy](https://rustfoundation.org/policy/rust-trademark-policy/) for naming: use "for Rust" or "learn Rust" phrasing, don't modify the Rust logo, and don't imply the app is official.

---

## 3. Core gamification design

### 3.1 Learning structure

```
Course (Rust)
 └─ Section (e.g. "3. Ownership")           ~ 3–6 units, coloured banner
     └─ Unit (e.g. "References & Borrowing")  ~ 4–7 levels + guidebook
         └─ Level (a node on the path)         ~ 3–5 lessons (progress ring fills)
             └─ Lesson (a session)             ~ 8–15 exercises, 3–5 minutes
```

Path node types (mirroring Duolingo's node variety):

| Node | Icon | Purpose |
|---|---|---|
| **Lesson level** | star / topic icon | Teach and drill a concept (3–5 lessons fill the ring) |
| **Code Read** | book | Duolingo "Stories" equivalent: read a short real program, answer comprehension questions while lines are revealed step by step |
| **Practice** | dumbbell | Mixed review of the unit's concepts plus your past mistakes |
| **Chest** | chest | Free gem reward when reached (motivation spike mid-unit) |
| **Build** | hammer | Multi-step mini-project assembled across several screens (for example build `minigrep` step by step) |
| **Unit checkpoint** | trophy | Unit review test. Passing it marks the unit complete. Can be used to "jump ahead". |
| **Legendary** (v1.x) | gold crown | Harder replay of a completed level: no hints, hearts matter, more free-typing |

Levels interleave concepts like Duolingo's current path: a level revisits earlier concepts while introducing new ones, instead of grouping all of one skill together.

### 3.2 XP

- Lesson: **10 XP**, +5 for a perfect lesson (no mistakes)
- Practice / mistakes review: 5–10 XP
- Code Read: 15 XP
- Build step: 15 XP, finished Build: +20
- Unit checkpoint: 30 XP
- Legendary: 40 XP
- Combo bonus (v1.x): 5 correct in a row shows a "combo" toast; 10-in-a-row gives +2 XP

### 3.3 Daily goal (separate from streak)

- User picks a daily XP goal at onboarding: Casual 10 / Regular 20 / Serious 30 / Intense 50 (changeable in settings)
- Reaching it opens a daily chest (gems) and shows the goal ring as complete
- **Does not** affect the streak (Duolingo found that decoupling these improved D14 retention by 3.3%)

### 3.4 Streak

- **Extended by completing at least one XP-earning session on a local calendar day** (lesson, practice, Code Read, checkpoint)
- Day boundary = local midnight in the device's current timezone. Each activity event stores its `localDate` (`YYYY-MM-DD`) when it is recorded, so later timezone changes don't rewrite history.
- Streak milestones: 3, 7, 14, 30, 50, 100, 150, 200, 365, then every 100. Each milestone triggers a celebration + gem reward. The day-7 milestone matters most for retention.
- "Streak at risk" state: after 6pm local time with no lesson today, the flame in the HUD turns grey/pulses, with an in-app banner (plus a notification once Android is wrapped, section 8)

### 3.5 Streak freezes

- Hold **up to 2 equipped** freezes (Duolingo's experiments showed 2–3 beat 1)
- **New streak starters get 2 free freezes** (Duolingo found early flexibility helps retention)
- Cost: 200 gems each in the shop. Also awarded at some milestones.
- A freeze is consumed automatically for each missed day. A frozen day keeps the streak alive but **does not increment it**.
- Shown in blue on the streak calendar

### 3.6 Streak loss, repair and earn-back

When the app reconciles and finds missed days with no freezes left:

1. Streak resets to 0. The lost streak length and date are recorded.
2. If the lost streak was at least 3 days and it is within 2 days of the loss, offer:
   - **Repair with gems** (cost scales: for example `min(1000, 100 + 10 × lostLength)`), or
   - **Earn back for free**: complete 3 lessons today to restore it (Duolingo's "Earn back" flow)
3. Otherwise show a gentle "Start a new streak" screen with the mascot. Don't guilt the user.

### 3.7 Streak reconciliation algorithm

Runs on app start, on `visibilitychange` to visible, and at local midnight while the app is open.

```ts
type DayStatus = 'active' | 'frozen' | 'repaired' | 'missed';

function reconcileStreak(state: StreakState, today: LocalDate): StreakState {
  // lastSettledDate = last day whose status is final (active/frozen/repaired/missed)
  let d = addDays(state.lastSettledDate, 1);
  while (d < today) {                       // never settle 'today': it's still in progress
    if (state.days[d] === 'active') { d = addDays(d, 1); continue; }
    if (state.currentStreak > 0 && state.freezesEquipped > 0) {
      state.freezesEquipped -= 1;
      state.days[d] = 'frozen';
      emit('freeze_used', { date: d });
    } else if (state.currentStreak > 0) {
      emit('streak_lost', { length: state.currentStreak, date: d });
      state.lostStreak = { length: state.currentStreak, lostOn: d };
      state.currentStreak = 0;
      state.days[d] = 'missed';
    }
    d = addDays(d, 1);
  }
  state.lastSettledDate = addDays(today, -1);
  return state;
}

function onSessionCompleted(state: StreakState, today: LocalDate) {
  if (state.days[today] !== 'active') {
    state.days[today] = 'active';
    state.currentStreak += 1;
    state.longestStreak = Math.max(state.longestStreak, state.currentStreak);
    checkMilestones(state);
  }
}
```

Edge cases to test (unit tests with a mocked clock):
- Timezone travel forwards/backwards across midnight (never double-count; never punish a "lost" day caused by travel. Accept the day if any event exists on either local date)
- Device clock manually moved: single-user local app, so accept it (no anti-cheat in v1), but guard against negative ranges and huge loops (cap the reconciliation loop at for example 400 days)
- DST transitions (use date-only arithmetic, never `ms / 86400000`)
- App not opened for months: loop must be bounded; all freezes are consumed, then the streak is lost

### 3.8 Hearts

Hearts are polarising, and for programming they can feel punitive. Proposal:

- **Setting: "Hearts mode" on/off. Default: off** (decided). The full system is still built in M2 so it can be enabled in settings and its default revisited later.
- 5 hearts max. Lose 1 per wrong answer in *new* lessons only (not in practice, Code Reads or review).
- Refill: +1 heart every 4 hours; a **practice session always refills 1 heart (free, never paywalled)**; gems can refill all (350 gems).
- At 0 hearts: the user can still do practice, which earns hearts back. They are never fully blocked.
- When hearts mode is off: show a ∞ heart chip.

### 3.9 Gems (soft currency, no real money in v1)

| Source | Gems |
|---|---|
| Daily goal chest | 10–30 (random) |
| Path chest node | 20–50 |
| Unit checkpoint passed | 50 |
| Streak milestones | 50–500 |
| Perfect lesson | 5 |
| Achievement unlocked | 25–100 |

| Shop item | Cost |
|---|---|
| Streak freeze (max 2 equipped) | 200 |
| Streak repair | scales, see 3.6 |
| Heart refill | 350 |
| Double XP boost, 15 min (v1.x) | 100 |
| Cosmetic mascot outfits / themes (v1.x) | 300–1000 |

### 3.10 Achievements (local)

For example "Hello, World!" (first lesson), "Borrow Checker Whisperer" (finish Ownership), "Fearless" (finish Concurrency), streak badges (7/30/100/365), "Perfectionist" (10 perfect lessons), "Night Owl" / "Early Crab", XP tiers. Tiered badges (I/II/III) like Duolingo.

### 3.11 Spaced repetition and mistakes

- Every exercise is tagged with one or more **concept IDs** (for example `ownership.move`, `borrow.mut-exclusive`, `match.exhaustive`).
- Track per-concept strength with a lightweight model. v1: Leitner-style boxes with exponential intervals (1, 2, 4, 8, 16, 32 days). v1.x: swap in a half-life regression model like Duolingo's, or FSRS.
- **Within a lesson:** wrong answers are re-queued at the end of the lesson (Duolingo behaviour). The lesson isn't complete until they're answered correctly.
- **Mistakes review:** the last N incorrectly answered exercises are stored and replayable from the practice hub.
- **Practice node / "Practise" button:** picks exercises from the weakest and most-overdue concepts in completed units.

---

## 4. UX and UI design

### 4.1 Design tokens (Duolingo-inspired roles, our own purple brand)

Keep Duolingo's *roles* (one bright "verb" colour for actions, semantic correct/wrong colours, warm streak colour, ledge depth) but **avoid Duolingo's signature green as the brand colour**. **Purple** is the primary: it's distinctive in this category, pairs well with the streak orange and the rust accent, and reads as playful without copying Duolingo.

| Role | Light | Dark | Notes |
|---|---|---|---|
| Canvas | `#FFFFFF` | `#15121F` | Dark is a purple-tinted aubergine, never true black (Duolingo's dark mode is blue-black) |
| Surface | `#F8F6FC` | `#211C30` | Faint lavender tint |
| Tile / track | `#E7E3F0`, ledge `#CFC8DE` | `#342C47`, ledge `#251F35` | Neutral tiles, progress-bar track, locked nodes |
| Text primary | `#3F3A4D` | `#FFFFFF` | Purple-grey; never `#000` |
| Text secondary | `#8F89A0` | `#A9A3B8` | |
| **Primary (brand, "the verb colour")** | `#7C4DFF`, ledge `#5B32D6`, highlight `#A585FF` | same | CHECK/CONTINUE/START buttons, current and completed path nodes, progress-bar fill, XP ring, celebration takeover background. White text on `#7C4DFF` ≈ 4.8:1 contrast. |
| Selected (tile/option) | tint `#EFE9FF`, border `#B9A2FF`, ledge `#7C4DFF` | tint `#2D2350`, border `#7C4DFF` | Uses the primary family, so "selected" and "action" feel related |
| Correct | `#2DB84C`, ledge `#1F8F3A`, tint `#DFF7E5`, text `#1A7A32` | same face; tint `#173A24` | **Feedback only**, never brand or navigation. Green-for-correct is a near-universal convention; it's a different hue from Duolingo's `#58CC02`. |
| Wrong / hearts | `#F04858`, ledge `#C42F40`, tint `#FFE3E6`, text `#C42F40` | same face; tint `#3D1A22` | |
| Streak | `#FF9600` | same | Fire is orange everywhere |
| Gems | `#22C3E6` (cyan diamond) | same | |
| Rewards / gold | `#FFC233`, ledge `#E0A000` | same | Chests, crowns, Legendary nodes, milestone badges |
| Info | `#3D8BFD` | same | Tips, links |
| **Rust accent** | `#CE422B` (rust orange-red) | | Rust course badge and accents; one of the section banner colours |

- Manifest `theme_color` / `background_color`: `#7C4DFF` / `#FFFFFF` (status bar and splash)
- Each **section** gets its own banner colour so the path feels varied. Rotate through purple, teal, blue, rust, pink and orange; avoid using green for section banners so green stays reserved for "correct".
- Correct/wrong are always paired with an icon (✓/✗) and text, so the green/red distinction isn't the only signal (colour-blind safety).
- Verify every text/background pair against WCAG AA in M5; the hex values above are starting points to tune once real components exist.

Typography (free fonts):
- UI / headings: **Nunito** (rounded, weights 400/700/800/900) or **Fredoka** for display numbers
- Code: **JetBrains Mono** (ligatures off by default; `=>` and `->` must be readable for beginners)
- Button labels are uppercase, letter-spacing 0.4px, weight 800

Shape and depth:
- Radii: 12px tiles, 16px cards/buttons, 20px unit banners, pill chips, circular nodes
- **Ledge depth, not blur shadows:** `box-shadow: 0 4px 0 <darker>`. On `:active` move down with `translateY(4px)` and drop the shadow. This is the signature tactile feel.
- Motion: correct = pop + chime; wrong = horizontal shake ±6px 400ms + buzz; lesson complete = confetti. Respect `prefers-reduced-motion`.
- Haptics: `navigator.vibrate()` on Android web (short patterns: 10ms tap, [20,40,20] wrong); native haptics via Capacitor later.
- Sound: short, preloaded via Web Audio (correct, wrong, lesson-complete fanfare, streak-extend). Toggle in settings.

### 4.2 Navigation

**Mobile (default):**
- Top HUD (sticky): course badge (Ferris-like icon) on the left; streak 🔥, gems 💎, hearts ❤️ chips on the right. Tapping a chip opens a bottom sheet (streak calendar / shop / hearts info).
- Bottom tab bar (icon-only with active pill): **Learn** (path) · **Practice** · **Shop** · **Profile**. (v2 adds Leaderboard and Quests.)

**Desktop/tablet (≥ 1024px), like Duolingo web:**
- Left sidebar nav with labels
- Centre column: path (max-width ~600px)
- Right rail: streak / gems / hearts, daily goal card, "next up" card, achievements teaser

### 4.3 Screens

1. **Onboarding** (first launch only)
   - Welcome + mascot → "How much Rust do you know?" (New / Know another language / Some Rust) → daily goal picker → reminder time (stored for later native notifications; also used for in-app nudge) → optional **placement test** (adaptive 10–15 questions that unlock up to a section checkpoint) → first lesson starts immediately (Duolingo gets the user into a lesson within ~60s)
   - Ask to "Install app" (PWA `beforeinstallprompt`) after the **first lesson complete**, not before
2. **Learn (path)**
   - Section/unit banners (colour, title, "GUIDEBOOK" button), winding nodes offset in a sine wave (±60px on 390px width, ±40px on 375px or less), dotted connector
   - Current node is larger, pulses, and has a "START" tooltip bubble; a "jump to current" floating button appears when scrolled away
   - Tapping a node opens a popover: title, "Lesson 2 of 4", START (+XP) / REVIEW / LEGENDARY; locked nodes say what unlocks them
   - Checkpoint "Jump here?" on locked units, which launches a checkpoint test
3. **Guidebook (unit notes)**: key concepts with code examples, the "cheat sheet" for the unit (rendered Markdown + highlighted Rust). Available offline.
4. **Lesson player**
   - Top bar: ✕ close (confirm sheet "Wait, don't go!"), progress bar with highlight stripe, hearts
   - Prompt area (instruction + code card) → answer area → sticky bottom **CHECK** button (disabled grey until answerable)
   - On check: a bottom feedback sheet slides up. Green: "Nicely done!" plus optional explanation. Red: "Correct solution:" plus explanation plus "Why?" expander. Then **CONTINUE**.
   - "Can't type now" / "Skip" options for free-typing exercises
   - Mid-lesson "combo" toasts; the progress bar flashes on streaks of correct answers
5. **Lesson complete**: big takeover, mascot celebrating, stat cards (Total XP, Accuracy %, Time), confetti, CONTINUE → streak-extended screen (first lesson of the day: big flame + week strip) → daily-goal chest (if reached) → back to the path, with the node fill animating
6. **Streak screen**: big flame + number, month calendar (active = orange, frozen = blue, repaired = striped, today pending = outline), freezes equipped (0–2), longest streak, milestone progress bar
7. **Practice hub**: Mistakes review (count badge), Smart practice (SRS), Code Reads library (completed ones replayable), **Playground** (online-only Run), Guidebook index
8. **Shop**: freezes, refill hearts, boosts, cosmetics. Gem balance at the top.
9. **Profile / stats**: avatar (mascot outfit), joined date, total XP, XP-per-day chart (last 7/30 days), current/longest streak, lessons completed, accuracy, concepts mastered, achievements grid
10. **Settings**: daily goal, hearts mode, sound, haptics, animations (reduced motion), theme (system/light/dark), code font size, reminder time, **Export data / Import data / Reset progress**, content version, licences/attributions, about

### 4.4 Mobile code ergonomics

- Code cards use horizontal scroll, never wrap mid-token; font size setting (13–18px); line numbers optional
- Syntax highlighting via Lezer/CodeMirror's Rust grammar in read-only mode (light) or pre-rendered highlighting at build time (zero runtime cost, best)
- **Rust symbol key row** above the soft keyboard for free-typing: `{ } ( ) [ ] < > ; : :: & &mut ' " ! ? | => -> . _ #`
- Token tiles show code in monospace; long tokens are allowed to wrap the tile row
- Portrait-locked feel; landscape works but isn't optimised

### 4.5 Accessibility

- Never rely on colour alone: correct/wrong also use icons and text
- All tiles are buttons with ARIA labels; drag-and-drop exercises always have a tap alternative
- Focus management in the lesson player (CHECK button reachable; feedback sheet announced via `aria-live`)
- Respect `prefers-reduced-motion`, `prefers-color-scheme`; scale with browser font size
- Minimum 44px touch targets; buttons 56px tall
- Contrast: use the darker "text" variants of correct/wrong colours for text on tinted backgrounds; check purple-on-dark and white-on-purple pairs

### 4.6 Mascots

- **Placeholder: Ferris** (public domain SVGs from [rustacean.net](https://rustacean.net/)) for M0–M5.
- **Long term: one mascot per language course**, with a shared art style (the Rust crab first, then others as courses are added). The app supports this from the start:
  - `course.yaml` declares `mascot: <id>`; components never hard-code Ferris
  - A `<Mascot :pose="'celebrate'" />` component loads poses from `public/mascots/<id>/<pose>.svg`
  - Pose set (minimum): `idle`, `wave`, `happy`, `celebrate`, `thinking`, `sad`, `sleepy` (streak at risk), `surprised` (wrong answer), `proud` (milestone), `teaching` (concept cards / guidebook)
- **Our Rust crab** should be **cuter than Ferris**: larger eyes, larger and more expressive claws, and a small mouth line for a wider emotional range. It's a **separate design task**: image generation for concept exploration → hand-cleaned SVG (layered: body, eyes, pupils, mouth, claws as separate groups) → animation (CSS/SMIL transforms on the groups for blink, claw wave and bounce; or Lottie/Rive if richer animation is needed). Keep each SVG small (< 15 KB) and animations disabled under `prefers-reduced-motion`.

### 4.7 CSS styling approach: options and tradeoffs

The Duolingo look relies on a handful of **custom effects** (3D ledge buttons with press animation, answer-tile states, pulsing path nodes, shake/pop animations, sine-wave path layout) plus a **consistent token system** (colours, radii, spacing) that must switch for light/dark. Every option below uses CSS custom properties for tokens; they differ in where component styles are written.

| | **A. Tokens + Vue scoped CSS** | **B. Tailwind CSS v4** | **C. UnoCSS** | **D. Vue component library** (PrimeVue, Vuetify, Quasar) |
|---|---|---|---|---|
| How it looks | `tokens.css` (`--colour-primary`, `--radius-tile`, …) + a `<style scoped>` block per component | Utility classes in templates (`rounded-2xl bg-primary shadow-[0_4px_0_var(--ledge)]`); tokens declared in CSS via `@theme` | Same idea as Tailwind (largely Tailwind-compatible presets), generated on demand by a Vite plugin | Pre-built components themed via tokens/pass-through props |
| Extra dependencies | None | `tailwindcss` + `@tailwindcss/vite` | `unocss` | Large library |
| Custom effects (ledges, press, shake) | Natural: write the CSS once in the component | Need `@utility` / component classes or long arbitrary values anyway | Shortcuts/rules in config, or plain CSS | Fighting the library's own look; overrides get messy |
| Template readability | Clean templates; styles live below | Long class strings; harder to scan state variants | Same as Tailwind (attributify mode can help) | Clean, but markup tied to the library API |
| Consistency enforcement | Relies on discipline (always use tokens; can lint with Stylelint) | Strong: the spacing/colour scale constrains choices | Strong (same as Tailwind) | Strong, but it's *their* consistency |
| Dark mode | Swap token values under `[data-theme=dark]` / `prefers-color-scheme` | `dark:` variants or token swap | Same as Tailwind | Built-in theming |
| Iteration speed | Moderate | Fast for layout/spacing tweaks | Fast | Fast for standard UI, slow for custom UI |
| Ecosystem / docs / LLM familiarity | Universal CSS knowledge | Very large; most examples online use it | Smaller; config quirks | Varies by library |
| Bundle size | Only what you write | Small (only used utilities are emitted) | Small | Large unless tree-shaken carefully |
| Fit for a bespoke game-like UI | **Best** | Good | Good | **Poor** |

Notes:
- **Headless primitives are complementary to any option.** [Reka UI](https://reka-ui.com/) (unstyled, accessible Vue primitives: dialog, popover, tabs, toast) can give the bottom sheets, node popovers and confirm dialogs correct focus trapping and ARIA behaviour without imposing a look.
- **Hybrid A + utilities** is common: scoped CSS for components, plus a tiny hand-written set of layout utilities (`.stack`, `.row`, `.gap-*`) to avoid repeating flexbox boilerplate.
- CSS-in-JS (for example vanilla-extract) is uncommon in Vue and not considered.

**Decision: A (tokens + scoped CSS) + Reka UI for interactive primitives.** The app is a small set of highly custom, animated components where hand-written CSS is clearest, and it adds no styling dependency. Add Stylelint with a rule that colours, radii and spacing come from tokens (no raw hex values in components). `tokens.css` is framework-agnostic, so moving to Tailwind v4 later would be contained.

---

## 5. Technical architecture (v1, client-only)

### 5.1 Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | **Vue 3 + Vite + TypeScript** (`<script setup>`) | Matches project preferences; small, fast |
| State | **Pinia** | Stores: `profile`, `progress`, `streak`, `economy`, `lesson`, `settings` |
| Routing | **vue-router** (`createWebHistory('/code-nybbles/')`) | See §5.5 for the GitHub Pages SPA fallback |
| Styling | CSS custom properties for tokens + scoped SFC styles; **Reka UI** for accessible primitives; Stylelint (§4.7) | Tokens drive light/dark |
| PWA | **vite-plugin-pwa** (Workbox) | Precache app shell + content; update prompt |
| Local DB | **IndexedDB via Dexie.js** | Typed tables, migrations, live queries |
| Tiny flags | `localStorage` | Only theme + "has onboarded" for a flash-free first paint |
| Code display | Build-time highlighting (Shiki at build → HTML) or CodeMirror 6 read-only | No heavy runtime highlighter |
| Code editor (playground/free-type) | **CodeMirror 6** + `@codemirror/lang-rust` | Much lighter and more mobile-friendly than Monaco |
| Validation | **zod** | Content schema validation at build and runtime |
| Animations | CSS + small helper (for example `canvas-confetti`) | Keep bundle light |
| Testing | **Vitest** (unit: streak/economy/grading), **Playwright** (e2e on a mobile viewport, offline mode) | |
| Lint/format | ESLint + Prettier, `vue-tsc` type checking | |
| Hosting | **GitHub Pages** at `pansapiens.github.io/code-nybbles/`, deployed by GitHub Actions | Free, HTTPS; constraints in §5.5 |
| Telemetry | **None in v1** | No analytics, crash reporting or network calls except content/app fetches and the opt-in Run button |

Bundle budget: < 200 KB JS gzipped for the shell; content loaded per section (≈ 50–150 KB JSON each) and precached.

### 5.2 Repository layout (proposed)

```
code-nybbles/
├── plans/                       # this planning documentation
├── app/                         # Vue PWA
│   ├── public/                  # icons, manifest assets, sounds
│   ├── src/
│   │   ├── components/          # DuoButton, AnswerTile, HudChip, PathNode, CodeCard, ...
│   │   ├── exercises/           # one renderer component + grader per exercise type
│   │   ├── views/               # Learn, Lesson, LessonComplete, Streak, Practice, Shop, Profile, Settings, Onboarding
│   │   ├── stores/              # Pinia stores
│   │   ├── db/                  # Dexie schema, migrations, repositories
│   │   ├── domain/              # pure TS: streak, xp, economy, srs, grading (100% unit-tested, framework-free)
│   │   ├── content/             # content loader, types generated from schema
│   │   ├── services/            # audio, haptics, notifications, install prompt, code-runner
│   │   └── styles/              # tokens.css, base.css
│   └── vite.config.ts
├── content/                     # authored lesson content (YAML + Markdown), see 03 doc
│   ├── course.yaml
│   └── sections/01-first-steps/unit-01-hello/...
├── tools/
│   ├── content-build/           # TS: validate (zod) → compile → app/public/content/*.json
│   └── rust-verify/             # Cargo project: extracts every snippet, compiles/runs, checks expected output/errors
└── android/                     # (later) Capacitor project
```

`domain/` is pure TypeScript with no Vue or Dexie imports. This keeps the game rules testable and lets them be reused server-side later (for example in a Node/TS sync service, or re-validated in Python if the backend is FastAPI).

### 5.3 Offline and PWA

- `manifest.webmanifest`: `name: "Code Nybbles"`, `short_name: "Nybbles"`, `id`/`start_url`/`scope: "/code-nybbles/"`, `display: standalone`, `orientation: portrait`, `theme_color`, `background_color`, maskable icons (192/512), `shortcuts` (Continue lesson, Practice), `categories: ["education"]`
- Service worker (Workbox via vite-plugin-pwa):
  - Precache the app shell, fonts, sounds, and **all content JSON for unlocked + next section** (or the whole course if < ~5 MB)
  - Runtime cache: stale-while-revalidate for content manifests
  - Update flow: a "New lessons available, refresh" toast (`registerType: 'prompt'`), never mid-lesson
- Call `navigator.storage.persist()` after onboarding so the browser is less likely to evict IndexedDB
- Detect online/offline; show "Run" buttons disabled with a hint when offline

### 5.4 Content versioning

- The content build emits `content/manifest.json` with `{ contentVersion, sections: [{ id, hash, url }] }`
- All IDs (section/unit/level/lesson/exercise/concept) are **stable slugs**, never array indices, so progress survives content edits
- If a level is removed, progress on it is retained but ignored; if lessons are added to a completed level, it stays complete (don't regress users)

### 5.5 Hosting on GitHub Pages

Target: `https://pansapiens.github.io/code-nybbles/` (a project site served from the `code-nybbles` repo).

- **Base path:** Vite `base: '/code-nybbles/'`; router `createWebHistory(import.meta.env.BASE_URL)`; manifest `scope`/`start_url`/`id` and the SW scope all under `/code-nybbles/`. Content fetches use `import.meta.env.BASE_URL`, never absolute `/` paths.
- **SPA deep links:** GitHub Pages has no rewrite rules, so the build copies `index.html` to `404.html`. A cold deep link (for example `/code-nybbles/streak`) is served with an HTTP 404 status but renders the app correctly (harmless here, since SEO isn't a goal). Once the service worker is installed, its navigation fallback serves the shell for all in-scope URLs, so installed users never hit this. Fallback option if it causes trouble: hash routing (`createWebHashHistory`).
- **Deployment:** a GitHub Actions workflow on push to `main`: install → type-check → unit tests → `content-build` (with `rust-verify`) → `vite build` → `actions/upload-pages-artifact` + `actions/deploy-pages`. Add a `.nojekyll` file so files and folders starting with `_` are served.
- **No custom HTTP headers:** GitHub Pages can't set headers. Consequences:
  - No COOP/COEP headers means no `SharedArrayBuffer`, which in-browser compilers like Rubrc need (Tier 2, §7). The workaround is [coi-serviceworker](https://github.com/gzuidhof/coi-serviceworker), which injects the headers from a service worker; it would have to be merged into our own SW. This only matters if Tier 2 is adopted.
  - No custom CSP header; use a `<meta http-equiv="Content-Security-Policy">` tag instead (allow `connect-src` to `play.rust-lang.org` for the Run button).
  - Cache headers are fixed (around 10 minutes); that's fine because Workbox precaching with hashed filenames controls freshness.
- **Origin sharing:** every project site under `pansapiens.github.io` shares one origin, so IndexedDB, localStorage and service-worker storage quotas are shared with any other project sites there. Mitigations: namespaced DB name (`code-nybbles`) and a SW scoped to `/code-nybbles/`. A custom domain later (CNAME) would give the app its own origin, but **changing origin orphans existing local data**, so users would need export/import (or v2 sync). Decide on a custom domain before public launch if one is likely.
- **TWA caveat:** a Trusted Web Activity needs `/.well-known/assetlinks.json` at the **origin root**, which lives in the separate `pansapiens.github.io` user-site repo. This is another reason to prefer Capacitor (§8.2).

---

## 6. Local data model (Dexie / IndexedDB)

Two kinds of data:
1. **Append-only event log**: the source of truth, designed for future server sync.
2. **Derived/materialised tables**: for fast UI, rebuildable from events.

```ts
// db/schema.ts
import Dexie, { type Table } from 'dexie';

export type LocalDate = string; // 'YYYY-MM-DD'

export interface ActivityEvent {
  id: string;            // uuid v7 (time-ordered)
  deviceId: string;
  type:
    | 'lesson_completed' | 'practice_completed' | 'checkpoint_passed' | 'code_read_completed'
    | 'xp_awarded' | 'gems_awarded' | 'gems_spent'
    | 'freeze_equipped' | 'freeze_used' | 'streak_lost' | 'streak_repaired'
    | 'heart_lost' | 'hearts_refilled' | 'achievement_unlocked' | 'settings_changed';
  ts: number;            // epoch ms (UTC)
  localDate: LocalDate;  // computed at write time in the device's timezone
  tz: string;            // IANA timezone at write time
  payload: Record<string, unknown>;
  syncedAt?: number;     // v2: when uploaded to server
}

export interface Profile {        // singleton, id = 'me'
  id: 'me';
  createdAt: number;
  displayName?: string;
  experience: 'new' | 'other-lang' | 'some-rust';
  dailyGoalXp: 10 | 20 | 30 | 50;
  reminderTime?: string;          // 'HH:mm'
  mascotOutfit?: string;
}

export interface LevelProgress {
  levelId: string;
  lessonsCompleted: number;       // ring fill
  completedAt?: number;
  legendaryAt?: number;
  bestAccuracy?: number;
}

export interface DailyStat {      // derived
  localDate: LocalDate;
  xp: number;
  sessions: number;
  status: 'active' | 'frozen' | 'repaired' | 'missed';
}

export interface StreakState {    // singleton derived cache, id = 'me'
  id: 'me';
  currentStreak: number;
  longestStreak: number;
  lastSettledDate: LocalDate;
  freezesEquipped: number;        // 0..2
  lostStreak?: { length: number; lostOn: LocalDate; earnBackProgress: number };
}

export interface Wallet { id: 'me'; gems: number; hearts: number; heartsUpdatedAt: number; }

export interface ConceptStrength {
  conceptId: string;
  box: number;                    // Leitner box 0..6
  dueDate: LocalDate;
  correct: number;
  incorrect: number;
  lastSeenAt: number;
}

export interface MistakeRecord {
  id: string;
  exerciseId: string;
  lessonId: string;
  answeredAt: number;
  given: unknown;
  resolved: boolean;
}

export interface Setting { key: string; value: unknown; }

export class CodeNybblesDB extends Dexie {
  events!: Table<ActivityEvent, string>;
  profile!: Table<Profile, string>;
  levelProgress!: Table<LevelProgress, string>;
  dailyStats!: Table<DailyStat, string>;
  streak!: Table<StreakState, string>;
  wallet!: Table<Wallet, string>;
  concepts!: Table<ConceptStrength, string>;
  mistakes!: Table<MistakeRecord, string>;
  settings!: Table<Setting, string>;

  constructor() {
    super('code-nybbles');
    this.version(1).stores({
      events: 'id, type, localDate, ts, syncedAt',
      profile: 'id',
      levelProgress: 'levelId',
      dailyStats: 'localDate',
      streak: 'id',
      wallet: 'id',
      concepts: 'conceptId, dueDate',
      mistakes: 'id, exerciseId, resolved, answeredAt',
      settings: 'key',
    });
  }
}
```

Rules:
- Writes that change state go through a single `commit(events[])` function that appends events **and** updates derived tables in one Dexie transaction
- A `rebuildDerived()` function replays all events from scratch (used after import, in tests, and as a "repair data" option in settings)
- **Export:** JSON file (`code-nybbles-backup-YYYY-MM-DD.json`) with events + profile + settings + schema version. **Import:** validate with zod, merge by event ID (idempotent), rebuild derived tables. Prompt a backup reminder every ~30 days, since local-only data is fragile.

---

## 7. Running Rust code (optional, tiered)

Most exercises **don't need execution**. Correct answers and expected outputs/compiler errors are precomputed at content build time with real `rustc` (see `03` doc). Execution is only for the Playground and free-form coding challenges.

| Tier | Approach | Offline | Effort | When |
|---|---|---|---|---|
| **0** | No execution. All exercises statically graded; expected stdout/errors baked in at build time. | ✅ | Low | **MVP** |
| **1** | **Remote sandbox:** official Rust Playground API (`play.rust-lang.org`, used by mdBook "Run" buttons) for the Playground and challenges; grade by stdout match or by appending `#[test]` harness code. | ❌ | Low | v1.x |
| **1b** | **Self-hosted** [rust-playground](https://github.com/rust-lang/rust-playground) (Docker) behind our own domain, when traffic or usage policy requires | ❌ | Medium | v2 (with backend) |
| **2** | **In-browser compiler** (experimental): rustc compiled to WASM, for example [Weblings](https://github.com/AngelOnFira/weblings) (rustc + cranelift → wasm, runs Rustlings in-browser) or [Rubrc](https://github.com/oligamiq/rubrc) (rustc + LLVM in a worker; needs COOP/COEP headers, which GitHub Pages can't set without a service-worker workaround, see §5.5). Offered as an optional large download ("Offline compiler pack"). | ✅ | High / risky | Spike in M4; priority fallback if the Playground becomes unusable; adopt as an optional offline pack if size/speed are acceptable on mid-range Android |

**Decision: use `play.rust-lang.org` for Tier 1.** Checked on 2026-10-17: `POST https://play.rust-lang.org/execute` answers CORS preflights with `Access-Control-Allow-Origin: *`, and a request from a `pansapiens.github.io` origin compiled and ran an edition-2024 program in about 2.5 seconds. Example request body:

```json
{ "channel": "stable", "mode": "debug", "edition": "2024", "crateType": "bin",
  "tests": false, "code": "fn main() { println!(\"hi\"); }", "backtrace": false }
```

The response is `{ success, exitDetail, stdout, stderr }`; compiler diagnostics arrive in `stderr` (parse `error[E....]` codes from it). For challenges graded by tests, send `"tests": true` with `#[test]` functions appended.

Notes:
- **Be a good citizen:** the API is unofficial and shared. Throttle on the client (for example at most one in-flight request and roughly 10 runs per minute), use a short timeout, show a "Runs on play.rust-lang.org" notice, and don't call it automatically (only on an explicit RUN tap). There is no auth and no documented rate limit, so expect it could change.
- **If it's unavailable** (offline or a transient error), fall back immediately to Tier 0 self-check: show the expected output and the reference solution with "Compare with solution", and award XP without grading.
- **If it becomes unusable long-term** (blocked, rate-limited, or the API changes), the **priority replacement is Tier 2, the in-browser compiler**, rather than self-hosting. It keeps the app serverless and adds offline running. So the Tier 2 spike happens early (M4, see the roadmap), so the option is proven before it's needed. Tier 1b self-hosting stays a v2 option once a backend exists.
- The `CodeRunner` interface (below) makes the swap a configuration change: `RemotePlaygroundRunner`, `WasmCompilerRunner`, `SelfCheckRunner`, chosen by availability and user setting ("Use offline compiler" once the pack is downloaded).
- A `CodeRunner` interface in `services/code-runner.ts` (`run(code, { mode: 'run' | 'test' }) → { stdout, stderr, exitCode, compileErrors }`) hides which tier is used.
- Challenge grading never depends on exact compiler wording across Rust versions. Match on error **codes** (E0382) and stdout, not full messages.

---

## 8. Android strategy and notifications

### 8.1 Phase A: installable PWA (MVP)

- Chrome on Android offers "Install app" from the manifest. The app runs standalone, offline, with its own icon.
- **Reminders without a server are unreliable on the web:**
  - The Notification Triggers API (scheduled local notifications) was abandoned by Chrome
  - Web Push needs a push server (v2)
  - **Periodic Background Sync** (Chrome, installed PWAs only, browser-controlled interval of roughly a day, engagement-gated) could show a "streak at risk" notification. It is **best-effort and untimed**; implement it as an experiment behind a setting.
- So in Phase A, rely on in-app nudges: streak-at-risk banner, HUD flame state, and installing to the home screen for visibility. Optionally, a "Add reminder to calendar" button that downloads an `.ics` daily recurring event at the chosen time. It works on every platform with zero infrastructure.

### 8.2 Phase B: Android app wrapper

| Option | Pros | Cons |
|---|---|---|
| **Trusted Web Activity (Bubblewrap)** | Tiny APK, it *is* Chrome running the hosted PWA, auto-updates with the website, notification delegation | Notifications still need **Web Push (server)**; depends on the hosted site + Digital Asset Links (`assetlinks.json` must sit at the `pansapiens.github.io` origin root, in a different repo); no native local scheduling |
| **Capacitor** (recommended) | Bundles the same Vue build into a WebView, **works fully offline from first launch**, `@capacitor/local-notifications` gives **exact daily reminders with no server**, native haptics, splash, status bar, app widgets (via a small native plugin) later | Larger APK; app-store release needed for updates (or use live updates); WebView IndexedDB is per-app (a separate data store from the browser PWA; use export/import or v2 sync to move data) |

**Recommendation: Capacitor**, because the v1 product is single-user and serverless, and reliable streak reminders are the main reason to wrap it at all. Keep the platform-specific code behind small service interfaces (`notifications`, `haptics`, `storage-persist`, `share`) with web and Capacitor implementations, so the same codebase ships as a PWA and an APK/AAB.

Android reminders (Phase B):
- Daily reminder at the user's chosen time, **only if no lesson completed today** (reschedule tomorrow's reminder immediately after the day's first lesson, cancel today's)
- Evening "streak at risk" reminder (for example 2 hours before midnight) when the streak is above 0 and today is incomplete
- Max 2 notifications/day; friendly copy with mascot variants; respect Android 13+ `POST_NOTIFICATIONS` runtime permission, requested after the first completed lesson, not at launch
- Later: home-screen streak widget (native plugin)

---

## 9. Roadmap and milestones

Rough sizing assumes one developer plus AI assistance. Content authoring is the long pole and runs in parallel from M1 onwards.

### M0: Foundations (≈ 1 week)
- Scaffold Vite + Vue + TS + Pinia + router + vite-plugin-pwa + Dexie + Vitest + Playwright
- Design tokens (light/dark), base components: `DuoButton` (primary/secondary/danger, ledge press), `AnswerTile`, `HudChip`, `ProgressBar`, `BottomSheet`, `TabBar`, `CodeCard`
- App shell: top HUD, bottom tabs, desktop sidebar layout, routing skeleton
- Manifest, icons, SW precache, offline smoke test
- **Done when:** installable, offline-loading shell with placeholder screens on a mobile viewport; Lighthouse PWA checks pass

### M1: Content pipeline + lesson engine (≈ 2–3 weeks)
- Content schema (zod), YAML authoring format, `content-build` tool → JSON per section, manifest + hashes
- `rust-verify` harness: compile/run every snippet, check `expect` blocks (output / compile error codes); runs in CI
- Lesson player: queue, CHECK/feedback/CONTINUE, mistake re-queue, progress bar, exit confirmation
- Exercise renderers + graders for the core set: concept card, multiple choice, predict output, fill-the-blank tokens, Parsons (order lines), does-it-compile, spot-the-bug, match pairs (see `03` doc)
- Sound + haptics service
- Author Section 1, Units 1–2 as the vertical slice
- **Done when:** a user can complete real lessons offline; all content snippets are verified in CI

### M2: Path + gamification (≈ 2 weeks)
- Learning path rendering (sine-wave nodes, banners, guidebook, node popovers, locking rules, jump-to-current)
- XP, daily goal + chest, streak + reconciliation + freezes + repair/earn-back, hearts (with setting), gems, shop
- Lesson-complete, streak-extended and milestone celebration screens
- Streak calendar screen; profile/stats; achievements v1
- Event log + derived tables + rebuild; export/import
- **Done when:** the domain layer has full unit-test coverage, including streak edge cases with a mocked clock and timezones

### M3: Beginner content complete (≈ 3–5 weeks, parallel)
- Syllabus sections 1–5 (≈ 18–22 units). Guidebooks for each unit. Code Reads every 2–3 units. Checkpoints.
- Content QA pass: difficulty curve, typos, explanation quality, distractor quality
- **Done when:** content for the first ~150–200 lessons is verified and play-tested

### M4: Practice + review (≈ 1–2 weeks)
- Concept tagging → Leitner SRS; practice node; mistakes review; practice hub UI
- Placement test (adaptive, unlock to a checkpoint)
- Onboarding flow
- **Spike Tier 2 in-browser compiler** (Weblings / Rubrc): download size, compile time on a mid-range Android phone, and whether it works on GitHub Pages (COOP/COEP via a service worker). Go/no-go decision recorded; it's the priority fallback if the Playground becomes unusable (§7).
- **Done when:** a new user can onboard, place, learn, and review

### M5: Polish + launch PWA v1.0 (≈ 1–2 weeks)
- Accessibility audit, reduced motion, dark mode QA, font scaling
- Performance on a low-end Android device (path scroll at 60fps, lesson transitions < 100ms)
- Install prompt timing, update prompt, storage persistence, backup reminders
- Optional: Periodic Background Sync experiment, `.ics` reminder
- Deploy to GitHub Pages via Actions (§5.5); error logging is a local-only ring buffer included in exported backups (no telemetry in v1)

### M6: Playground + Android (≈ 2 weeks)
- `CodeRunner` Tier 1 (remote sandbox) → Playground screen + "Build" project nodes with runnable checks
- Capacitor Android project, local-notification reminders, native haptics, splash/icons, Play Store internal testing track
- If the M4 spike was a "go": ship the optional "Offline compiler pack" (`WasmCompilerRunner`)

### Content continues (ongoing)
- Sections 6–15 released incrementally (content-only updates via SW for the PWA; app updates or live updates for Capacitor)

### v2: Server + social (future, separate plan)
- Backend: **FastAPI (async) + PostgreSQL + SQLAlchemy 2 async + Alembic**, deployed with Docker Compose; `.env` / `.env.example` for config
- Hosting moves beyond GitHub Pages for the API (the static PWA can stay there)
- Accounts (email magic link / OAuth), **event-log sync**: the client uploads unsynced events (`syncedAt IS NULL`); the server dedupes by event UUID, recomputes authoritative streak/XP with the same rules, and returns merged state. Local-first: the app keeps working offline.
- Web Push (VAPID) for PWA reminders; FCM for the Capacitor app
- Weekly **leagues** (30-person cohorts, promotion/demotion tiers), friends, follow, friend quests, daily/monthly quests
- Server-side challenge grading (self-hosted playground), optional AI hints for compiler errors
- Content delivered from a CDN with versioning

### 9.4 Designing now for v2 sync
- UUIDv7 IDs on every event; `deviceId` generated at first launch
- Never mutate or delete events; corrections are new events
- Game rules live in `domain/` as pure functions over events, so the server can re-run them
- Timestamps in UTC plus `localDate` + `tz` captured at write time

---

## 10. Testing strategy

- **Domain unit tests (Vitest):** streak reconciliation (gaps, freezes, repair, earn-back, DST, timezone travel, long absences), XP/daily goal, hearts regeneration, gem economy, SRS scheduling, every grader (including whitespace/token normalisation)
- **Content tests:** schema validation, unique stable IDs, every referenced concept exists, distractors ≠ answer, each lesson has 8–15 exercises, every snippet verified by `rust-verify`
- **Component tests:** exercise renderers (tap and keyboard paths)
- **E2E (Playwright, Pixel-sized viewport):** onboarding → first lesson → streak = 1; offline mode lesson; export → reset → import restores state; mocked date advancing to test freeze use
- **Manual device testing:** mid-range Android Chrome (install, offline, performance), desktop Chrome/Firefox/Safari

---

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Content volume is huge (hundreds of lessons) | Strong schema + templates; LLM-assisted *drafting* with mandatory `rust-verify` + human review; ship sections incrementally |
| Incorrect Rust in content damages trust | Every snippet compiled/run in CI against pinned stable Rust (edition 2024); expected errors matched by error code |
| Rust version drift (error messages/lints change) | Match error codes, not prose; pin toolchain in `rust-toolchain.toml`; scheduled CI against latest stable |
| Local data loss (browser eviction, uninstall) | `storage.persist()`, periodic backup reminders, export/import; v2 sync |
| Web reminders unreliable | In-app nudges + `.ics` now; Capacitor local notifications in M6 |
| Typing code on phones is miserable | Token-based exercises dominate; symbol key row; free-typing kept short and optional ("Can't type now") |
| Remote sandbox availability/policy | Client-side throttling, explicit RUN only; Tier 0 fallback always works; self-host in v2 |
| Trademark issues | Original name; public-domain Ferris as placeholder, then an original crab; follow Rust Foundation policy; no Duolingo assets |
| Shared `github.io` origin | Namespaced storage; decide on any custom domain before public launch (changing origin orphans local data) |
| Hearts frustrate learners | Hearts off by default; when on, practice always refills; never hard-block |

---

## 12. Decisions log

| # | Topic | Decision (2026-10-17) |
|---|---|---|
| 1 | Name | **Code Nybbles**; slug `code-nybbles` (see header) |
| 2 | Mascot | Ferris as placeholder; a cuter original crab (larger eyes and claws, expressive mouth) as a separate design task; one mascot per language course eventually (§4.6) |
| 3 | Hearts | **Off by default**; the system is still built and can be enabled in settings (§3.8) |
| 4 | Styling | **Tokens + Vue scoped CSS + Reka UI** (option A, §4.7) |
| 5 | Remote sandbox | Use `play.rust-lang.org` (CORS verified), with throttling and an immediate Tier 0 fallback; if the Playground becomes unusable long-term, the in-browser compiler (Tier 2) is the priority replacement (§7) |
| 6 | Licensing | Content CC BY-SA 4.0; app code and Rust snippets MIT OR Apache-2.0 (§13) |
| 7 | Hosting | GitHub Pages at `pansapiens.github.io/code-nybbles/` (§5.5) |
| 8 | Telemetry | None in v1 |
| 9 | Brand colour | **Purple** primary (`#7C4DFF`) instead of Duolingo green; green kept only for "correct" feedback (§4.1) |

Remaining open questions:
1. **Custom domain** before public launch? Moving origin later orphans local data (§5.5)

---

## 13. Licensing

*Not legal advice. This is a summary of how the licences are usually interpreted.*

### 13.1 Our licences

| What | Licence | Files |
|---|---|---|
| App source code, tools, build scripts | **MIT OR Apache-2.0** (dual, the Rust ecosystem convention) | `LICENSE-MIT`, `LICENSE-APACHE` at repo root |
| Lesson content: prose, explanations, guidebooks, exercise text, diagrams | **CC BY-SA 4.0** | `content/LICENSE` |
| Rust code examples inside lesson content | **MIT OR Apache-2.0** (stated in `content/LICENSE`) | So learners can reuse snippets freely; CC licences aren't recommended for code |
| Mascot artwork (our crab, later mascots) | Decide when commissioned: CC BY-SA 4.0 like the content, or all rights reserved to protect the brand | `public/mascots/LICENSE` |

Dual MIT OR Apache-2.0 (rather than MIT alone) matches the Rust Book and the wider Rust ecosystem, and adds Apache-2.0's explicit patent grant.

### 13.2 Compatibility with sources

| Source | Licence | Compatible? | Obligations |
|---|---|---|---|
| The Rust Book, Rust by Example, std docs, error index, Async Book, Rustonomicon | MIT / Apache-2.0 (dual) | ✅ | Choose the MIT side: keep the copyright and permission notice in attributions |
| Brown interactive Rust Book | Fork of the Book (MIT / Apache-2.0); **verify** the quiz and visualisation additions before adapting them | ✅ (if confirmed) | As above |
| Rustlings, Tokio tutorial, Exercism Rust track, Too Many Linked Lists | MIT | ✅ | Keep the copyright and permission notice |
| Comprehensive Rust | Apache-2.0 | ✅ | Include the Apache-2.0 licence text, keep copyright notices, **state that the material was changed**, carry over any `NOTICE` file contents |
| Ferris artwork (rustacean.net) | Public domain (CC0) | ✅ | None (credit as a courtesy) |
| Rust Design Patterns | MPL-2.0 (verify) | ⚠️ Reference only | MPL is file-level copyleft; don't copy text, only link |
| 100 Exercises to Learn Rust | Unverified | ⚠️ Reference only until checked | Link only |
| Commercial books (Programming Rust, Rust for Rustaceans, …) | All rights reserved | ❌ | Link/recommend only; never adapt text or examples |

MIT and Apache-2.0 both allow adapted material to be distributed under CC BY-SA 4.0 (for prose) or MIT OR Apache-2.0 (for code), as long as their notice requirements are met. Ideas, topic ordering and common idioms (for example a `first_word` function or FizzBuzz) aren't protected, but we credit the sources anyway.

### 13.3 Implementation

- `unit.yaml` gets an optional `sources:` list (`{ name, url, licence, adapted: true|false, changes: "Rewritten as exercises" }`), which `content-build` validates against an allow-list of compatible licences
- The build generates `ATTRIBUTIONS.md` and the in-app **Settings → Licences & attributions** screen from those entries, including the full MIT/Apache notices
- CI fails if a unit cites a source whose licence isn't on the allow-list

# Code Nybbles

Learn Rust in bite-sized daily lessons. A mobile-first, offline-capable PWA with a Duolingo-style path,
streaks and exercises built for reading, predicting, assembling and fixing Rust code.

Hosted at <https://pansapiens.github.io/code-nybbles/>. Not an official Rust project.

- Design and roadmap: [`plans/`](plans/)
- Implementation progress: [`TODO.agents.md`](TODO.agents.md)

## Development

Requires Node 24 and pnpm 10. Rust stable is needed for content verification (from M1).

```sh
pnpm install
pnpm content:build       # validate content/, verify every snippet with rustc, write app/public/content/
pnpm dev                 # dev server at http://localhost:5173/code-nybbles/
pnpm test                # unit tests (all workspace packages)
pnpm type-check
pnpm build               # content build + type-check + production build to app/dist
```

`pnpm content:check` validates content without compiling snippets. Snippets are compiled with the toolchain
pinned in `tools/rust-verify/rust-toolchain.toml` (rustup installs it on first use). If linking fails because
the `cc` on your PATH can't link Rust's std (for example a conda/micromamba gcc), point it at the system
compiler: `export RUST_VERIFY_LINKER=/usr/bin/gcc`.

In `app/`:

```sh
pnpm test:e2e            # Playwright against the production build (mobile + desktop Chromium)
pnpm lint && pnpm lint:style
pnpm type-check
```

The dev server has a component gallery at `/code-nybbles/dev/components`.

## Android

The Android app is the same Vue build wrapped with Capacitor (`app/android/`), with native haptics and local
reminder notifications (set in Settings, or during onboarding).

Needs JDK 21 (Gradle 8.14 does not run on newer JDKs) and the Android SDK; Gradle downloads missing SDK platforms.

```sh
pnpm content:build
cd app
pnpm build:android       # build with base "/" and copy into app/android (cap sync)
export ANDROID_HOME=~/Android/Sdk JAVA_HOME=/path/to/jdk-21
cd android && ./gradlew assembleDebug     # or: pnpm exec cap open android
```

The debug APK is written to `app/android/app/build/outputs/apk/debug/app-debug.apk`.

## Layout

| Path | Contents |
|---|---|
| `app/` | Vue 3 + Vite + TypeScript PWA |
| `app/src/domain/` | Pure TypeScript game rules (streak, XP, economy, SRS, grading), no framework imports |
| `app/src/db/` | Dexie (IndexedDB) schema |
| `tools/content-build/` | Content zod schema (shared with the app), validation, cross-checks, JSON bundles, snippet verification |
| `tools/rust-verify/` | Pinned Rust toolchain and the verification cache |
| `content/` | Course content (YAML + Markdown) |

## Licence

App code, tools and Rust code snippets: MIT OR Apache-2.0 ([`LICENSE-MIT`](LICENSE-MIT),
[`LICENSE-APACHE`](LICENSE-APACHE)). Lesson content: CC BY-SA 4.0 ([`content/LICENSE`](content/LICENSE)).

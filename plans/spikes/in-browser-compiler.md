# Spike: in-browser Rust compiler (Tier 2, "offline compiler pack")

Date: 2026-10-18. Time-boxed spike for plan 01 §7 (Tier 2) and §5.5 (COOP/COEP on GitHub Pages).

## Recommendation: not yet (Weblings is close; Rubrc is a no-go)

- **Weblings** (rustc + Cranelift to wasm) is technically viable for an optional offline pack today on desktop: 44 MB gzip download, about 0.1-0.4 s per compile-and-run, edition 2024, std works, JSON diagnostics with error codes, no SharedArrayBuffer or COOP/COEP needed, and it already runs on GitHub Pages. It matched our verified expectations on 5,434 course snippets with a handful of explainable differences (below).
- It is **not ready to adopt** because: (a) it is untested on phones, and needs about 0.7-1 GB of extra RAM in the browser; (b) the Cranelift-to-wasm backend has gaps (for example parsing a `u16` fails to compile); (c) it is a three-month-old, single-maintainer project built on patched rustc forks, with no tagged releases.
- **Rubrc** is a no-go: rustc 1.83 (no edition 2024), 75 MB brotli download, 4.7 GB peak browser RSS, 15 s to compile a 37-line program, needs COOP/COEP.
- Keep Tier 1 (play.rust-lang.org) as planned. Revisit Weblings in M6 with a real-device test (see the last section). If the Playground becomes unusable before then, Weblings is the fallback to prototype, not Rubrc.

## Method

- Read both READMEs, issues and commit history; checked asset sizes via the GitHub API and by downloading the assets to `/tmp/cn-spike/` (nothing built or executed locally).
- Drove both public demos with Playwright Chromium 1248 (headless, desktop Linux, warm HTTP cache after the first load). Peak RSS is the sum over all Chromium processes, sampled every 200-250 ms; a blank page measures 0.9 GB on the same machine, so subtract that.
- For Weblings, called its page API (`window.runRust`, `window.runTests`) directly. Ran every cached snippet from `tools/rust-verify` (5,434 sources) and compared against our pinned-rustc outcomes. Scripts: `/tmp/cn-spike/scripts/`.
- Throttling with `Emulation.setCPUThrottlingRate` does not slow Web Workers, so there is no emulated phone number. No real Android or iOS device was available.

## 1. Download size

| | Compressed (as served) | Uncompressed | Contents |
|---|---|---|---|
| Weblings | 44.0 MB gzip (rustc.wasm 20.3 MB + sysroot bundle 23.7 MB); 27.2 MB if re-compressed with brotli -q11 | 159 MB (rustc.wasm 87.9 MB + `sysroot-wasip1.bundle` 71.3 MB) | rustc + Cranelift + clif2wasm + linker in one wasm; wasm32-wasip1 std/core/alloc/test rlibs |
| Rubrc v2 | 75.4 MB brotli (vfs.core wasm 56.0 MB in three parts + sysroot tar 18.9 MB) | 458 MB (384 MB wasm + 74 MB sysroot) | rustc + LLVM + clang + cargo + rust-analyzer in one wasm |

Weblings' UI page also loads a 2.1 MB Leptos UI wasm we would not need. Cache API storage holds decoded bodies, so on-device storage is roughly the uncompressed size (about 160 MB for Weblings) on the `pansapiens.github.io` origin we share with other project sites.

Release assets for the toolchain builds are at https://github.com/AngelOnFira/wasm-rustc/releases (`rustc-wasm.tar.zst` 17.2 MB, `wasip1-sysroot.tar.zst` 43.4 MB, tag `artifacts-test-7`, 2026-07-22).

## 2. Speed and memory (desktop Chromium)

| | Toolchain ready after page load | Hello world | 37-line program (String, Vec, struct, HashMap) | E0382 program |
|---|---|---|---|---|
| Weblings | 11-14 s (cold network), then a worker pool warms | 105-117 ms total (compile 76-84 ms, link 18 ms) | 312-395 ms | 94-102 ms (to diagnostic) |
| Rubrc (`cargo run`, debug) | 27-36 s | 2.4 s compile, 4.0 s wall | 14.8 s compile, 16.6 s wall | 1.7 s compile, 3.1 s wall |

Course corpus through Weblings: median 114 ms, p90 137 ms per snippet.

Memory (all Chromium processes, blank page = 0.9 GB):

- Weblings: 1.6-1.7 GB once ready, 1.8-1.9 GB peak during compiles, so roughly 0.7-1.0 GB attributable to it. That includes a pool of two pre-instantiated workers (`POOL_TARGET = 2` in `runner.js`); a pool of one would use less.
- Rubrc: 3.4 GB once ready, 4.1-4.7 GB peak, with eight `thread_spawn` workers.

Mobile: neither project publishes phone timings or memory figures. Weblings added a mobile layout in July 2026 (PR #2, issue #1), which shows it loads on phones but gives no numbers. A 1 GB working set is a real risk on 3-4 GB Android phones and on iOS Safari, which has historically limited large wasm memories. Rubrc's footprint rules it out on phones.

## 3. Requirements and hosting

- **Weblings:** `rustc.wasm` is single-threaded with its own linear memory (`runner.js`: "non-threaded ... no SharedArrayBuffer needed"). Needs Web Workers, WebAssembly, the Cache API and `fetch` streaming, all present in current Chrome Android, Firefox and Safari iOS (not tested on Firefox or Safari here). `crossOriginIsolated` was `false` on the demo and it worked. The demo itself is served from GitHub Pages (`x-github-request-id`, `cache-control: max-age=600`), so our hosting works unchanged.
- **Rubrc:** requires COOP/COEP (README warning; the demo sends `cross-origin-embedder-policy: require-corp` and `cross-origin-opener-policy: same-origin`) and SharedArrayBuffer threads. Firefox had an `Atomics.waitAsync is not a function` issue (#5, closed 2025-09).
- **coi-serviceworker and Workbox:** only one service worker can control the `/code-nybbles/` scope, so coi-serviceworker would have to be merged into our Workbox SW as a fetch handler that re-wraps every response with COOP/COEP headers. Side effects: the first visit needs a reload before isolation applies, and `require-corp` blocks cross-origin resources without CORP (fonts or images from other origins; `credentialless` helps on Chromium only). Weblings avoids all of this.
- **Workbox integration for Weblings:** do not precache the pack (Workbox's default `maximumFileSizeToCacheInBytes` is 2 MB and precaching would force 44 MB on every user). Fetch it on an explicit "Download offline compiler" action into a separate named Cache, as Weblings' own `runner.js` already does (`weblings-toolchain-v1`), and call `navigator.storage.persist()`.
- **Hosting the files ourselves:** both files are under GitHub's 100 MB per-file limit, and the Pages site limit is 1 GB. Copy them into the Pages artifact at build time from the wasm-rustc release rather than committing them. Fetching directly from GitHub release URLs at runtime is not an option, because release downloads do not send CORS headers.

## 4. Rust version, edition, diagnostics, std

| | Weblings | Rubrc |
|---|---|---|
| rustc | 1.96.0-dev (patched nightly from bjorn3's `compile_rustc_for_wasm` branches) | 1.83.0-dev (`rustc --version` in the demo) |
| Edition 2024 | Yes, invoked with `--edition 2024` | No (2024 was stabilised in 1.85); demo `Cargo.toml` says 2021 |
| Error codes | Yes: `--error-format=json`, each diagnostic has `code` (for example `E0382`, `E0106`) plus the rendered text | Yes, in rendered terminal text |
| std | `println!`, `String`, `Vec`, `HashMap`, `BTreeMap`, `HashSet`, `Rc<RefCell<_>>`, `Box<dyn Trait>`, slice patterns and closures all worked | Worked for the programs tried |

Weblings against our 5,434 verified snippets:

- 2,487 of 2,487 expected compile failures produced the same set of error codes.
- Of the 2,947 snippets that compile natively, the differences were: integer overflow (14 snippets panic natively with "attempt to add with overflow" but wrap silently or loop under Weblings), one out-of-bounds constant index rejected at compile time instead of panicking at run time, and 11 runs that hit our 30 s timeout (3 are deliberate infinite loops natively; others are overflow cases that loop). All of these come from Weblings compiling with `-O`, which turns off overflow checks. Since we would own `worker.js`, passing `-C overflow-checks=on` or dropping `-O` should fix this (not tested).
- No backend failures in the corpus, but they exist: `let m: u16 = "300".parse().unwrap();` fails with `wasm emission failed ... extend to i16 unimplemented` (same as open issue #4, a Rustlings exercise). Plain `u16` arithmetic works.
- `runTests` builds with `-Cpanic=abort`, so the first failing `#[test]` aborts the run and later tests are not reported. Test-graded challenges would need one test per run, or plain `main`-based checks.

## 5. Maintenance, licence, embedding effort

| | Weblings | Rubrc |
|---|---|---|
| Licence | MIT (repo and wasm-rustc) | README says MIT OR Apache-2.0; no LICENSE file detected by GitHub |
| Activity | 113 stars; created mid 2026, last push 2026-07-25; 2 open issues | 67 stars; active (last push 2026-10-18); README says "not yet ready for general production use" |
| Releases | Only `artifacts-test-*` tags on wasm-rustc | Pre-release v2 |
| Bus factor | One maintainer; backend and linker written with AI tools on a rustc fork, not upstream | One maintainer; several self-maintained dependencies |

Embedding Weblings is small: `runner.js` (11 KB) + `worker.js` (16 KB) + two data files, with a ready-made API returning `{ ok, stdout, stderr, exit, diagnostics: [{ code, message, line, col, rendered }] }`. That maps directly onto our `CodeRunner` interface (`WasmCompilerRunner`). Estimated 2-4 days to vendor, adjust flags, wire the download UI and add a check. The harder, unbounded part is keeping it working: upgrading rustc means rebuilding a patched fork, which we cannot easily do ourselves.

Rubrc would need its whole VFS/terminal runtime (a SolidJS app with a shell), COOP/COEP, and much more memory. Not worth embedding.

Other options checked: [rubri](https://github.com/LyonSyonII/rubri) (Miri interpreter in the browser, MIT) is pinned to rustc 1.78-dev, so no edition 2024, and was last pushed 2025-11. A GitHub search for 2025-2026 rustc-in-wasm projects found nothing else usable (one zero-star patch repo).

## What would change the decision

Move to **go** (optional pack, off by default, Playground stays the default) when all of these hold:

1. A real mid-range Android phone (for example a 4 GB device on Chrome) loads the pack and compiles the 37-line program in under about 3 s without the tab being killed, and an iPhone on Safari does the same or fails cleanly. This is the main unknown; it takes about an hour with the demo URL and a USB-connected phone.
2. Running the corpus with overflow checks on shows no remaining differences apart from known backend gaps, and the `u16`/`i16` backend gap (issue #4) is fixed or rare in our content (5 content files mention `u16`/`i16` today).
3. Weblings (or wasm-rustc) publishes versioned releases, or we are willing to pin one build and accept that it never upgrades.

Move to **no-go** if the phone test fails on memory, or the project goes quiet with the backend gaps open. Rubrc would only be reconsidered if it moves to rustc 1.85+ and drops the memory footprint by several times.

# rust-verify

Verification of every Rust snippet in `content/` against a pinned `rustc` (see `rust-toolchain.toml`).
The driver lives in [`../content-build/verify.ts`](../content-build/verify.ts) and runs `rustc` from
inside this directory so rustup picks up the pinned toolchain.

- `cases/<hash>/main.rs`: generated sources (gitignored)
- `.cache/<hash>.json`: raw compile/run outcomes keyed by rustc version, edition, mode and source (gitignored)

Delete `.cache/` to force a full re-verification.

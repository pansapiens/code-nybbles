# Hello, Rust

## What Rust is

- Rust is **compiled**: the compiler, `rustc`, turns your `.rs` source files into a program before it runs.
- The compiler checks your code first, so many bugs (including memory bugs) are compile errors, not crashes.
- There's no garbage collector, so Rust programs are fast and use little memory.

| Command | What it does |
|---|---|
| `rustc main.rs` | compiles one file into a program |
| `cargo new hello` | creates a project: `Cargo.toml` (settings) and `src/main.rs` (code) |
| `cargo build` | compiles the project |
| `cargo run` | compiles the project, then runs it |

The Rust Playground (play.rust-lang.org) runs Rust in your browser, with nothing to install.

## Every program starts at `main`

```rust
fn main() {
    println!("Hello, world!");
}
```

- `fn` starts a function. `main` is the function Rust runs first, wherever it is in the file.
- The function body goes between `{` and `}`.
- Each statement ends with `;`.

## Printing with `println!`

```rust
fn main() {
    println!("Ready");
    println!();
    println!("Go!");
}
```

- `println!` prints the text in double quotes (without the quotes), then ends the line.
- `println!()` with nothing inside prints an empty line.
- Spaces inside the quotes are printed exactly.

## The `!` means macro

- `println!` is a **macro**, not a function. The `!` marks a macro call.
- Macros write code for you while the program compiles. That's how `println!` can take a different number of arguments each time.
- Leaving out the `!` (`println("Hi");`) is an error: Rust looks for a function called `println`.

## Comments

```rust
/// Doc comment: describes the item after it.
fn main() {
    // Line comment: runs to the end of the line.
    println!("Hi"); // can follow code too
    /* Block comment:
       can span lines. */
}
```

- The compiler ignores comments.
- `//` or `/*` inside quotes is ordinary text, not a comment.
- Block comments nest: `/* a /* b */ c */` is one comment.
- A `///` comment must come right before something to document.

## Reading a compiler error

```text
error: expected `;`, found `println`
 --> src/main.rs:2:22
  |
2 |     println!("Hello")
  |                      ^ help: add `;` here
```

- The first line says **what** is wrong; `-->` says **where** (file, line, column).
- `help:` lines often suggest a fix.
- The error can point **after** the real mistake. A missing `;` or closing `"` is often on the line above.
- The code in `error[E0765]` can be looked up with `rustc --explain E0765`.
- Fix the first error, then compile again; later errors are often caused by it.

Read more: Book §1.1-1.3 and §3.4 · Rust by Example "Hello World" · Rustlings `00_intro`

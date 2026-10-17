# Rust syllabus

The progressive curriculum for Code Nybbles. It goes from zero to confident intermediate Rust, then into specialist tracks. Structure: **Section → Unit → Level → Lessons** (see `01-product-and-architecture.md` §3.1).

Targets:
- Rust **stable, edition 2024** (stable since Rust 1.85). Pin the exact toolchain in `tools/rust-verify/rust-toolchain.toml`.
- No prior Rust needed. Prior programming is helpful but not required; Section 1 explains variables, types and functions from first principles, with optional "If you know Python/JS…" asides.
- Lesson length 3–5 minutes; a level is usually 3–5 lessons; a unit is 4–7 levels plus a Code Read, Practice, Chest and Checkpoint.

---

## 1. Source materials

Most of the free resources below are licensed MIT and/or Apache-2.0 (verify each before adapting). We **write original lessons** that follow their ordering and ideas, credit them in an in-app "Attributions" screen, and link each unit's guidebook to the matching chapter for deeper reading. See `01-product-and-architecture.md` §13 for our licences (content CC BY-SA 4.0, code MIT OR Apache-2.0) and the source compatibility table.

| Resource | Use in syllabus | Licence |
|---|---|---|
| [The Rust Programming Language ("the Book")](https://doc.rust-lang.org/book/) | Primary ordering backbone (chapters 1–21) | MIT / Apache-2.0 |
| [Brown University interactive Rust Book](https://rust-book.cs.brown.edu/) | Ownership "permissions" model, does-it-compile quizzes, memory diagrams | MIT / Apache-2.0 (verify) |
| [Rustlings](https://rustlings.rust-lang.org/) ([repo](https://github.com/rust-lang/rustlings)) | Exercise ideas per topic: fix-the-code, small tasks | MIT |
| [Rust by Example](https://doc.rust-lang.org/rust-by-example/) | Code-first examples for guidebooks and Code Reads | MIT / Apache-2.0 |
| [Comprehensive Rust (Google)](https://google.github.io/comprehensive-rust/) | Day-structured progression; concurrency/async/unsafe material; exercises (Fibonacci, Luhn, elevator events, …) | Apache-2.0 |
| [Rust Standard Library docs](https://doc.rust-lang.org/std/) | API accuracy for collections, iterators, traits | MIT / Apache-2.0 |
| [Compiler Error Index](https://doc.rust-lang.org/error_codes/error-index.html) | "Decode the error" exercises (E0382, E0499, E0502, E0308, E0106, E0277, …) | MIT / Apache-2.0 |
| [Tokio tutorial](https://tokio.rs/tokio/tutorial) | Async section | MIT |
| [Async Book](https://rust-lang.github.io/async-book/) | Async concepts | MIT / Apache-2.0 |
| [Exercism Rust track](https://exercism.org/tracks/rust) | Challenge problem ideas | MIT |
| [100 Exercises to Learn Rust (Luca Palmieri)](https://rust-exercises.com/) | Progressive exercise design reference, especially traits and the ticket-system theme | Check licence |
| [The Rustonomicon](https://doc.rust-lang.org/nomicon/) | Unsafe (advanced track only) | MIT / Apache-2.0 |
| [Learn Rust With Entirely Too Many Linked Lists](https://rust-unofficial.github.io/too-many-lists/) | Advanced smart-pointer Build project | MIT |
| [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/) / [Rust Design Patterns](https://rust-unofficial.github.io/patterns/) | Idioms section | MIT / MPL-2.0 (check) |

Recommended reading (linked in guidebooks, **not** adapted, since they are commercial): *Programming Rust* (Blandy, Orendorff & Tindall), *Rust in Action* (McNamara), *Rust for Rustaceans* (Gjengset), *Effective Rust* (Drysdale, [free online](https://effective-rust.com/)), *Zero to Production in Rust* (Palmieri), *Hands-on Rust* (Wolverson). Plus Jon Gjengset's "Crust of Rust" videos.

---

## 2. Pedagogical approach

1. **Spiral, interleaved.** Concepts come back in later levels in harder forms (for example `String` vs `&str` appears in Sections 1, 3, 5 and 9). Each level mixes about 70% new material with 30% review of earlier concepts.
2. **Read → predict → assemble → fix → write.** Within a unit, exercise difficulty climbs from recognising code, to predicting output, to building code from tokens, to fixing broken code, to (occasionally) writing it.
3. **Ownership early, but gently.** Ownership is introduced in Section 3, after basic types, functions and control flow, using the Brown "permissions" mental model (Read/Write/Own) plus box-and-arrow stack/heap diagrams.
4. **The compiler is the teacher.** From Section 1 onwards, learners see real compiler errors and learn to read them: error code, span, help text. "Decode the error" is a recurring exercise type.
5. **Delay the heavy machinery.** Lifetimes get their own section only after generics and traits. Async comes after threads.
6. **Small runnable programs.** Code Reads and Builds give a sense of making real things: a temperature converter, a guessing game, a word counter, `minigrep`, a to-do CLI, a multithreaded web server.
7. **Concept IDs.** Every lesson and exercise is tagged with concept IDs (listed per level below in `code` style) for spaced repetition and placement tests.

---

## 3. Course overview

| # | Section | Units | Book ch. | Rustlings | Stage |
|---|---|---|---|---|---|
| 1 | First Steps | 5 | 1, 3 | 00–01, 04 | Beginner (MVP) |
| 2 | Functions & Control Flow | 4 | 3, 2 | 02–03 | Beginner (MVP) |
| 3 | Ownership & Borrowing | 5 | 4 | 06 | Beginner (MVP) |
| 4 | Structs, Enums & Pattern Matching | 5 | 5, 6, 19 | 07–08, 12 | Beginner (MVP) |
| 5 | Collections & Strings | 4 | 8 | 05, 09, 11 | Beginner (MVP) |
| 6 | Error Handling | 3 | 9 | 13 | Intermediate |
| 7 | Packages, Modules, Cargo & Testing | 4 | 7, 11, 14 | 10, 17, 22 | Intermediate |
| 8 | Generics & Traits | 5 | 10, 18 | 14–15, 23 | Intermediate |
| 9 | Lifetimes | 3 | 10.3 | 16 | Intermediate |
| 10 | Closures & Iterators | 4 | 13 | 18 | Intermediate |
| 11 | Project: minigrep | 1 (Build-heavy) | 12 | — | Intermediate |
| 12 | Smart Pointers | 4 | 15 | 19 | Upper-intermediate |
| 13 | Fearless Concurrency | 4 | 16 | 20 | Upper-intermediate |
| 14 | Async Rust | 4 | 17 + Tokio | — | Upper-intermediate |
| 15 | Advanced Rust | 5 | 20 | 21 | Advanced |
| 16 | Idiomatic Rust & Capstone | 3 | 21 + guidelines | quizzes | Advanced |

**Estimated size:** ~63 units × ~5 levels × ~4 lessons ≈ **1,200 lessons**. MVP launch = Sections 1–5 (~23 units, ~400 lessons, ~4,000–5,000 exercises). Content is the long pole; see `03-content-format-and-exercises.md` for the production pipeline.

Specialist tracks (post-v1, optional branches off the main path): Rust → WebAssembly, CLI apps (clap), Web backends (Axum + SQLx), Embedded (`no_std`), Data structures & algorithms in Rust, Interview challenges.

---

## 4. Detailed syllabus

Notation per unit: **Levels** (each a node with 3–5 lessons), then the unit's **Code Read**, **Build** (where relevant) and **Checkpoint** focus. Concept IDs are in `code`.

### Section 1: First Steps

Goal: read and write tiny programs; understand values, variables and basic types; get comfortable with `println!` and compiler errors.

**Unit 1.1: Hello, Rust**
1. What Rust is and why it exists: compiled, safe, fast; `rustc` vs `cargo`; the playground (`intro.what-is-rust`)
2. Anatomy of `fn main() { }`, `println!("Hello, world!");`, semicolons, braces (`intro.main`, `macro.println-basic`)
3. The `!` means macro: `println!` vs functions (concept only) (`macro.bang`)
4. Comments: `//`, `/* */`, doc comments `///` (preview) (`syntax.comments`)
5. Reading your first compiler error: missing semicolon or quote (`compiler.read-error`)
- Code Read: "Ferris says hello" (a 6-line program with multiple `println!`s)
- Checkpoint: anatomy of a program, tracing printed output

**Unit 1.2: Variables & Mutability**
1. `let` bindings, naming conventions (`snake_case`) (`var.let`, `style.snake-case`)
2. Immutable by default; `mut`; error E0384 (`var.mut`, `err.E0384`)
3. Shadowing vs mutation (`var.shadowing`)
4. Constants (`const`, SCREAMING_CASE, required type) and `static` (preview) (`var.const`)
5. Formatting: `{}`, `{name}` inline args, `{:?}` (`fmt.placeholders`, `fmt.inline-args`)

**Unit 1.3: Scalar Types**
1. Integers: `i8`–`i128`, `u8`–`u128`, `isize`/`usize`; literals `1_000`, `0xff`, `0b1010` (`types.int`)
2. Type inference and annotations; `let x: u8 = 5;`; suffixes `5u8` (`types.inference`)
3. Floats `f32`/`f64`; arithmetic operators; integer division and `%` (`types.float`, `ops.arith`)
4. Overflow: debug panic vs release wrap; `wrapping_add`, `checked_add` (preview) (`types.overflow`)
5. `bool`, comparison and logical operators; `char` is 4-byte Unicode (`'🦀'`) (`types.bool`, `types.char`)
6. Casting with `as` and its pitfalls (`types.as-cast`)
- Code Read: "Temperature converter" (°C ↔ °F with floats and formatting)

**Unit 1.4: Compound Types**
1. Tuples: creating, indexing `t.0`, destructuring `let (a, b) = t;` (`types.tuple`)
2. The unit type `()` (`types.unit`)
3. Arrays `[i32; 5]`, `[0; 3]`, indexing, `.len()` (`types.array`)
4. Out-of-bounds: compile-time vs runtime panic (`types.array-bounds`, `panic.index`)
5. Debug-printing compound values `{:?}`, `{:#?}` (`fmt.debug`)

**Unit 1.5: Formatting & Output Deep-dive**
1. Width, alignment, padding `{:>8}`, `{:08.2}` (`fmt.width-precision`)
2. `print!`, `eprintln!`, `format!` (`macro.print-family`)
3. Escapes and raw strings `r"..."`, `r#"..."#` (`string.literals`)
4. String literals are `&str` (gentle intro; full detail in Section 3) (`string.str-literal-intro`)
- **Section 1 checkpoint** (also used by the placement test)

### Section 2: Functions & Control Flow

Goal: structure logic with functions, conditionals and loops; understand Rust's expression orientation.

**Unit 2.1: Functions**
1. Defining and calling `fn`; parameters require types (`fn.define`, `fn.params`)
2. Return types `-> i32`; implicit return of the last expression (`fn.return`)
3. Statements vs expressions; why a trailing `;` changes the value; E0308 mismatched types (`expr.vs-stmt`, `err.E0308`)
4. Blocks are expressions: `let y = { let x = 3; x + 1 };` (`expr.block`)
5. Early `return` (`fn.early-return`)
- Code Read: "Area calculator" (several small functions)

**Unit 2.2: Conditionals**
1. `if` / `else if` / `else`; conditions must be `bool` (no truthiness) (`ctrl.if`)
2. `if` as an expression; both arms must have the same type (`ctrl.if-expr`)
3. Introducing `match` on integers and ranges with `_` (preview of Section 4) (`match.intro`)

**Unit 2.3: Loops**
1. `loop` with `break`; `break` with a value (`ctrl.loop`, `ctrl.break-value`)
2. `while` (`ctrl.while`)
3. `for` over ranges `0..5`, `0..=5`, `.rev()`, and over arrays (`ctrl.for`, `range.basics`)
4. `continue`; loop labels `'outer:` (`ctrl.continue`, `ctrl.labels`)
5. Classic problems: FizzBuzz, sum of evens, Fibonacci (`practice.fizzbuzz`)
- Code Read: "Collatz sequence" (Comprehensive Rust style)

**Unit 2.4: Project: Guessing Game (Build)**
Adapted from Book chapter 2. A guided Build node across ~5 screens:
1. Reading input: `std::io::stdin().read_line(&mut guess)` (treated as a recipe at this stage) (`io.stdin`)
2. `String::new()`, `.trim()`, `.parse::<u32>()` and `.expect()` (preview of Result) (`string.parse-intro`)
3. Comparing with `std::cmp::Ordering` and `match` (`match.ordering`)
4. Looping until correct; handling bad input with `match` on `Ok`/`Err` (`ctrl.loop-input`)
5. Using a crate: `rand` (what `Cargo.toml` dependencies look like) (`cargo.dependency-intro`)
- **Section 2 checkpoint**

### Section 3: Ownership & Borrowing ⭐ (the heart of Rust)

Goal: an intuitive, accurate mental model of ownership, moves, borrowing and slices. Diagrams on every level.

**Unit 3.1: Memory Basics**
1. Stack vs heap (picture-based); why it matters (`mem.stack-heap`)
2. `String` vs string literal: growable heap data (`string.string-vs-literal`)
3. Scope and `drop`: values freed at the end of scope (`own.scope-drop`)
4. The three ownership rules (`own.rules`)

**Unit 3.2: Moves, Copies & Clones**
1. Move semantics: `let s2 = s1;` invalidates `s1`; E0382 use of moved value (`own.move`, `err.E0382`)
2. `Copy` types (integers, bool, char, tuples of Copy) vs non-Copy (`own.copy`)
3. `.clone()`: explicit deep copy and its cost (`own.clone`)
4. Ownership through function calls and returns (`own.fn-move`, `own.fn-return`)
5. "Does it compile?" marathon: mixed move/copy puzzles (`own.mixed`)
- Code Read: "Who owns the String?" (trace ownership through 4 functions with a step-through diagram)

**Unit 3.3: References & Borrowing**
1. `&T` immutable references; borrowing instead of moving (`borrow.shared`)
2. `&mut T`; mutable variable plus mutable reference (`borrow.mut`)
3. The rule: many `&` **or** one `&mut`; E0499, E0502 (`borrow.exclusive`, `err.E0499`, `err.E0502`)
4. Non-lexical lifetimes: a borrow ends at its last use (`borrow.nll`)
5. Dangling references prevented; E0106 preview (`borrow.dangling`, `err.E0106`)
6. Permissions model (R/W/O) from the Brown book: predicting what's allowed (`borrow.permissions`)

**Unit 3.4: Slices**
1. String slices `&s[0..5]`, `&str` as a borrowed view (`slice.str`)
2. `&str` parameters accept both `&String` and literals (deref coercion intro) (`slice.str-param`)
3. Array/Vec slices `&[i32]` (`slice.array`)
4. UTF-8 pitfalls: slicing on char boundaries (panic) (`slice.utf8`)
5. Exercise: `first_word` (Book chapter 4) (`practice.first-word`)

**Unit 3.5: Ownership in Practice**
1. Choosing between `T`, `&T` and `&mut T` for parameters (`own.param-choice`)
2. Common borrow-checker errors and fixes: clone vs restructure vs borrow (`borrow.fixes`)
3. Iterating with `for x in &v` vs `for x in v` (preview) (`own.iter-ref`)
- Code Read: "Swap and sum" (a mutable references program)
- **Section 3 checkpoint** (heavy on "decode the error")

### Section 4: Structs, Enums & Pattern Matching

**Unit 4.1: Structs**
1. Defining and instantiating; field init shorthand; struct update syntax `..other` (`struct.define`, `struct.update`)
2. Tuple structs and unit structs; the newtype idea (`struct.tuple`, `struct.unit`)
3. `#[derive(Debug)]`, `dbg!` (`derive.debug`, `macro.dbg`)
4. Ownership of struct fields (why `String` rather than `&str` for now) (`struct.ownership`)

**Unit 4.2: Methods & Associated Functions**
1. `impl` blocks; `&self`, `&mut self`, `self` (`method.self`)
2. Associated functions and `Self`; `new` convention (`method.associated`, `style.new`)
3. Multiple `impl` blocks; automatic referencing (`method.auto-ref`)
- Code Read: "Rectangle" (Book chapter 5)

**Unit 4.3: Enums & Option**
1. Defining enums; variants with data (tuple-like and struct-like) (`enum.define`, `enum.data`)
2. Methods on enums (`enum.impl`)
3. `Option<T>`: no null; `Some`/`None` (`option.basics`)
4. Why `Option<i32>` isn't `i32`: E0277/E0308 examples (`option.type-safety`)
5. Handy `Option` methods: `unwrap_or`, `map`, `is_some` (`option.methods`)

**Unit 4.4: `match` & Control-flow Patterns**
1. `match` with enums; exhaustiveness (E0004) (`match.enum`, `match.exhaustive`, `err.E0004`)
2. Binding values in patterns; `_` and `..` (`match.bind`)
3. `if let`, `while let`, `let … else` (`match.if-let`, `match.let-else`)
4. `matches!` macro (`macro.matches`)

**Unit 4.5: Patterns Deep-dive** (Book chapter 19)
1. Destructuring structs, tuples, nested enums (`pattern.destructure`)
2. Match guards `if`, `@` bindings, ranges, `|` alternatives (`pattern.guards`, `pattern.at`)
3. Refutable vs irrefutable patterns (`pattern.refutability`)
4. Patterns in function parameters and `for` loops (`pattern.params`)
- Code Read: "Traffic lights state machine"
- Build: "Coin sorter" (enum + match + Option)
- **Section 4 checkpoint**

### Section 5: Collections & Strings

**Unit 5.1: Vectors**
1. `Vec::new()`, `vec![]`, `push`, `pop`, `len` (`vec.basics`)
2. Indexing vs `.get()` (panic vs `Option`) (`vec.access`)
3. Iterating `&v`, `&mut v`, `v` (`vec.iter`)
4. Borrowing rules with vectors (push while holding a reference → E0502) (`vec.borrow`)
5. Storing multiple types via an enum (`vec.enum`)

**Unit 5.2: Strings in Depth**
1. Creating and appending: `push_str`, `push`, `+`, `format!` (`string.build`)
2. UTF-8: bytes vs chars vs graphemes; why there is no `s[0]` (`string.utf8`)
3. Iterating `.chars()`, `.bytes()`, `.split_whitespace()`, `.lines()` (`string.iter`)
4. Useful methods: `trim`, `to_uppercase`, `contains`, `replace`, `starts_with` (`string.methods`)
5. `String` ↔ `&str` conversions (`as_str`, `to_string`, `String::from`, `.to_owned()`) (`string.convert`)

**Unit 5.3: HashMap & Friends**
1. `HashMap::new`, `insert`, `get` → `Option<&V>` (`map.basics`)
2. Ownership of keys and values (`map.ownership`)
3. The entry API `entry().or_insert()`; word counting (`map.entry`)
4. Iterating maps (unordered!) (`map.iter`)
5. `HashSet`, `BTreeMap`, `VecDeque`: when to use which (`collections.choose`)
- Code Read: "Word frequency counter"

**Unit 5.4: Project: Inventory (Build)**
A small in-memory inventory/to-do model: struct + enum + Vec + HashMap + methods, assembled step by step (`practice.inventory`)
- **Section 5 checkpoint** (end of the MVP beginner course; award a "Rustacean Initiate" badge)

### Section 6: Error Handling

**Unit 6.1: Panics**
1. `panic!`, unrecoverable errors, backtraces (`RUST_BACKTRACE=1`) (`panic.basics`)
2. `unwrap` and `expect`: when they are acceptable (prototypes, invariants) (`result.unwrap`)

**Unit 6.2: `Result`**
1. `Result<T, E>`; matching `Ok`/`Err` (`result.basics`)
2. The `?` operator; functions returning `Result` (`result.question`)
3. `?` with `Option`; `main` returning `Result<(), Box<dyn Error>>` (`result.main`)
4. Combinators: `map`, `map_err`, `and_then`, `unwrap_or_else`, `ok_or` (`result.combinators`)

**Unit 6.3: Custom Errors**
1. Defining an error enum; implementing `Display` and `Error` (`error.custom`)
2. `From` conversions so `?` converts errors automatically (`error.from`)
3. `Box<dyn Error>` vs concrete errors; the `thiserror` and `anyhow` crates (overview) (`error.ecosystem`)
4. Guidelines: panic vs `Result` (Book 9.3) (`error.guidelines`)
- Code Read: "Config file parser"
- **Section 6 checkpoint**

### Section 7: Packages, Modules, Cargo & Testing

**Unit 7.1: Cargo**
1. `cargo new/build/run/check`; `Cargo.toml` and `Cargo.lock` (`cargo.basics`)
2. Dependencies, semver, features (`cargo.deps`)
3. Release profiles, `cargo doc`, `cargo fmt`, `cargo clippy` (`cargo.tools`)

**Unit 7.2: Modules & Visibility**
1. Packages vs crates (binary/library) (`mod.crates`)
2. `mod`, file layout (`mod.rs` vs `name.rs`) (`mod.files`)
3. Paths: `crate::`, `super::`, `self::`; `use`, `as`, re-exports `pub use` (`mod.paths`, `mod.use`)
4. `pub` on structs vs fields vs enums (`mod.visibility`)

**Unit 7.3: Testing**
1. `#[test]`, `assert!`, `assert_eq!`, `assert_ne!` (`test.basics`)
2. `#[should_panic]`, tests returning `Result` (`test.panic-result`)
3. `#[cfg(test)] mod tests`, `use super::*` (`test.module`)
4. Integration tests in `tests/`; doc tests (`test.integration`, `test.doc`)

**Unit 7.4: Documentation & Publishing**
1. Doc comments, examples as tests (`docs.comments`)
2. Workspaces (`cargo.workspaces`)
3. crates.io publishing overview (`cargo.publish`)
- **Section 7 checkpoint**

### Section 8: Generics & Traits

**Unit 8.1: Generics**
1. Generic functions `fn largest<T: PartialOrd>(…)` (`generic.fn`)
2. Generic structs and enums (`Point<T>`, `Option<T>`, `Result<T,E>` revisited) (`generic.types`)
3. Generic `impl` blocks and specialised impls (`generic.impl`)
4. Monomorphisation and zero-cost abstraction (`generic.mono`)

**Unit 8.2: Traits**
1. Defining and implementing traits (`trait.define`)
2. Default methods (`trait.default`)
3. Trait bounds, `where` clauses, `impl Trait` in arguments and returns (`trait.bounds`, `trait.impl-trait`)
4. Orphan rule (coherence) (`trait.orphan`)

**Unit 8.3: Standard Library Traits**
1. `Debug`, `Display` (`trait.display`)
2. `Clone`, `Copy`, `PartialEq`, `Eq`, `PartialOrd`, `Ord`, `Hash` (derive vs manual) (`trait.derive-std`)
3. `Default` (`trait.default-trait`)
4. `From`/`Into`, `TryFrom`/`TryInto`, `AsRef` (`trait.conversions`)
5. Operator overloading (`Add`, `Mul`, `Neg`, `Index`) (`trait.ops`)

**Unit 8.4: Trait Objects**
1. `dyn Trait`, `Box<dyn Trait>`, `&dyn Trait` (`trait.dyn`)
2. Static vs dynamic dispatch (`trait.dispatch`)
3. Object safety (dyn compatibility) (`trait.object-safety`)
4. The Book chapter 18 "OOP in Rust" state pattern (`trait.state-pattern`)

**Unit 8.5: Associated Items**
1. Associated types (`Iterator::Item`) vs generic parameters (`trait.assoc-type`)
2. Associated constants (`trait.assoc-const`)
3. Supertraits; fully qualified syntax (`trait.supertrait`, `trait.fq-syntax`)
- Code Read: "Shapes with trait objects"
- **Section 8 checkpoint**

### Section 9: Lifetimes

**Unit 9.1: Why Lifetimes**
1. Dangling references revisited; the borrow checker's view (`life.why`)
2. Lifetime annotations `'a` in functions (`longest`) (`life.fn`)
3. What annotations do (relate lifetimes) and don't do (change lifetimes) (`life.meaning`)

**Unit 9.2: Lifetimes in Practice**
1. Elision rules (the 3 rules) (`life.elision`)
2. Structs holding references (`struct Excerpt<'a>`) (`life.struct`)
3. Methods with lifetimes (`life.impl`)
4. `'static` and `T: 'static` misconceptions (`life.static`)

**Unit 9.3: Lifetimes + Generics**
1. Combining lifetimes, generics and trait bounds (`life.generic`)
2. Common errors (E0106, E0495-style, E0597 borrowed value does not live long enough) and fixes (`life.errors`, `err.E0597`)
3. When to just own the data (`life.own-instead`)
- **Section 9 checkpoint**

### Section 10: Closures & Iterators

**Unit 10.1: Closures**
1. Closure syntax and type inference (`closure.syntax`)
2. Capturing by reference, mutable reference, move (`closure.capture`)
3. `Fn`, `FnMut`, `FnOnce` (`closure.traits`)
4. `move` closures; returning closures (`impl Fn`, `Box<dyn Fn>`) (`closure.move`, `closure.return`)

**Unit 10.2: Iterators**
1. The `Iterator` trait and `next` (`iter.trait`)
2. `iter()`, `iter_mut()`, `into_iter()` (`iter.kinds`)
3. Consuming adaptors: `sum`, `count`, `collect`, `fold`, `min`/`max` (`iter.consume`)
4. Lazy adaptors: `map`, `filter`, `enumerate`, `zip`, `take`, `skip`, `chain`, `rev` (`iter.adapt`)

**Unit 10.3: Iterator Mastery**
1. `filter_map`, `flat_map`, `flatten`, `take_while`, `any`/`all`, `find`, `position` (`iter.advanced`)
2. `collect` into `Vec`, `HashMap`, `String`, `Result<Vec<_>, _>` (`iter.collect`)
3. Implementing `Iterator` for your own type (`iter.impl`)
4. Loops vs iterators: performance (zero-cost) and readability (`iter.perf`)

**Unit 10.4: Idiomatic Data Processing**
1. Rewriting loops as iterator chains (refactor exercises) (`iter.refactor`)
2. Sorting: `sort`, `sort_by`, `sort_by_key`, `sort_unstable` (`collections.sort`)
3. Practice: "top-N words", "group by", "parse CSV lines" (`practice.data-processing`)
- Code Read: "Log analyser"
- **Section 10 checkpoint**

### Section 11: Project: minigrep (Build-heavy section)

Book chapter 12, rebuilt as a series of Build nodes with Code Reads between them:
1. Reading command-line args (`std::env::args`) (`io.args`)
2. Reading files (`fs::read_to_string`) (`io.fs`)
3. Refactoring: `Config` struct, `run` function, `lib.rs` split (`project.refactor`)
4. Error handling with `Result` + `Box<dyn Error>` (`project.errors`)
5. TDD: writing the `search` function with tests (`project.tdd`)
6. Environment variables (case-insensitive flag), `eprintln!` (`io.env`)
7. Iterator rewrite (Book chapter 13.3) (`project.iter-refactor`)
- Section "certificate" screen: **Intermediate Rustacean**

### Section 12: Smart Pointers

**Unit 12.1: `Box<T>`**
1. Heap allocation; recursive types (cons list) (`box.basics`, `box.recursive`)
2. `Deref` and deref coercion (`deref.trait`)
3. `Drop` and `std::mem::drop` (`drop.trait`)

**Unit 12.2: `Rc<T>` & `Arc<T>` (intro)**
1. Shared ownership; `Rc::clone`, `strong_count` (`rc.basics`)
2. Immutable sharing only (`rc.immutable`)

**Unit 12.3: Interior Mutability**
1. `Cell`, `RefCell`, borrow rules at runtime (panics) (`refcell.basics`)
2. `Rc<RefCell<T>>` pattern (`refcell.rc-pattern`)
3. Reference cycles and `Weak<T>`; trees with parent pointers (`rc.weak`)

**Unit 12.4: More Pointers & Ownership Tools**
1. `Cow<'a, T>` (`cow.basics`)
2. `std::mem::take`, `replace`, `swap` (`mem.take-replace`)
3. Choosing the right pointer (decision chart) (`pointer.choose`)
- Build: "Linked list" (simplified, inspired by *Too Many Linked Lists*)
- **Section 12 checkpoint**

### Section 13: Fearless Concurrency

**Unit 13.1: Threads**
1. `thread::spawn`, `JoinHandle::join` (`thread.spawn`)
2. `move` closures with threads (`thread.move`)
3. Scoped threads `thread::scope` (`thread.scope`)

**Unit 13.2: Message Passing**
1. `mpsc::channel`, `send`/`recv`, multiple producers (`chan.mpsc`)
2. Iterating a receiver; dropping senders to close (`chan.close`)

**Unit 13.3: Shared State**
1. `Mutex<T>`, lock guards, poisoning (`sync.mutex`)
2. `Arc<T>` + `Mutex<T>` (`sync.arc-mutex`)
3. `RwLock`, atomics (`AtomicUsize`) overview (`sync.rwlock-atomic`)
4. Deadlocks and how to avoid them (`sync.deadlock`)

**Unit 13.4: `Send` & `Sync`**
1. What they mean; why `Rc` isn't `Send` (E0277) (`sync.send-sync`)
2. Data parallelism with `rayon` (overview) (`sync.rayon`)
- Code Read: "Dining philosophers" (Comprehensive Rust)
- **Section 13 checkpoint**

### Section 14: Async Rust

**Unit 14.1: Async Concepts**
1. Concurrency vs parallelism; why async (`async.why`)
2. Futures are lazy; `async fn`, `.await` (`async.basics`)
3. Runtimes: why Rust needs Tokio (or similar) (`async.runtime`)

**Unit 14.2: Tokio Basics**
1. `#[tokio::main]`, `tokio::spawn`, `JoinHandle` (`tokio.spawn`)
2. `join!`, `try_join!`, `select!` (`tokio.join-select`)
3. `tokio::time::sleep`, timeouts (`tokio.time`)

**Unit 14.3: Async Communication**
1. Async channels (`tokio::sync::mpsc`, `oneshot`, `broadcast`) (`tokio.channels`)
2. Shared state in async (`Arc<Mutex>`; holding guards across `.await`) (`tokio.shared-state`)
3. Streams (overview) (`async.streams`)

**Unit 14.4: Async Pitfalls**
1. Blocking in async; `spawn_blocking` (`async.blocking`)
2. `Send` bounds on futures (`async.send`)
3. `Pin` (conceptual only) (`async.pin`)
4. Async traits / `async fn` in traits (stable since 1.75) (`async.traits`)
- Build: "Async chat-room core" (simulated, without network I/O)
- **Section 14 checkpoint**

### Section 15: Advanced Rust

**Unit 15.1: Declarative Macros**
1. `macro_rules!` basics, fragment specifiers (`macro.rules`)
2. Repetition `$(...),*` (`macro.repetition`)
3. Procedural macros (derive/attribute/function-like) overview (`macro.proc-overview`)

**Unit 15.2: Unsafe Rust**
1. The five unsafe superpowers (`unsafe.superpowers`)
2. Raw pointers (`unsafe.raw-ptr`)
3. Safe abstractions over unsafe code (`split_at_mut`) (`unsafe.abstraction`)
4. FFI basics: `extern "C"` (`unsafe.ffi`)

**Unit 15.3: Advanced Traits & Types**
1. Newtype pattern, type aliases (`adv.newtype`, `adv.alias`)
2. The never type `!`, dynamically sized types, `?Sized` (`adv.never`, `adv.dst`)
3. `PhantomData`, marker traits (`adv.phantom`)
4. Blanket impls; GATs (overview) (`adv.blanket`, `adv.gat`)

**Unit 15.4: Advanced Functions & Closures**
1. Function pointers `fn` vs closures (`adv.fn-ptr`)
2. Returning closures; higher-order functions (`adv.hof`)

**Unit 15.5: Performance & Memory Layout**
1. Size/alignment, `size_of`, niche optimisation (`Option<Box<T>>`) (`perf.layout`)
2. Allocation awareness: `with_capacity`, avoiding clones (`perf.alloc`)
3. Benchmarking and profiling overview (`perf.bench`)
- **Section 15 checkpoint**

### Section 16: Idiomatic Rust & Capstone

**Unit 16.1: Idioms & Patterns**
1. Builder pattern (`idiom.builder`)
2. Typestate pattern (`idiom.typestate`)
3. RAII guards; newtypes for validation ("parse, don't validate") (`idiom.raii`, `idiom.parse-dont-validate`)
4. API guidelines: naming (`as_`/`to_`/`into_`), conversions, error types (`idiom.api-naming`)

**Unit 16.2: Tooling Mastery**
1. Clippy lints: reading and fixing (`tool.clippy`)
2. `rustfmt` conventions (`tool.fmt`)
3. Editions and `cargo fix` (`tool.editions`)

**Unit 16.3: Capstone: Multithreaded Web Server (Build)**
Book chapter 21: TCP listener, HTTP request parsing, thread pool, graceful shutdown. A multi-Build-node project with an optional "run it on your computer" guide.
- Final certificate: **Rustacean** 🦀

---

## 5. Recurring exercise themes by section

| Section | Signature exercise types (see `03` doc) |
|---|---|
| 1–2 | Predict output, fill-the-blank tokens, multiple choice, match pairs (type ↔ literal), Parsons |
| 3 | **Does it compile?**, decode the error (E0382/E0499/E0502/E0106), ownership diagram step-through, pick the fix |
| 4–5 | Assemble code from tokens, spot the bug, match pairs (pattern ↔ value), predict output |
| 6 | Pick the right return type, place the `?`, convert `unwrap` code to `?` |
| 7 | Arrange module trees, fix `use` paths, which test passes |
| 8–9 | Add the right trait bound, fill in lifetime annotations, which impl applies |
| 10 | Loop → iterator chain refactors, predict iterator output, laziness puzzles |
| 12–14 | Choose the right pointer/sync primitive, deadlock spotting, `Send`/`Sync` puzzles, async ordering puzzles |
| 15–16 | Macro expansion prediction, unsafe-soundness spotting, idiomatic-vs-not choices |

## 6. Placement test

- Adaptive: start at Section 2 difficulty; move up or down a section after each correct or incorrect cluster (3 questions per concept cluster)
- Item pool = the checkpoint questions of Sections 1–8
- Result: unlock the path up to (and including) the highest passed section checkpoint; mark skipped levels "completed via placement" (no XP, no achievements)
- Always retakeable from settings; any unit checkpoint can also be taken directly ("Jump here")

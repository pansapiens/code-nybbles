# Variables & Mutability

## `let` creates a variable

```rust
let score = 10;
let player_name = "Ferris";
println!("{player_name}: {score}");
```

- A variable exists from its `let` line onwards.
- Names are `snake_case`: lowercase words joined by `_`. They can't start with a digit or contain `-`.
- `playerName` compiles, but the compiler warns.

## Immutable by default, `mut` to change

```rust
let mut lives = 3;
lives = 2;    // replace the value
lives -= 1;   // same as lives = lives - 1
lives += 5;   // same as lives = lives + 5
```

- Without `mut`, assigning again is an error: *cannot assign twice to immutable variable*.
- `mut` goes on the `let`, once. Later changes don't repeat it.
- `mut` lets the value change, not its type. Assigning a different type is an error: *mismatched types*.

## Shadowing: a new variable with the same name

```rust
let spaces = "   ";
let spaces = spaces.len(); // now a number: 3
```

- Each `let` creates a new variable that hides the old one. No `mut` needed.
- The new variable can have a different type.
- A shadow made inside `{ }` ends at the `}`; the outer variable comes back unchanged.

| | `let x = x + 1;` | `x = x + 1;` |
|---|---|---|
| What it does | makes a new `x` | changes the existing `x` |
| Needs `mut`? | no | yes |
| Can change type? | yes | no |

## Constants

```rust
const MAX_LIVES: u32 = 3;
const SECONDS_PER_HOUR: u32 = 60 * 60;
```

- Names use `SCREAMING_SNAKE_CASE`. The type is required.
- Never `mut`, and the value must be known at compile time: numbers and other constants, not `let` variables (*attempt to use a non-constant value in a constant*).
- `static` looks similar but has one fixed place in memory. Use `const` unless you need that.

## Printing values

```rust
let name = "Ferris";
let lives = 3;
println!("{} has {} lives", name, lives); // placeholders, filled in order
println!("{name} has {lives} lives");     // inline names
println!("{name:?}");                     // Debug: "Ferris"
```

- The number of `{}` must match the number of values after the text.
- Inside the braces you can only put a name, not a calculation: write `println!("{}", lives + 1)`.
- `{:?}` is the Debug format. Text shows its quotes; numbers look the same.

Read more: Book §3.1 · Rust by Example · Rustlings `01_variables`

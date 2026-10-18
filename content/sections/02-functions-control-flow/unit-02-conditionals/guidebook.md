# Conditionals

## `if`, `else if`, `else`

```rust
let mark = 72;
if mark >= 80 {
    println!("A");
} else if mark >= 70 {
    println!("B");
} else {
    println!("C");
}
```

- No parentheses around the condition (they compile, with a warning). The `{ }` are always required.
- Rust checks conditions top to bottom and runs only the **first** true block. Separate `if`s are each checked on their own.
- `else` is optional and comes last. It's `else if`, never `elif`.
- Combine tests with `&&`, `||` and `!`. Chained comparisons like `0 < x < 10` don't compile: write `0 < x && x < 10`.

## Conditions must be `bool`

```rust
let lives = 3;
if lives > 0 {          // not `if lives`
    println!("Still alive");
}
```

- Rust has no "truthy" values: `if lives {` with a number is an error: *mismatched types*.
- `if score = 100` assigns rather than compares, so it's the same error. Compare with `==`.
- A function that returns `bool` can be the condition: `if is_even(steps) { ... }`.

## `if` is an expression

```rust
let score = 64;
let result = if score >= 50 { "pass" } else { "fail" };

fn larger(a: i32, b: i32) -> i32 {
    if a > b { a } else { b }   // returned
}
```

- Each block ends with an expression and no `;`. The `;` after the whole `let` is required.
- Both blocks must have the same type, or it's an error: *`if` and `else` have incompatible types*.
- A `;` inside a block makes its value `()`, which usually causes that error.
- An `if` without `else` has the value `()`. Using it as a number or text is an error: *`if` may be missing an `else` clause*.
- There's no `c ? a : b` in Rust; use `if c { a } else { b }`.

## A first look at `match`

```rust
let month = 4;
let season = match month {
    12 | 1 | 2 => "summer",
    3..=5 => "autumn",
    6..=8 => "winter",
    _ => "spring",
};
```

- Each arm is `pattern => value,`. Arms are checked top to bottom and the first match wins.
- `|` means "or". `3..=5` is 3, 4 and 5 (the end is included).
- `_` matches anything, so put it last. An arm after `_` can never run (the compiler warns).
- A `match` must cover every value, or it's an error: *non-exhaustive patterns*. For integers that usually means a `_` arm; a `bool` needs `true` and `false`.
- `match` is an expression: all arms must have the same type (or it's a *mismatched types* error), and an arm can be a `{ }` block.
- There's much more to `match` in Section 4.

Read more: Book §3.5 · Rust by Example: if/else, match · Rustlings `03_if`

# Scalar Types

A scalar type holds a single value. Rust has four kinds: integers, floats, `bool` and `char`.

## Integers

```rust
let temperature: i32 = -5;
let lives: u8 = 3;
println!("{} {}", u8::MAX, i8::MIN); // 255 -128
```

- `i` types are signed (can be negative), `u` types are unsigned (0 and up).
- Sizes: `8`, `16`, `32`, `64`, `128` bits, plus `isize`/`usize`, which match the computer (64 bits on most). `usize` is used for counts and lengths.
- `u8` holds 0 to 255, `i8` holds -128 to 127. A number that doesn't fit is a compile error: `literal out of range`.
- Ways to write numbers: `1_000_000` (underscores ignored), `0xff` (hex, 255), `0o17` (octal, 15), `0b1010` (binary, 10). They all print in decimal.

## Type inference

```rust
let score = 10;       // i32 (default)
let ratio = 2.5;      // f64 (default)
let gems: u8 = 3;     // annotation
let coins = 3u8;      // suffix, also 3_u8
```

- Rust also infers from later use: `let n = 5; let small: u8 = n;` makes `n` a `u8`.
- Rust never converts between number types by itself. A `u8` can't go where an `i32` is needed: error **E0308** (mismatched types).

## Floats and arithmetic

```rust
println!("{}", 7 / 2);      // 3   integer division drops the fraction
println!("{}", 7 % 2);      // 1   remainder
println!("{}", 7.0 / 2.0);  // 3.5
println!("{}", -7 / 2);     // -3  towards zero
```

- `f64` is the default float, `f32` is smaller and less precise. Float literals need a decimal point: `5.0`.
- `*` and `/` happen before `+` and `-`; operators of the same level run left to right.
- Both sides of an operator must be the same type. `2 + 1.5` is error **E0277**.
- `{}` prints a whole float without `.0` (`5`); `{:?}` shows it (`5.0`).
- Floats are approximations: `0.1 + 0.2` prints `0.30000000000000004`.

## Overflow

```rust
let gold: u8 = 250;
println!("{}", gold.wrapping_add(10));   // 4
println!("{:?}", gold.checked_add(10));  // None
println!("{:?}", gold.checked_add(5));   // Some(255)
```

- Going past a type's limit is overflow. `cargo run` (debug build) panics: `attempt to add with overflow`.
- `cargo run --release` skips the check and wraps: 255 + 1 becomes 0.
- If the compiler can see the overflow (a literal that's too big, or `255 + 1` written straight into a `u8`), it's a compile error.
- `wrapping_add` always wraps; `checked_add` gives `Some(value)` or `None`. There are `_sub` versions too.

## bool and char

```rust
let age = 20;
let is_adult = age >= 18;           // true
let raining = true;
println!("{}", raining && !is_adult); // false

let grade = 'A';
let crab = '🦀';
```

- Comparisons: `==`, `!=`, `<`, `>`, `<=`, `>=`. They give a `bool`.
- Logic: `&&` (and), `||` (or), `!` (not). `&&` is worked out before `||`.
- A `bool` prints as `true` or `false`, and `1` is not a `bool`.
- A `char` is one Unicode character in single quotes and always takes 4 bytes. `"A"` in double quotes is text, not a `char`.

## Casting with `as`

```rust
let count = 7;
println!("{}", count as f64 / 2.0); // 3.5
println!("{}", 2.9 as i32);         // 2   fraction dropped, no rounding
println!("{}", 300.0 as u8);        // 255 floats stick at the limit
let big: i32 = 300;
println!("{}", big as u8);          // 44  integers keep the low bits
println!("{}", 'A' as u8);          // 65
println!("{}", 66u8 as char);       // B
```

- `as` never fails or panics, so it can quietly change a value. Check that it fits first.
- Cast before you divide: `(7 / 2) as f64` is already `3.0`.
- `as` binds tighter than `+`: `max as u16 + 1` converts first, then adds.
- Only `u8` can be cast to `char` (error **E0604** otherwise). `true as i32` is 1.

Read more: Book §3.2 · Rust by Example (Primitives, Casting) · Rustlings `04_primitive_types`

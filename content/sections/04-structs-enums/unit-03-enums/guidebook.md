# Enums & Option

## An enum is "one of these"

```rust
#[derive(Debug)]
enum Direction {
    North,
    East,
    South,
    West,
}

let heading = Direction::North;
println!("{heading:?}"); // North
```

- Each choice is a **variant**. A value is exactly one variant at a time.
- Name variants through the enum: `Direction::North`. `North` on its own is E0425; a variant that doesn't exist is E0599.
- Enum and variant names use `CamelCase`.
- An enum is a type: use it for parameters, return types and struct fields.
- `{:?}` needs `#[derive(Debug)]` (E0277 without it). It prints the variant name only.
- Your enums move like a `String` does (E0382 if you use the old variable), even when the variants hold no data.

## Variants with data

```rust
#[derive(Debug)]
enum Command {
    Quit,                    // no data
    Move(i32, i32),          // tuple-like
    Write { text: String },  // struct-like
}

let step = Command::Move(3, -1);
let note = Command::Write { text: String::from("hi") };
println!("{step:?} {note:?}"); // Move(3, -1) Write { text: "hi" }
```

- Each variant holds its own kind of data, but all values have the same type, `Command`.
- Tuple-like variants use `( )` and need every value (E0061 if the count is wrong).
- Struct-like variants use `{ field: value }` (E0533 if you use round brackets; E0063 if a field is missing).
- Putting a `String` into a variant moves it, as with a struct field.

## Methods on enums

```rust
#[derive(Debug)]
enum Light { Red, Amber, Green }

impl Light {
    fn wait(&self) -> u32 {
        match self {
            Light::Red => 30,
            Light::Amber => 5,
            Light::Green => 0,
        }
    }

    fn advance(&mut self) {
        *self = match self {
            Self::Red => Self::Green,
            Self::Green => Self::Amber,
            Self::Amber => Self::Red,
        };
    }
}
```

- `match self` picks the arm for the variant the method was called on. Every arm must give the same type.
- Inside `impl`, `Self` means the enum: `Self::Red` is `Light::Red`.
- An arm can name a variant's data: `Rug::Rect(w, h) => w * h`. Unit 4.4 covers this in full.
- A method without `self` (like `fn start() -> Self`) is an associated function, called as `Light::start()`.

## `Option<T>`: maybe a value

```rust
let age: Option<u32> = Some(30);
let middle_name: Option<&str> = None;

fn div(a: i32, b: i32) -> Option<i32> {
    if b == 0 { None } else { Some(a / b) }
}
```

- Rust has no `null`. A value that might be missing has the type `Option<T>`: `Some(value)` or `None`.
- `Option`, `Some` and `None` are always in scope.
- `let x = None;` with nothing else to go on is E0282: write the type, `Option<i32>`.
- An `Option<i32>` isn't an `i32`: `let n: i32 = Some(1);` is E0308, `1 + opt` is E0277, `opt + 1` is E0369, and `{}` can't print it (use `{:?}`).
- `checked_add` and `checked_sub` return `None` instead of overflowing.

## Handy `Option` methods

| Method | On `Some(4)` | On `None` | Result type |
|---|---|---|---|
| `unwrap_or(0)` | `4` | `0` | `T` |
| `is_some()` | `true` | `false` | `bool` |
| `is_none()` | `false` | `true` | `bool` |
| `map(\|n\| n * 2)` | `Some(8)` | `None` | `Option<_>` |
| `unwrap()` | `4` | panics | `T` |

```rust
let price: Option<u32> = Some(5);
let total = price.map(|p| p * 2).unwrap_or(0); // 10
```

- `|p| p * 2` is a closure, a small unnamed function. Section 10 explains them.
- `unwrap` panics with `called Option::unwrap() on a None value`. Use it only when `None` would be a bug; prefer `unwrap_or` when a missing value is normal.
- `map` and `unwrap_or` take the `Option` by value, so an `Option<String>` moves.

Read more: Book §6.1 · Rust by Example: Enums, Option · Rustlings `08_enums`

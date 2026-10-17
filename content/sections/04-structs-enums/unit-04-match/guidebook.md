# match & Control Flow

## `match` on an enum

```rust
enum Light { Red, Amber, Green }

fn seconds(light: Light) -> u32 {
    match light {
        Light::Red => 30,
        Light::Amber => 4,
        Light::Green => 25,
    }
}

fn main() {
    println!("{}", seconds(Light::Amber)); // 4
}
```

- Each arm is `pattern => code,`. Arms are checked top to bottom, and only the first match runs.
- Name variants in full: `Light::Red`. A bare `Red` is a new variable that matches anything (error E0170).
- `match` is an expression: it can be returned or stored with `let`. All arms must give the same type (E0308).

## Every value needs an arm

- A `match` must be **exhaustive**: every possible value is covered. Miss a variant and you get **E0004**, which names what's missing.
- `_` matches anything, so put it last to cover the rest. Arms after `_` can never run (a warning).
- Listing every variant means that adding a new variant later gives you E0004 wherever it needs handling. A `_` arm hides that.
- The same rule applies to numbers and `bool`: `0..=100` on a `u8` leaves 101 to 255 uncovered.

## Binding data in patterns

```rust
enum Shape {
    Square(u32),
    Rect(u32, u32),
    Circle { r: u32 },
}

fn main() {
    let shape = Shape::Rect(3, 4);
    let area = match shape {
        Shape::Square(side) => side * side,
        Shape::Rect(w, h) => w * h,
        Shape::Circle { r } => 3 * r * r,
    };
    println!("{area}"); // 12
}
```

- A name in a pattern creates a new variable for that arm. It doesn't compare with any variable outside.
- `Some(n)` binds the value; `Some(0)` matches only that value; `None` has nothing to bind.
- `_` ignores one value; `..` ignores the rest: `Rgb(r, ..)`, `Move { x, .. }`. Only one `..` per pattern.
- Braces patterns use the field names and must mention every field or end with `..` (E0027). Tuple patterns need one entry per value (E0023).
- Binding a `String` moves it out of the value, so using the value afterwards is E0382. Match on `&value` to borrow instead.

## `if let`, `while let`, `let ... else`

```rust
fn label(age: Option<u32>) -> u32 {
    let Some(years) = age else {
        return 0;
    };
    years
}

fn main() {
    let bonus: Option<u32> = Some(5);
    if let Some(points) = bonus {
        println!("bonus {points}");
    } else {
        println!("no bonus");
    }

    let mut hp: u32 = 10;
    while let Some(n) = hp.checked_sub(4) {
        hp = n; // 6, then 2
    }
    println!("{hp} {}", label(None)); // 2 0
}
```

| Form | Use it when |
|---|---|
| `match` | every case needs its own code |
| `if let` (+ `else`) | you care about one pattern |
| `while let` | loop until the pattern stops matching |
| `let ... else` | bind a value or leave early |
| `matches!` | you only need `true` or `false` |

- `if let` uses a single `=` and isn't checked for exhaustiveness. Its variables exist only inside its block.
- `let ... else` keeps its variables for the rest of the block. The `else` must leave with `return`, `break` or `continue` (E0308 otherwise).
- A plain `let Some(n) = x;` is E0005, because `x` could be `None`.

## `matches!`

```rust
enum Dir { North, East, South, West }

fn main() {
    let dir = Dir::South;
    let vertical = matches!(dir, Dir::North | Dir::South);
    println!("{vertical}"); // true
}
```

- `matches!(value, pattern)` gives a `bool`. Join options with `|` (not `||`); ranges and `_` work too.
- It doesn't need to be exhaustive, and its bindings can't be used outside it.
- Your own enums don't support `==` yet (E0369), so `matches!` is how you test for a variant.

Read more: Book §6.2-6.3 · Rust by Example (match, if let, while let, let-else) · Rustlings `08_enums`

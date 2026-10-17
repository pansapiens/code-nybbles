# Patterns Deep-dive

## Destructuring

```rust
struct Point { x: i32, y: i32 }

let p = Point { x: 3, y: 7 };
let Point { x, y } = p;            // x = 3, y = 7
let Point { y: height, .. } = p;   // rename a field, skip the rest
let (w, (km, mins)) = (1, (42, 12)); // tuples match by position
let [first, _, third] = [1, 2, 3];   // so do arrays
```

- Struct patterns match fields **by name**, in any order. `field: name` stores the field under a new name.
- A struct pattern must mention every field, or end with `..` (otherwise **E0027**). A field name that doesn't exist is **E0026**.
- Tuple structs use brackets: `let Metres(m) = height;`. Braces on a tuple struct are **E0769**.
- `..` skips several items, once per tuple: `let (first, .., last) = t;`. A tuple pattern of the wrong size is **E0308**.
- Destructuring moves non-`Copy` fields such as `String` out of the value. `Copy` fields can still be read afterwards.
- Patterns nest: `Pen::Fill(Tint::Rgb(r, g, b))`, `Point { x: 0, y }` (a literal tests the field).

## Guards, `|`, ranges and `@`

```rust
let level = Some(42);
let text = match level {
    Some(0) => "zero",
    Some(1 | 2) => "tiny",                // or-pattern
    Some(n) if n % 2 == 0 => "even",      // match guard
    Some(n @ 3..=99) => "odd, below 100", // @ binding
    Some(_) => "big",
    None => "none",
};
```

- A **guard** (`if` after the pattern) must also be true for the arm to run. If it's false, Rust tries the next arm.
- Guards can use any variable in scope. `4 | 5 | 6 if flag` applies the guard to all three.
- The exhaustiveness check ignores guards, so `n if n > 0` and `n if n <= 0` together are still **E0004**. End with `_` or a plain name.
- Ranges `1..=9` and `'a'..='z'` include both ends. A range on its own doesn't bind the value.
- `n @ pattern` tests the value and binds it. Group alternatives with brackets: `n @ (1 | 2)`. `n @ 1 | 2` means `(n @ 1) | 2`: **E0408**.
- Every side of a `|` must bind the same names (**E0408** otherwise).
- Arms are tried top to bottom, so put the most specific ones first.

## Refutable and irrefutable patterns

| Irrefutable (always matches) | Refutable (can fail) |
|---|---|
| `x`, `_`, `(a, b)`, `Point { x, .. }`, `Metres(m)` | `Some(n)`, `None`, `(0, y)`, `1..=9`, `Shape::Circle(r)` |

- `let`, `for` loops and function parameters need irrefutable patterns. A refutable one is **E0005**.
- The compiler checks the type, not the value: `let Some(n) = Some(5);` is still E0005.
- To handle failure, use `if let` (skip the block), `while let` (stop the loop), `let ... else` (the `else` must leave with `return`, `break` or `continue`) or `match`.
- `if let x = 5` compiles with a warning, since it can't fail.

```rust
fn show(fuel: Option<u32>) {
    let Some(litres) = fuel else {
        println!("empty");
        return;
    };
    println!("{litres} L"); // litres is usable from here on
}
```

## Patterns in parameters and `for` loops

```rust
fn gap((from, to): (i32, i32)) -> i32 { to - from }
fn show(&(x, y): &(i32, i32)) { println!("{x} {y}"); } // x, y: i32
fn mid(&[_, m, _]: &[u32; 3]) -> u32 { m }

let team = ["Ana", "Ben"];
for (i, name) in team.iter().enumerate() {
    println!("{i}: {name}"); // positions start at 0
}
```

- The pattern goes before the `:`, the type after. It's still one parameter: call `gap((10, 25))`.
- A `&` in the pattern matches a `&` in the type and copies a `Copy` value out. A `&` in the pattern without one in the type is E0308.
- `_: i32` accepts an argument and ignores it.
- A struct pattern in a parameter still takes ownership of the argument.

Read more: [Book §19](https://doc.rust-lang.org/book/ch19-00-patterns.html) · Rust by Example: match (destructuring, guards, binding) · Rustlings has no patterns folder; `08_enums` practises `match`

# Compound Types

## Tuples: a few values of any types

```rust
let order = ("tea", 2, 4.5);         // mixed types
println!("{} x{}", order.0, order.1); // tea x2

let (item, count, price) = order;    // destructuring
println!("{item} {count} {price}");
```

- Positions start at 0: `.0`, `.1`, `.2`. A position that doesn't exist is a compile error (**E0609**).
- Tuples use a dot, never square brackets (`t[0]` is **E0608**).
- The pattern in `let (a, b) = t;` needs one name per element, in order. A wrong count is **E0308**.
- With `let mut`, you can change an element: `score.0 += 1;`. The types and length stay the same.
- A one-element tuple needs a comma: `(5,)`. Plain `(5)` is the number 5.

## The unit type `()`

```rust
let result = println!("Saved"); // prints Saved
println!("{result:?}");         // ()
```

- `()` is the empty tuple. Its type is also written `()`.
- It means "no useful value". `println!` gives back `()`, so `let n: i32 = println!("5");` is **E0308**.
- `{}` can't print `()`, but `{:?}` can.

## Arrays: a fixed number of one type

```rust
let primes: [i32; 5] = [2, 3, 5, 7, 11];
let zeros = [0; 3];        // [0, 0, 0]
let mut board = [0; 4];
board[2] = 9;              // needs mut
println!("{}", primes.len()); // 5
```

- `[T; N]` is N values of type T. The length is part of the type.
- `[value; count]` repeats a value.
- Every element must have the same type: `[1, true]` and `[21.5, 19]` are **E0308**.
- The size never changes. Arrays have no `push`.
- Indexes start at 0 and have the type `usize`.

## Out of bounds

```rust
let scores = [90, 72, 85];
// scores[3]: compile error, the compiler can see 3 is too big

let index = std::env::args().count() + 2; // 3 at run time
println!("{}", scores[index]);            // panics
```

- Valid indexes are `0` to `len() - 1`. `a[a.len()]` is always out of bounds.
- An index the compiler can work out is checked at compile time ("this operation will panic at runtime").
- Otherwise Rust checks while the program runs and **panics**: the program stops with a message.

```text
thread 'main' (2817) panicked at src/main.rs:4:20:
index out of bounds: the len is 3 but the index is 3
```

- The location is file, line and column. The message gives the length and the index you used.
- Rust never reads past the end of an array.

## Debug printing

```rust
let point = (3, 4);
println!("{point:?}");   // (3, 4)
println!("{:?}", [1, 2]); // [1, 2]
println!("{point:#?}");  // pretty: one element per line
```

| Format | Name | Tuples and arrays? |
|---|---|---|
| `{}` | Display, for people | no (**E0277**) |
| `{:?}` | Debug, one line | yes |
| `{:#?}` | Debug, pretty | yes |

- Single elements like `point.0` are numbers or text, so `{}` works for them.
- Debug format keeps quotes on text: `("Ferris", 3)`.

Read more: Book §3.2 Compound Types · Rust by Example: Tuples, Arrays and Slices · Rustlings `04_primitive_types`

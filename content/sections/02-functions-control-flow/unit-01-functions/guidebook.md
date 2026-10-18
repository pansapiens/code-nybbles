# Functions

## Defining and calling

```rust
fn main() {
    say_hello();
}

fn say_hello() {
    println!("Hello!");
}
```

- `fn`, a name, `()`, then the body in `{ }`. Call it with `say_hello();`.
- Order in the file doesn't matter: `main` can call a function defined below it.
- Function names are `snake_case`, like variables.

## Parameters

```rust
fn print_size(value: i32, unit: char) {
    println!("{value}{unit}");
}
// call: print_size(5, 'h');
```

- Every parameter needs a type: `value: i32`. Leaving it out is a syntax error.
- Arguments are matched to parameters by position, not by name.
- The wrong number of arguments is an error.
- A function can't see the caller's `let` variables (*cannot find value in this scope*). Pass them in as arguments. Top-level `const`s are visible everywhere.

## Return values

```rust
fn add(a: i32, b: i32) -> i32 {
    a + b
}
```

- `-> i32` after the `()` is the return type.
- The last expression, with **no** `;`, is the value returned (the tail expression).
- No `->` means the function returns `()`, the unit type.
- Return a tuple to give back more than one value: `-> (i32, i32)`.

## Statements and expressions

| | Example | Has a value? |
|---|---|---|
| Statement | `let x = 6;` | no |
| Expression | `6`, `x + 1`, `add(2, 3)` | yes |
| Expression + `;` | `x + 1;` | no, the value is thrown away |

- `let a = (let b = 6);` doesn't compile: `let` has no value.
- A tail with a `;` makes the body produce `()`, which is an error, *mismatched types*:

```rust,compile_fail,E0308
fn plus_one(x: i32) -> i32 {
    x + 1; // help: remove this semicolon to return this value
}
```

- *Mismatched types* means "expected one type, found another". It also appears for arguments of the wrong type, such as `7.5` for an `i32`.

## Blocks are expressions

```rust
let y = {
    let x = 3;
    x + 1 // the block's value
};        // this `;` ends the `let`
```

- A block's value is its last expression. If the last line ends in `;`, the value is `()`.
- Variables created inside a block are gone after the `}`.
- A function body is a block, which is why the tail is the return value.

## Early `return`

```rust
fn get_speed() -> i32 {
    println!("checking");
    return 50;
    // anything here never runs (unreachable warning)
}
```

- `return value;` leaves the function at once, from anywhere in the body, even inside a nested block.
- `return;` with no value works in functions that return `()`. In a function with a return type it's an error.
- At the end of a function, prefer the tail `x` over `return x;`. `return` is for leaving early, which you'll use with `if` in the next unit.

Read more: Book §3.3 · Rust by Example: Functions · Rustlings `02_functions`

# Loops

## `loop` repeats until `break`

```rust
let mut count = 0;
loop {
    count += 1;
    if count == 3 {
        break;
    }
}
```

- `loop` never stops on its own. `break` ends it, and the program carries on after the closing `}`.
- Code after `break` in the same block never runs.
- `break` outside a loop is error **E0268**.

## `break` with a value

```rust
let mut n = 1;
let first = loop {
    n = n * 3;
    if n > 20 {
        break n; // first is 27
    }
};
```

- The value after `break` becomes the value of the whole `loop`. Don't forget the `;` that ends the `let`.
- Every `break` in one loop must give the same type (**E0308** otherwise). A plain `break;` gives `()`.
- Only `loop` can `break` with a value. In `while` or `for` it's error **E0571**.

## `while` checks before each pass

```rust
let mut fuel = 3;
while fuel > 0 {
    println!("Fuel: {fuel}");
    fuel -= 1;
}
```

- The condition must be a `bool`: `while lives` with a number is **E0308**. Write `while lives > 0`.
- If the condition is false the first time, the body never runs.
- Make sure the body moves towards the end, or the loop never finishes.

## `for` and ranges

```rust
for i in 0..3 { }          // 0, 1, 2
for i in 1..=3 { }         // 1, 2, 3
for i in (1..4).rev() { }  // 3, 2, 1
for score in [70, 85, 90] { }
for _ in 0..5 { }          // repeat 5 times
```

- `a..b` stops before `b`; `a..=b` includes `b`. A range whose start is past its end, like `5..2`, is empty.
- `.rev()` needs brackets: `(1..4).rev()`.
- The loop variable is new each pass, immutable, and gone after the loop.
- `for i in 0..arr.len()` gives every index. Indexes are `usize`.
- A plain number isn't something you can loop over (**E0277**); use a range.

## `continue` and labels

```rust
'outer: for a in 1..=3 {
    for b in 1..=3 {
        if b == a {
            continue;        // next b
        }
        if a + b == 5 {
            break 'outer;    // leave both loops
        }
        println!("{a}{b}");
    }
}
```

- `continue` skips the rest of this pass. In a `while`, change the counter before any `continue`, or the loop gets stuck.
- `break` and `continue` act on the innermost loop. A label (`'name:` before any loop) lets you pick an outer one.
- A label without its `'` is a syntax error. Using a label that doesn't exist is **E0426**.

## Classic patterns

| Task | Pattern |
|---|---|
| Divides by 3? | `n % 3 == 0` |
| Total of some numbers | `if` inside a `for`, then `total += n` |
| Last digit / drop it | `n % 10` / `n / 10` |
| Count digits | `while n > 0 { n = n / 10; digits += 1; }` |
| Fibonacci | `let next = a + b; a = b; b = next;` |

- In FizzBuzz, check `% 15` before `% 3` and `% 5`: an `else if` chain stops at the first true branch.
- Use `for` when you know what to step through, `while` when you only know when to stop, and `loop` when the stop is in the middle or you need a value.

Read more: Book §3.5 · Rust by Example: Flow of Control (`loop`, `while`, `for` and range)

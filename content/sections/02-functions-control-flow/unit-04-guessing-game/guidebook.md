# Project: Guessing Game

The program picks a secret number, and you guess until you get it right. Here it is finished, with the secret fixed at `42` (step 5 shows the random version):

```rust,no_run
use std::cmp::Ordering;
use std::io;

fn main() {
    println!("Guess the number!");
    let secret = 42;

    loop {
        println!("Input your guess.");

        let mut guess = String::new();
        io::stdin()
            .read_line(&mut guess)
            .expect("Failed to read");

        let guess: u32 =
            match guess.trim().parse() {
                Ok(num) => num,
                Err(_) => continue,
            };

        println!("You guessed {guess}");

        match guess.cmp(&secret) {
            Ordering::Less => {
                println!("Too small!");
            }
            Ordering::Greater => {
                println!("Too big!");
            }
            Ordering::Equal => {
                println!("You win!");
                break;
            }
        }
    }
}
```

Several pieces here (`String`, `&mut`, `expect`, `Ok`/`Err`) are recipes for now. Section 3 explains `String` and `&mut`, and Section 6 explains `Result` (`Ok`/`Err`) and `expect`.

## 1. Read a line

```rust,no_run
use std::io;

fn main() {
    let mut guess = String::new();
    io::stdin()
        .read_line(&mut guess)
        .expect("Failed to read");
    println!("You guessed {guess}");
}
```

- `String::new()` makes an empty `String`, text that can grow. It needs `mut` because `read_line` changes it.
- `read_line` adds the typed line to the end of `guess`, **including the newline** from Enter. Typing `50` gives `"50\n"`.
- `.expect("...")` stops the program with that message if reading fails.

## 2. Turn the text into a number

```rust
let guess = "50\n";
let guess: u32 = guess
    .trim()
    .parse()
    .expect("Type a number!");
println!("{}", guess + 1); // 51
```

- `trim` removes spaces and newlines from both ends. Without it, `parse` fails on the `\n`.
- `parse` can make many types, so the `: u32` annotation says which one. Leaving it out is a "type annotations needed" error.
- The new `guess` shadows the text one (Unit 1.2).
- With `expect`, input such as `abc` makes the program panic with `Type a number!`.

## 3. Compare with `Ordering`

```rust
use std::cmp::Ordering;

let secret = 42;
let guess = 50;
let msg = match guess.cmp(&secret) {
    Ordering::Less => "Too small!",
    Ordering::Greater => "Too big!",
    Ordering::Equal => "You win!",
};
println!("{msg}"); // Too big!
```

- `a.cmp(&b)` compares `a` with `b` and gives `Less`, `Greater` or `Equal`.
- The three arms cover every `Ordering`, so no `_` arm is needed.
- Comparing a `String` with a number is **E0308**: mismatched types. Parse first.

## 4. Loop, and skip bad input

```rust
for text in ["7", "seven", "12"] {
    let n: u32 = match text.parse() {
        Ok(num) => num,
        Err(_) => continue,
    };
    println!("{n}"); // 7, then 12
}
```

- `parse` gives back `Ok(number)` or `Err(problem)`. Matching on it replaces `expect`, so bad input no longer crashes the game.
- `continue` skips to the next pass of the loop, which asks again. `break` in the `Equal` arm ends the game.
- `break` in the `Err` arm would be a bug: a typo would end the game.

## 5. A random secret with a crate

A **crate** is a package of Rust code, usually published on [crates.io](https://crates.io). List it in `Cargo.toml`:

```toml
[dependencies]
rand = "0.10.1"
```

Then in `src/main.rs`:

```rust,ignore
// Needs rand, so it isn't checked.
use rand::prelude::*;

let secret = rand::rng()
    .random_range(1..=100);
```

- `use rand::prelude::*;` brings in the traits the generator methods need, and `rand::rng()` gives a generator seeded by the operating system.
- The next `cargo run` downloads and compiles `rand`, then reuses it on later runs.
- `1..=100` includes both 1 and 100.
- The fixed `42` makes the output the same on every run, which is why the steps used it for testing.

Read more: Book §2 · Rust by Example: Std library types, Crates · Rustlings has no folder for this chapter

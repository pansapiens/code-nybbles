# Formatting & Output

## Width, alignment and precision

Formatting options go after a `:` inside the braces, in this order: fill character, alignment, `0`, width, `.` precision.

```rust
let price = 4.5;
println!("[{:<6}]", "cat");     // [cat   ]
println!("[{:>6}]", "cat");     // [   cat]
println!("[{:^6}]", "cat");     // [ cat  ]
println!("{:*^9}", "cat");      // ***cat***
println!("{:05}", 42);          // 00042
println!("{:08.2}", -3.14159);  // -0003.14
println!("{price:.2}");         // 4.50
```

- Width is a minimum. Longer values are never cut.
- With a width but no alignment, numbers go right and text goes left.
- If the padding doesn't split evenly, `^` puts the extra character on the right.
- Precision rounds a float. On text it's a maximum length: `{:.3}` turns `Ferris` into `Fer`. Integers ignore it.
- There's no `f` (`{:.2f}` is an error), no `%d` and no `,` grouping. Those come from C and Python.

## `print!`, `eprintln!` and `format!`

| Macro | Writes to | Ends the line? |
|---|---|---|
| `println!` | stdout | yes |
| `print!` | stdout | no |
| `eprintln!` | stderr | yes |
| `eprint!` | stderr | no |
| `format!` | nothing: returns a `String` | - |

```rust
print!("Loading... ");
println!("done");
eprintln!("warning: low battery"); // goes to stderr
let label = format!("{:>5}", 42);  // "   42", not printed yet
println!("[{label}]");
```

- Use stdout for results and stderr for errors, so the two can be separated.
- `println!()` prints an empty line. `print!()` doesn't compile.
- `println!` returns `()`, not text. Use `format!` when you want to keep the text.

## Escapes and raw strings

| Write | To get |
|---|---|
| `\n` | new line |
| `\t` | tab |
| `\"` | `"` |
| `\\` | `\` |
| `\'` | `'` (in a `char`) |
| `{{` and `}}` | `{` and `}` in a format string |

```rust
println!("She said \"hi\"");      // She said "hi"
println!("C:\\games");            // C:\games
println!(r"C:\games\new");        // raw: no escapes
println!(r#"She said "hi""#);     // raw with quotes inside
println!("{{{}}}", 7);            // {7}
```

- An unknown escape such as `\d` is a compile error.
- A raw string `r"..."` keeps every backslash. Add `#` around it when the text contains `"`.
- Raw strings still go through `println!`, so `{}` is still a placeholder and braces still need doubling.
- `{:?}` shows text with its escapes: `"a\tb"`.

## String literals are `&str`

```rust
let name: &str = "Ferris";
let initial: char = 'F';
println!("{}", name.len());    // 6
println!("{}", "café".len());  // 5
```

- Double quotes make a `&str`; single quotes make a `char`. Mixing them up is a *mismatched types* error.
- `format!` returns a `String`, a different type from `&str`. Both print the same way. Section 3 covers the difference.
- `.len()` counts bytes, not characters. Plain English letters are 1 byte each; `é` is 2.
- An escape is one character: `"\n".len()` is 1, but `r"\n".len()` is 2.
- Width counts characters, so `é` padded to 4 gets 3 spaces.

Read more: [std::fmt](https://doc.rust-lang.org/std/fmt/index.html) · Rust Reference "Literal expressions" · Rust by Example §1.2 "Formatted print"

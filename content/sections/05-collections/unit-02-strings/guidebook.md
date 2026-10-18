# Strings in Depth

## Building strings

```rust
let mut word = String::from("hi");
word.push('!');          // one char, single quotes
word.push_str(" there"); // a &str, double quotes
word += "!";             // same as push_str
```

- `push`, `push_str` and `+=` change the `String`, so it needs `mut`.
- `push_str` borrows its argument. Passing `&other` (a `&String`) works too.

```rust
let s1 = String::from("tic");
let s2 = String::from("tac");
let s3 = s1 + &s2;   // s1 moves, s2 is borrowed
// println!("{s1}"); // E0382: s1 has moved
```

- `+` takes ownership of the `String` on its left and needs a `&str` on its right.
- `s1 + s2` is E0308 (add `&`). `"a" + "b"` and `&s1 + &s2` are E0369 (the left side must be an owned `String`).

```rust
let city = String::from("Hobart");
let state = String::from("Tasmania");
let place = format!("{city}, {state}"); // borrows both
println!("{place}, from {city}"); // city still usable
```

- `format!` works like `println!` but returns the `String`. It borrows everything, so nothing moves. Use it for joining more than two pieces.

## Strings are UTF-8

```rust
let name = String::from("Zoë");
println!("{}", name.len());           // 4 bytes
println!("{}", name.chars().count()); // 3 chars
let c = name.chars().nth(0);          // Some('Z')
let b = name.as_bytes()[0];           // 90, a u8
```

- `.len()` counts bytes. Characters take 1 to 4 bytes each.
- `name[0]` doesn't compile (E0277): byte 0 might be part of a character. Choose `.chars()` or `.as_bytes()`.
- `.chars().nth(i)` returns an `Option<char>`: `None` past the end.
- Text has three views: bytes, `char`s and grapheme clusters (the letters a reader sees). `"e\u{301}"` displays as `é` but is 2 `char`s and 3 bytes. The standard library has no grapheme methods; use a crate such as `unicode-segmentation`.

## Looping over text

| Method | Each item |
|---|---|
| `.chars()` | a `char` |
| `.bytes()` | a `u8` |
| `.split_whitespace()` | a `&str` word |
| `.lines()` | a `&str` line, without `\n` |

```rust
let mut words = 0;
for _ in "the cat  sat".split_whitespace() {
    words += 1; // 3: runs of spaces count as one gap
}
```

- `for c in my_string` doesn't compile (E0277). Pick `.chars()`, `.bytes()` and so on.
- Compare a `char` with `'a'`, not `"a"`. A `u8` can't be compared with a `char`.
- `.lines()` gives empty lines as `""`. `.chars().rev()` goes backwards.
- You can't push to a `String` while looping over its `.chars()` (E0502).

## Useful methods

```rust
let raw = "  Hello World ";
let t = raw.trim();            // &str: "Hello World"
let low = t.to_lowercase();    // String: "hello world"
let id = low.replace(" ", "_"); // String: "hello_world"
low.contains("wor");           // true
low.starts_with('h');          // true
low.ends_with(".rs");          // false
```

- `trim` returns a `&str` that borrows the original. It only removes whitespace at the ends.
- `to_uppercase`, `to_lowercase` and `replace` return a new `String`. `replace` changes every match.
- `contains`, `starts_with` and `ends_with` return `bool`, take a `&str` or a `char`, and are case-sensitive.
- None of these change the original. `s.to_uppercase();` on its own line does nothing useful (the compiler warns).

## Converting between `String` and `&str`

```rust
let owned = String::from("plum"); // &str -> String
let also = "plum".to_string();    // same
let again = "plum".to_owned();    // same
let n = 42.to_string();           // "42"

let view: &str = &owned;          // String -> &str
let view2 = owned.as_str();       // same
```

- A literal is a `&str`, so `let s: String = "hi";` is E0308.
- Match a `String` against literal patterns with `match s.as_str() { "yes" => ..., _ => ... }`.
- `s == "yes"` works directly between a `String` and a `&str`.
- Parameters that only read text: `&str` (accepts literals, slices and `&String`).
- Functions that make new text: return `String`. Returning `&s` for a local `s` dangles and doesn't compile.

Read more: Book §8.2 · Rust by Example: Strings · Rustlings `09_strings`

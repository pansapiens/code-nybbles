# Slices

## String slices: `&str`

```rust
let s = String::from("hello world");
let hello = &s[0..5];  // "hello"
let world = &s[6..];   // "world"
let start = &s[..4];   // "hell"
let all = &s[..];      // "hello world"
```

- A slice borrows part of the text. Nothing is copied: it stores where its part starts and how many bytes it covers (a pointer and a length).
- `a..b` covers `a` up to, but not including, `b`. `a..=b` includes `b`.
- The `&` is required. `s[0..5]` on its own doesn't compile (E0277).
- String literals are `&str` too: `let greeting: &str = "hi";`
- `&s` is a `&String`; `&s[..]` is a `&str`.
- A range past the end panics: `end byte index 5 is out of bounds`.

## Slices are borrows

```rust
let mut s = String::from("hello world");
let word = &s[..5];
println!("{word}");  // last use of word
s.clear();           // fine: the borrow has ended
```

- While a slice is in use, you can read the `String` but not change or move it. Calling `s.clear()` before the `println!` is E0502.

## `&str` parameters

```rust
fn greet(name: &str) {
    println!("Hi, {name}!");
}

let player = String::from("Ada");
greet("Ferris");       // a literal
greet(&player);        // &String becomes &str
greet(&player[..2]);   // a slice
```

- `&str` accepts literals, slices and `&String`. Turning a `&String` into a `&str` automatically is called **deref coercion**.
- It doesn't work the other way: a `&String` parameter rejects literals and slices (E0308).
- Passing the `String` itself, `greet(player)`, is E0308. Add `&`.

## Array slices: `&[i32]`

```rust
fn sum(xs: &[i32]) -> i32 {
    let mut total = 0;
    for x in xs {
        total += x;
    }
    total
}

let scores = [3, 5, 8, 2];
let middle = &scores[1..3];       // [5, 8]
println!("{middle:?} {}", middle.len());
println!("{}", sum(&scores));     // 18
```

- For arrays, indexes count elements, not bytes.
- `&scores` turns into a `&[i32]` when a function asks for one.
- Print slices with `{:?}`. `{}` doesn't work (E0277).
- `&nums[0]` is one element, not a slice. Use a range.

## Bytes and characters

| Character | Bytes |
|---|---|
| `a` | 1 |
| `é` | 2 |
| `€` | 3 |
| `🦀` | 4 |

```rust
let s = String::from("café");
println!("{}", s.len());            // 5 bytes
println!("{}", s.chars().count());  // 4 characters
for c in s.chars() {
    print!("{c} ");                 // c a f é
}
```

- Text is stored as UTF-8 bytes. `.len()` and slice ranges count bytes.
- A slice must start and end between characters. `&s[..4]` here panics: `byte index 4 is not a char boundary`. It compiles; the check happens at run time.
- `s[0]` doesn't compile (E0277). Text can only be indexed with ranges.

## `first_word`

```rust
fn first_word(s: &str) -> &str {
    for (i, c) in s.char_indices() {
        if c == ' ' {
            return &s[..i];
        }
    }
    s
}
```

- `.char_indices()` gives each character with its byte position, so `&s[..i]` always lands on a boundary.
- The Book's version uses `s.as_bytes()`, `.iter().enumerate()` and the byte literal `b' '`.
- Returning a position (`usize`) isn't tied to the text: after `s.clear()` it's still a number. Returning a slice keeps the borrow, so the compiler stops `s.clear()` while the word is still in use (E0502).

Read more: Book §4.3 · Rust by Example: Arrays and Slices · Rustlings `04_primitive_types` (`primitive_types4.rs`)

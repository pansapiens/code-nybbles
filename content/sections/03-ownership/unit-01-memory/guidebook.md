# Memory Basics

## The stack and the heap

```rust
let score = 10;                        // stack: 4 bytes
let alive = true;                      // stack: 1 byte
let name = String::from("Ferris");     // stack: pointer, length, capacity
                                       // heap: the text "Ferris"
```

- Each function call gets a **frame** on the stack for its parameters and variables. The frame is removed when the function returns.
- Values whose size is fixed by their type go on the stack: integers, floats, `bool`, `char`, arrays like `[i32; 3]`, tuples of these.
- Data that can grow, like a `String`'s text, goes on the **heap**: memory requested while the program runs.
- On the stack, a `String` is three numbers: a **pointer** to the heap text, the **length** (bytes in use) and the **capacity** (bytes the heap block can hold). That's 24 bytes on a 64-bit computer, however long the text is.
- The stack is faster. A heap request has to find a free block that's big enough.

## `String` vs string literals

```rust
let literal = "Ferris";              // &str: fixed text in the program
let mut name = String::from("Ada");  // String: its own text on the heap
name.push_str(" Lovelace");          // grows; needs mut
println!("{}", name.len());          // 12 (bytes)
let label: String = format!("#{}", 7);
```

| | `"hi"` | `String::from("hi")` |
|---|---|---|
| Type | `&str` | `String` |
| Text stored | inside the program | on the heap |
| Can grow? | no | yes, with `push_str` and `mut` |

- `let s: String = "hi";` is **E0308** (mismatched types). Use `String::from("hi")`.
- `push_str` on a `&str` is **E0599**: a literal has no `push_str`.
- `push_str` on a `String` without `mut` is **E0596**. The fix is `let mut`.
- `push_str` takes a `&str` in double quotes, not a `char` like `'!'`.

## Scope and drop

```rust
let count = 1;
{
    let word = String::from("hi");
    println!("{word} {count}");
} // word goes out of scope: its String is dropped, heap memory freed
println!("{count}");
```

- A variable's scope runs from its `let` to the `}` that closes its block. Using it afterwards is **E0425**: cannot find value.
- Function bodies, loop bodies and `if` blocks are scopes too. A `String` made inside a loop is dropped at the end of every pass.
- Rust drops a value when its scope ends, not straight after its last use. You never free memory yourself.
- A shadowed `String` stays alive, hidden, until the end of its block.

## The ownership rules

1. Each value has an **owner**.
2. There is only **one owner at a time**.
3. When the owner goes out of scope, the value is **dropped**.

```rust
let mut note = String::from("draft");
note = String::from("final");  // "draft" is dropped now
let player = (String::from("Ada"), 3);
// player owns the tuple, which owns the String;
// dropping player drops both
```

- Assigning a new value drops the old one straight away.
- Tuples and arrays own their elements: dropping an array of 3 `String`s frees 3 heap blocks.
- Coming next: `let s2 = s1;` **moves** ownership to `s2`, so the text still has one owner and is freed once.

Read more: [Book §4.1](https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html) · Rust by Example §15.1 "RAII" · Rustlings `06_move_semantics`

# References & Borrowing

## `&`: borrow to read

```rust
fn len(s: &String) -> usize {
    s.len()
}

fn main() {
    let word = String::from("crab");
    let n = len(&word); // lend word
    println!("{word} has {n} letters"); // still ours
}
```

- `&word` makes a **reference**: it points at `word` without taking ownership.
- A `&String` parameter borrows. When the function returns, the caller still owns the value.
- Printing a reference prints the value. Methods like `s.len()` follow the reference for you.
- A `&` reference is read-only. Changing through it is **E0596**.

## `&mut`: borrow to change

```rust
fn add_one(n: &mut i32) {
    *n += 1;
}

fn main() {
    let mut lives = 3;
    add_one(&mut lives);
    println!("{lives}"); // 4
}
```

- The variable must be `let mut` to lend `&mut`.
- Write `&mut` in the parameter type and at the call.
- `*n` is the value `n` points at. Operators need it (`*n += 1`); methods don't (`s.push_str("!")`).

## One writer or many readers

While references are in use you can have **either** any number of `&` **or** exactly one `&mut`.

| In use at once | Result |
|---|---|
| many `&s` | fine |
| one `&mut s` | fine |
| two `&mut s` | **E0499** |
| `&s` and `&mut s` (or `s.push_str`) | **E0502** |

- `&` references are copied on assignment; `&mut` references are moved.
- The rule is per value: `&mut a` and `&mut b` together are fine.

## A borrow ends at its last use

```rust
let mut s = String::from("hi");
let r = &s;
println!("{r}");   // last use of r
s.push_str("!");   // fine: r is finished
```

- Not the end of the block: the compiler finds each reference's last use.
- To fix E0502 or E0499, often you move the old reference's last use above the conflicting line.

## No dangling references

```rust
fn make() -> String {
    let s = String::from("hi");
    s // give ownership away, don't return &s
}
```

- A reference can't outlive the value it points at. Using one after its value is dropped is **E0597**.
- Returning `&` to a local from a function with no reference parameters is **E0106** (missing lifetime specifier): there's nothing to borrow from. Return the owned value instead.
- Returning a reference you were given is fine: `fn echo(s: &String) -> &String { s }`.

## Permissions: Read, Write, Own

- `let` gives **R O**; `let mut` gives **R W O**.
- While `&s` is in use, `s` keeps only **R**; through the reference you get R.
- While `&mut s` is in use, `s` has **nothing**; through the reference you get R W.
- A reference never has O, so you can't move out of `*r` (**E0507**); use `.clone()`.
- Moving `s` while borrowed is **E0505**; assigning to it is **E0506**.

Read more: Book §4.2 · Rust by Example (Borrowing) · Rustlings `06_move_semantics` · Brown University Rust Book, ch. 4.1 (permissions)

# Ownership in Practice

## Choosing `T`, `&T` or `&mut T`

Ask what the function does with the value.

| The function... | Take | Call with |
|---|---|---|
| only reads it | `&T` (`&str` for text) | `f(&name)` |
| changes it for the caller | `&mut T` | `f(&mut name)` |
| keeps it, returns it or uses it up | `T` | `f(name)` (moves) |

```rust
fn show(name: &str) {
    println!("Hi, {name}");
}

fn shout(name: &mut String) {
    name.push_str("!");
}

fn main() {
    let mut name = String::from("Ann");
    shout(&mut name);
    show(&name);
}
```

- Read the body: `push_str` or assigning through `*` needs `&mut`. Returning or storing the value needs `T`. Anything else needs only `&T`.
- Small `Copy` values (`i32`, `bool`, `char`) are taken by value even to read them: `fn is_adult(age: u32) -> bool`.
- Passing `&mut x` needs `let mut x`. Ask for the least access the function needs.

## Fixing borrow-checker errors

| Code | Meaning |
|---|---|
| E0382 | used a value after it moved |
| E0499 | two `&mut` borrows alive at once |
| E0502 | a `&` and a `&mut` borrow overlap |
| E0505 | moved a value while it was borrowed |
| E0506 | assigned to a value while it was borrowed |

Try the fixes in this order:

1. **Borrow instead of move:** `let view = &name;`, `print_name(&name)`.
2. **Restructure:** a borrow ends at its last use, so finish with one reference before the conflicting one starts.
3. **Clone** only when you need two separate owners: `let backup = name.clone();`.

```rust
let mut word = String::from("cat");
let r = &word;
println!("{r}");     // r's last use
word.push_str("s");  // fine: r is finished
println!("{word}");
```

For an `i32`, copying (`let first = scores[0];`) leaves nothing borrowed.

## Looping over arrays

```rust
let names = [String::from("Ann"), String::from("Bo")];
for name in &names {       // name: &String
    println!("{name}");
}
println!("{}", names.len()); // names still usable
```

- `for x in &arr` borrows: each `x` is a reference, and `arr` is usable afterwards.
- `for x in arr` on an array of `String`s moves the array: each `x` owns one `String`, dropped at the end of its pass. Using `arr` afterwards is E0382.
- `for x in arr` on an array of `Copy` values like `i32` copies, so `arr` stays usable.
- You can't change `arr` inside `for x in &arr` (E0502, or E0506 for an assignment with `=`): the loop borrows it until it ends.

Read more: Book §4 · Rust by Example: Ownership and moves, Borrowing · Rustlings `06_move_semantics`

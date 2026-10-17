# Moves, Copies & Clones

## A move hands over ownership

```rust
let s1 = String::from("hello");
let s2 = s1;          // the String moves to s2
println!("{s2}");     // fine
// println!("{s1}");  // error[E0382]: borrow of moved value
```

- `let s2 = s1;` copies the pointer, length and capacity on the stack. The heap text is not copied.
- `s1` is invalid afterwards, so only `s2` frees the text. No double free.
- Moving is fine; *using* the old name afterwards is error **E0382**.
- Reading E0382: `value moved here` marks the move, `value borrowed here after move` (or `value used here after move`) marks the late use.
- A `mut` variable that was moved from can be given a new value: `s1 = String::from("new");`.

## Copy types are copied

```rust
let a = 5;
let b = a;           // a copy
println!("{a} {b}"); // 5 5
```

- **Copy:** integers, `f32`/`f64`, `bool`, `char`, and tuples and arrays made only of Copy types.
- **Not Copy:** `String`, and any tuple or array containing one. `(String, i32)` moves as a whole.

## `.clone()` copies the heap data too

```rust
let s1 = String::from("hello");
let s2 = s1.clone();   // new heap text
println!("{s1} {s2}"); // hello hello
```

- After a clone, the two `String`s are separate: changing one doesn't change the other.
- A clone takes time and memory. If you don't need the original any more, move it instead.
- Clone *before* the move: `let b = a; let c = a.clone();` is E0382.

## Functions take and give ownership

```rust
fn add_bang(mut text: String) -> String {
    text.push_str("!");
    text // ownership goes back to the caller
}

fn main() {
    let name = String::from("Hi");
    let name = add_bang(name); // moved in, moved back out
    println!("{name}");
}
```

- Passing a `String` moves it into the parameter. If the function doesn't return it, it's dropped when the function ends.
- Passing an `i32` (or any Copy type) gives the function a copy.
- Moving inside a loop fails on the second pass: `value moved here, in previous iteration of loop`.
- Taking and giving back works but is clumsy. The next unit, references, shows a better way.

## Does it compile? Checklist

1. Is the type Copy? Then every use is fine.
2. If not, did it move earlier: `let`, a function call, a tuple or array, an `if` branch or a loop?
3. Was it cloned before the move?

Read more: Book §4.1 · Rust by Example (Ownership and moves) · Rustlings `06_move_semantics`

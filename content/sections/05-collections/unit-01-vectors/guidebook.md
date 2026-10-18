# Vectors

## Making and growing a `Vec`

```rust
let scores = vec![10, 20, 30];            // from a list of values
let zeros = vec![0; 3];                   // [0, 0, 0]
let mut names: Vec<String> = Vec::new(); // empty, so give the type
names.push(String::from("Ann"));          // add at the end
println!("{scores:?} {}", scores.len());  // [10, 20, 30] 3
```

- A `Vec<T>` holds any number of values, all of type `T`. Unlike an array, its length can change.
- `Vec::new()` with nothing pushed is **E0282** (type annotations needed). A later `push` is enough for Rust to work out the type.
- `push` changes the vector, so it needs `let mut` (otherwise **E0596**). `push` takes ownership of the value it's given.
- `pop()` removes the last element and returns `Option<T>`: `Some(value)`, or `None` when the vector is empty.
- `len()` counts the elements; `is_empty()` is `true` when there are none.

## Where a `Vec` lives

Like a `String`, a `Vec` is three values on the stack: a **pointer** to the elements on the heap, the **length** (elements in use) and the **capacity** (how many fit before it needs a bigger block). When `push` finds the block full, the `Vec` copies its elements to a bigger block and frees the old one.

## Reading an element: `v[i]` or `v.get(i)`

```rust
let v = vec![10, 20, 30];
let a = v[1];                     // 20
let b = v.get(1);                 // Some(&20)
let c = v.get(10);                // None
let d = v.get(10).unwrap_or(&0);  // &0
```

- Indexes start at 0 and must be `usize`. An `i32` index is **E0277**.
- `v[i]` past the end **panics** at runtime. The compiler doesn't check it, because a `Vec`'s length is only known while the program runs.
- `v.get(i)` never panics. It returns `Option<&T>`, so a default for `unwrap_or` must be a reference, like `&0`.
- Use `v[i]` when the index must be valid (a bug otherwise); use `get` when it might not be, such as a number the user typed.
- `let s = v[0];` copies a `Copy` element like `i32`. For a `String` it's **E0507** (cannot move out of index): borrow with `&v[0]` or `.clone()` it.

## Looping

```rust
let mut v = vec![1, 2, 3];
for x in &v { println!("{x}"); }  // x: &i32, v still usable
for x in &mut v { *x += 1; }      // x: &mut i32, change in place
for x in v { println!("{x}"); }   // x: i32, v is moved
```

| Loop | Each `x` is | `v` afterwards |
|---|---|---|
| `for x in &v` | `&T` | usable |
| `for x in &mut v` | `&mut T` (needs `let mut v`) | usable, changed |
| `for x in v` | `T` | moved: using it is **E0382** |

- Write through a `&mut` with `*`: `*x += 1`. Without it, `x += 1` is **E0368**. Method calls like `x.push_str("!")` follow the reference for you.
- A `Vec` is never `Copy`, even a `Vec<i32>`, so `for x in v` always moves it.

## Borrowing rules with vectors

```rust,compile_fail,E0502
let mut v = vec![1, 2, 3];
let first = &v[0];
v.push(4);            // E0502
println!("{first}");
```

- While a reference into `v` is in use, `v` can't change. `push` might move the elements to a new heap block, and `first` would point at freed memory.
- The compiler doesn't know the capacity, so it forbids this even when there's room. Changing a different element (`v[1] = 5`) is also E0502.
- Pushing inside `for x in &v` is **E0502**; inside `for x in &mut v` it's **E0499**.
- Fixes: copy the value (`let first = v[0];`), `.clone()` it, use the reference before the `push`, keep the index instead, or push to a second vector.
- A function that only reads takes `&[T]`; one that pushes takes `&mut Vec<T>`.

## Different kinds of value in one `Vec`

```rust
enum Cell {
    Int(i32),
    Float(f64),
    Text(String),
}

let row = vec![
    Cell::Int(3),
    Cell::Text(String::from("blue")),
    Cell::Float(10.12),
];
for c in &row {
    match c {
        Cell::Int(n) => println!("int {n}"),
        Cell::Float(f) => println!("float {f}"),
        Cell::Text(s) => println!("text {s}"),
    }
}
```

- `vec![3, "apples"]` is **E0308**: one type per vector. Wrap each kind in a variant of an enum, and every element has the enum's type.
- Matching on `&Cell` gives references to the data inside (`n: &i32`, `s: &String`), so nothing moves out of the vector.
- `match` must cover every variant (**E0004**), so adding a variant shows you every place that needs updating. `if let` and `matches!` pick out one kind.

Read more: [Book §8.1](https://doc.rust-lang.org/book/ch08-01-vectors.html) · Rust by Example: Vectors · Rustlings `05_vecs`

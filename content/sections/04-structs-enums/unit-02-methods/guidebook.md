# Methods & Associated Functions

## Methods live in `impl` blocks

```rust
struct Counter {
    count: u32,
}

impl Counter {
    fn get(&self) -> u32 {      // read
        self.count
    }
    fn add(&mut self, n: u32) { // change
        self.count += n;
    }
}

fn main() {
    let mut taps = Counter { count: 0 };
    taps.add(2);
    println!("{}", taps.get()); // 2
}
```

- A method's first parameter is `self`, the value it was called on. Fields are reached with `self.count`.
- Call a method with a dot: `taps.add(2)`. Extra arguments go in the brackets.
- A struct can have a field and a method with the same name: `taps.count` vs `taps.count()`.

## Choosing `&self`, `&mut self` or `self`

| First parameter | The method can | The caller |
|---|---|---|
| `&self` | read fields | keeps the value |
| `&mut self` | change fields | keeps it, needs `let mut` |
| `self` | take ownership, move fields out | can't use it afterwards |

- Pick the weakest one that works, the same as for any parameter.
- `&mut self` method on a variable without `mut`: **E0596**.
- Assigning to a field inside a `&self` method: **E0594**. Fix the signature, not the assignment.
- Moving a `String` field out of `&self` (`self.name`): **E0507**. Return `&self.name` or `self.name.clone()`.
- Using a value after a `self` method moved it: **E0382**.

## Associated functions, `Self` and `new`

```rust
struct Player {
    name: String,
    lives: u32,
}

impl Player {
    fn new(name: String) -> Self {
        Self { name, lives: 3 }
    }
}

fn main() {
    let p = Player::new(String::from("Ada"));
    println!("{} has {} lives", p.name, p.lives);
}
```

- A function in an `impl` with no `self` is an **associated function**. Call it on the type with `::`, like `String::from`.
- `Self` (capital S) means the `impl` block's type. Lowercase `self` is the value a method was called on.
- `new` is a naming convention for constructors, not a keyword. Other names like `Rect::square(5)` are fine.
- Calling an associated function with a dot (`p.new()`): **E0599**. Using `self` inside one: **E0424**.

## Rust borrows for you

```rust
struct Rect { w: u32, h: u32 }

impl Rect {
    fn area(&self) -> u32 { self.w * self.h }
}

impl Rect { // a second impl block is fine
    fn is_wide(&self) -> bool { self.w > self.h }
}

fn main() {
    let r = Rect { w: 3, h: 2 };
    let a = r.area();           // same as (&r).area()
    let b = Rect::area(&r);     // written out in full
    println!("{a} {b} {}", r.is_wide());
}
```

- With a `.` call, Rust adds the `&` or `&mut` that `self` needs, and works through references too.
- With `Type::method(...)` it doesn't: pass `&r` or `&mut r` yourself.
- It can't turn a `&` reference into `&mut`, and it never borrows for a plain `self` method.

## Chaining

```rust
struct Timer { secs: u32 }

impl Timer {
    fn tick(&mut self) -> &mut Self {
        self.secs += 1;
        self
    }
}

fn main() {
    let mut t = Timer { secs: 0 };
    t.tick().tick().tick();
    println!("{}", t.secs); // 3
}
```

- A method's result can have methods of its own: `pet.name().len()`.
- Returning `&mut Self` lets you chain calls that change the same value.

Read more: Book §5.3 · Rust by Example: Methods · Rustlings `07_structs`

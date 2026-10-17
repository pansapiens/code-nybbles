# Structs

## Defining and creating a struct

```rust
struct Player {
    name: String,
    score: u32,
}

fn main() {
    let mut player = Player {
        name: String::from("Ana"),
        score: 40,
    };
    player.score += 10;
    println!("{} {}", player.name, player.score);
}
```

- A struct groups named *fields*, each with a type. `field: Type`, separated by commas.
- Create an *instance* by giving **every** field a value, in any order. Leaving one out is **E0063**.
- Read and write fields with a dot: `player.score`.
- To change any field, the whole instance must be `let mut`. You can't mark one field as mutable. Assigning to a field of a non-`mut` instance is **E0594**.

## Field init shorthand and struct update

```rust
struct User {
    name: String,
    age: u32,
}

fn make_user(name: String) -> User {
    User { name, age: 18 } // same as name: name
}

fn main() {
    let kim = make_user(String::from("Kim"));
    let lee = User { name: String::from("Lee"), ..kim };
    println!("{} {}", kim.name, lee.age);
}
```

- Shorthand: when a variable has the same name as a field, write it once.
- `..other` fills every field you didn't list from `other`. It must come last.
- `..other` moves non-`Copy` fields such as `String`. If it takes `other.name`, then `other.name` (and `other` as a whole) can't be used afterwards. `Copy` fields like `u32` are copied, so they stay usable.

## Tuple structs, newtypes and unit structs

```rust
struct Colour(u8, u8, u8); // tuple struct
struct Metres(f64);        // newtype
struct GameOver;           // unit struct

fn main() {
    let teal = Colour(0, 128, 128);
    let height = Metres(8848.0);
    let state = GameOver;
    println!("{} {}", teal.1, height.0);
}
```

- A tuple struct has typed fields with no names. Read them by position: `.0`, `.1`, ...
- Each struct is its own type, even with the same fields. Passing `Feet` where `Metres` is expected is **E0308**, so a one-field "newtype" stops you mixing units.
- A new struct doesn't get `+`: write `Metres(a.0 + b.0)`.
- A unit struct has no fields. Create it with the name alone (`GameOver`, not `GameOver()`).

## Printing structs: `#[derive(Debug)]` and `dbg!`

```rust
#[derive(Debug)]
struct Pet {
    name: String,
    age: u32,
}

fn main() {
    let pet = Pet { name: String::from("Rex"), age: 3 };
    println!("{pet:?}");  // Pet { name: "Rex", age: 3 }
    println!("{pet:#?}"); // one field per line
    let years = dbg!(pet.age * 7) + 1;
    dbg!(&pet);
    println!("{years}");
}
```

- Without `#[derive(Debug)]`, `{:?}` on a struct is **E0277**. Every field's type needs Debug too.
- `{}` needs Display, which `derive(Debug)` doesn't give you.
- `dbg!(expr)` prints `[src/main.rs:line:col] expr = value` to **stderr** (in the `{:#?}` format) and returns the value.
- `dbg!` takes ownership of its argument. Pass a reference, `dbg!(&pet)`, to keep using `pet`.

## Structs own their data

```rust
struct User {
    name: String,
    age: u32,
}

fn main() {
    let user = User { name: String::from("Kim"), age: 30 };
    let name = user.name;              // partial move
    println!("{name} {}", user.age);   // other fields still usable
    // let again = user;               // E0382: partially moved
}
```

- A struct owns its fields. When it goes out of scope, its `String`s are freed with it.
- Use `String` for text fields for now. A `&str` field is a borrow and needs a lifetime (**E0106**), which comes later.
- A struct isn't `Copy`, even if all its fields are: `let b = a;` moves `a`.
- Moving one field out is a *partial move*. Borrow with `&user.name` or copy with `.clone()` to keep `user` whole.
- Through a `&` reference you can't move a field out (**E0507**) or assign to one (**E0594**).

Read more: [Book §5.1-5.2](https://doc.rust-lang.org/book/ch05-01-defining-structs.html) · Rust by Example §3.1 "Structures" · Rustlings `07_structs`

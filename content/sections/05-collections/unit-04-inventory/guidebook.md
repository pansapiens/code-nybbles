# Project: Inventory

A stock tracker for a small shop, built from Sections 3 to 5: an `enum` and `struct` for each item, an `Inventory` struct with methods, a `Vec` to hold the items and a `BTreeMap` for the report. Here is the finished program:

```rust
use std::collections::BTreeMap;

#[derive(Debug)]
enum Category { Tool, Food, Part }

#[derive(Debug)]
struct Item {
    name: String,
    qty: u32,
    category: Category,
}

struct Inventory { items: Vec<Item> }

impl Inventory {
    fn new() -> Self {
        Inventory { items: Vec::new() }
    }

    fn add(&mut self, item: Item) {
        for old in &mut self.items {
            if old.name == item.name {
                old.qty += item.qty;
                return;
            }
        }
        self.items.push(item);
    }

    fn find(&self, name: &str)
        -> Option<&Item> {
        for item in &self.items {
            if item.name == name {
                return Some(item);
            }
        }
        None
    }

    fn report(&self) {
        let mut sums = BTreeMap::new();
        for item in &self.items {
            let c = &item.category;
            let total = sums
                .entry(format!("{c:?}"))
                .or_insert(0);
            *total += item.qty;
        }
        for (c, total) in &sums {
            println!("{c}: {total}");
        }
    }
}

fn main() {
    let mut inv = Inventory::new();
    for (name, qty, category) in [
        ("hammer", 3, Category::Tool),
        ("rice", 5, Category::Food),
        ("bolts", 40, Category::Part),
        ("rice", 10, Category::Food),
    ] {
        inv.add(Item {
            name: name.to_string(),
            qty,
            category,
        });
    }
    let n = inv.items.len();
    println!("{n} items");
    println!("{:?}", inv.find("rice"));
    println!("{:?}", inv.find("glue"));
    inv.report();
}
```

It prints:

```text
3 items
Some(Item { name: "rice", qty: 15, category: Food })
None
Food: 15
Part: 40
Tool: 3
```

## Step 1: describe an item

- A category is exactly one of a fixed set, so `Category` is an `enum`. An item groups a name, a quantity and a category, so `Item` is a `struct`.
- `name` is a `String`, so each item owns its name. `qty` is a `u32`, so it can't be negative.
- `#[derive(Debug)]` lets you print with `{:?}`. Every field must be printable too, so `Category` needs it as well (otherwise **E0277**).

## Step 2: keep a list of items

- `Inventory` holds a `Vec<Item>`. `new` is an associated function returning `Self` (here, `Inventory`); call it as `Inventory::new()`.
- `add` changes the list, so it takes `&mut self`, and the caller needs `let mut inv` (otherwise **E0596**).
- `for (name, qty, category) in [...]` takes each tuple apart. `qty,` is shorthand for `qty: qty,`.

## Step 3: look an item up

- `find` returns `Option<&Item>`: `Some` with a borrow of the item, or `None`. Returning `Item` would move it out of the inventory.
- It loops over `&self.items`, so nothing is moved.
- As a method with `&self`, Rust knows the result borrows from `self`. The same function with two reference parameters fails with **E0106**.
- `name: &str` accepts both literals and `&String`.

## Step 4: restock instead of repeating

- `add` loops over `&mut self.items`, so it can change an existing item: `old.qty += item.qty`, then `return`. Only new names get pushed.
- Looping over `&items` and then writing is **E0594**. Calling `add` while a result of `find` is still in use is **E0502**: a shared borrow and a mutable one at the same time.

## Step 5: report totals by category

- `entry(key).or_insert(0)` starts a total at 0 and returns a `&mut` to it, which `+=` increases.
- A `BTreeMap` visits keys in sorted order, so the report is the same every run. A `HashMap` would not be.
- `BTreeMap` keys must be comparable. `Category` isn't yet, so the key is its Debug name, `format!("{c:?}")`.

Read more: [Book ch. 8](https://doc.rust-lang.org/book/ch08-00-common-collections.html) (and ch. 5 and 6 for structs and enums) · Rust by Example: Structures, Vectors, HashMap · Rustlings `07_structs`, `05_vecs`, `11_hashmaps`

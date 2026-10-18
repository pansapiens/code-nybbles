# HashMap & Friends

## HashMap basics

```rust
use std::collections::HashMap;

let mut scores = HashMap::new();
scores.insert("Ana", 10);           // None: the key was new
let old = scores.insert("Ana", 25); // Some(10): replaced
let ana = scores.get("Ana");        // Some(&25), a reference
let bo = scores.get("Bo");          // None
println!("{old:?} {ana:?} {bo:?}");
```

- `HashMap` needs `use std::collections::HashMap;` (without it: **E0433**).
- Each key holds one value. `insert` overwrites and returns the old value as `Option<V>`.
- `get(key)` returns `Option<&V>`. For a fallback, match the reference: `get(k).unwrap_or(&0)`.
- `contains_key(key)` gives a `bool`, `remove(key)` returns `Option<V>`, `len()` counts entries.
- All keys have one type and all values have one type.

## Maps own what you insert

```rust
use std::collections::HashMap;

let name = String::from("Ana");
let mut ages = HashMap::new();
ages.insert(name.clone(), 30); // insert(name, 30) would move name
println!("{:?}", ages.get(&name));  // look up with &name...
println!("{:?}", ages.get("Ana"));  // ...or a &str literal
```

- Inserting a `String` moves it into the map; using it afterwards is **E0382**. `Copy` values like `i32` are copied.
- `get`, `contains_key` and `remove` borrow the key: pass `&name`, not `name` (**E0308**).
- If the keys are references (`&str`), the map borrows them, and the owner must outlive the map (**E0597**).
- `remove` hands the value back to you; `get` only lends it.
- A reference from `get` keeps the map borrowed: no `insert` or `remove` while it's in use (**E0502**).

## Counting with `entry`

```rust
use std::collections::HashMap;

let text = "the cat saw the dog";
let mut counts = HashMap::new();
for word in text.split_whitespace() {
    *counts.entry(word).or_insert(0) += 1;
}
println!("{:?}", counts.get("the")); // Some(2)
```

- `entry(k).or_insert(v)` inserts `v` only if `k` is missing, then returns `&mut V`.
- Change the value through it with `*`. Without `*`: **E0368**.
- Two `&mut` from `entry` alive at once: **E0499**.
- `entry` takes the key by value, so a `String`-keyed map needs a `String`, not a `&str`.
- Values can be collections: `map.entry(k).or_insert(Vec::new()).push(x)`.

## Looping over a map

```rust
use std::collections::BTreeMap;

let mut sales = BTreeMap::new();
sales.insert("Tue", 8);
sales.insert("Mon", 5);
for (day, n) in &sales {
    println!("{day}: {n}"); // Mon first: keys are sorted
}
```

| Loop | You get | Map afterwards |
|---|---|---|
| `for (k, v) in &map` | `&K`, `&V` | still usable |
| `for (k, v) in &mut map` | `&K`, `&mut V` | still usable |
| `for (k, v) in map` | `K`, `V` | moved (**E0382** if used) |

- `map.keys()`, `map.values()` and `map.values_mut()` give one half of each entry.
- A `HashMap` has no fixed order, and it can change between runs. Totals and counts are safe; printing each entry isn't predictable.
- For sorted output, use a `BTreeMap`, or copy the keys into a `Vec` and `sort()` it.
- You can't `insert` into a map while looping over it (**E0502**).

## Choosing a collection

```rust
use std::collections::HashSet;
use std::collections::VecDeque;

let mut seen = HashSet::new();
println!("{}", seen.insert("Ana")); // true: new
println!("{}", seen.insert("Ana")); // false: already there

let mut queue = VecDeque::new();
queue.push_back("Ana");
queue.push_back("Bo");
println!("{:?}", queue.pop_front()); // Some("Ana")
```

| Need | Use |
|---|---|
| items in order, by position; a stack (`push`/`pop`) | `Vec` |
| look up a value by key | `HashMap` |
| look up by key, keys always sorted | `BTreeMap` |
| unique values, "have I seen this?" | `HashSet` |
| a queue: in at the back, out at the front | `VecDeque` |

- A `HashSet` can't be indexed (**E0608**); use `contains`.
- `pop_front` returns an `Option`, `None` once the queue is empty.

Read more: Book §8.3 · Rust by Example (HashMap, HashSet) · Rustlings `11_hashmaps`

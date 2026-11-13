---
title: HashMap — Key-Value Pairs
---
`HashMap<K, V>` is the counterpart of Python's `dict` and C++'s `std::unordered_map`. It isn't in the prelude, so `use` it first:

```rust
use std::collections::HashMap;

let mut scores: HashMap<String, u32> = HashMap::new();
scores.insert("Ada".to_string(), 95);        // insert or overwrite
scores.insert("Bob".to_string(), 80);

let ada: Option<&u32> = scores.get("Ada");   // lookups return Option; None if missing
let n = scores.get("Zed").copied().unwrap_or(0);

scores.contains_key("Bob");
scores.remove("Bob");
scores.len();
```

Note the difference from Python: `d["missing"]` raises `KeyError`; Rust's `get` returns an `Option`, putting "might be missing" into the type. (Indexing like `scores["Zed"]` also exists and panics if the key is missing.)

## Iterating

```rust
for (name, score) in &scores {
    println!("{name}: {score}");
}
```

The iteration order is **unspecified** (unlike Python 3.7+ dicts). When you need sorted keys, use `BTreeMap`, which has almost the same API and corresponds to C++'s `std::map`.

## The entry API: "insert if missing, otherwise update"

This is the most Rust-flavoured part of `HashMap`. Counting is the classic example:

```rust
let mut counts: HashMap<char, usize> = HashMap::new();
for c in "hello".chars() {
    *counts.entry(c).or_insert(0) += 1;
}
```

`entry(c)` finds the slot for the key; `or_insert(0)` inserts 0 if the key is missing and returns a **mutable reference** `&mut usize` to the value; `*` dereferences it so we can add one. Only one hash lookup happens — the equivalent of Python's `counts[c] = counts.get(c, 0) + 1` or `defaultdict(int)`.

## Ownership

On insert, owned keys and values such as `String` are **moved** into the map, which becomes their new owner.

## Task

1. `word_count(text)`: split the text on whitespace and count how often each word occurs. `text.split_whitespace()` yields each word (`&str`)
2. `top_scorer(scores)`: return the name with the highest score; `None` for an empty map. The tests never have a tie for first place

:::hint
`word_count`:
```rust
let mut counts = HashMap::new();
for word in text.split_whitespace() {
    *counts.entry(word.to_string()).or_insert(0) += 1;
}
counts
```
The key type is `String`, so `to_string()` turns each `&str` into an owned string.
:::

:::hint
`top_scorer`: keep the best so far in an `Option<(&String, u32)>`, loop `for (name, &score) in scores`, and update it when you see a higher score. At the end, turn the `&String` into a `String` before returning, e.g. `best.map(|(name, _)| name.clone())`, or use `match`.
:::

:::exercise
use std::collections::HashMap;

/// Count how often each word occurs
fn word_count(text: &str) -> HashMap<String, usize> {
    todo!()
}

/// The name with the highest score
fn top_scorer(scores: &HashMap<String, u32>) -> Option<String> {
    todo!()
}

fn main() {
    let counts = word_count("the quick brown fox jumps over the lazy dog the end");
    println!("'the' appears {:?} times", counts.get("the"));

    let mut scores = HashMap::new();
    scores.insert("Ada".to_string(), 95);
    scores.insert("Bob".to_string(), 80);
    println!("top scorer: {:?}", top_scorer(&scores));
}
:::

:::solution
use std::collections::HashMap;

/// Count how often each word occurs
fn word_count(text: &str) -> HashMap<String, usize> {
    let mut counts = HashMap::new();
    for word in text.split_whitespace() {
        *counts.entry(word.to_string()).or_insert(0) += 1;
    }
    counts
}

/// The name with the highest score
fn top_scorer(scores: &HashMap<String, u32>) -> Option<String> {
    let mut best: Option<(&String, u32)> = None;
    for (name, &score) in scores {
        match best {
            Some((_, top)) if top >= score => {}
            _ => best = Some((name, score)),
        }
    }
    best.map(|(name, _)| name.clone())
}

fn main() {
    let counts = word_count("the quick brown fox jumps over the lazy dog the end");
    println!("'the' appears {:?} times", counts.get("the"));

    let mut scores = HashMap::new();
    scores.insert("Ada".to_string(), 95);
    scores.insert("Bob".to_string(), 80);
    println!("top scorer: {:?}", top_scorer(&scores));
}
:::

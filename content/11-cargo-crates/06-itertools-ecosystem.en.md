---
title: itertools and a Map of the Ecosystem
---
The standard library already has plenty of iterator methods (chapter 8), and `itertools` adds dozens more useful ones. Usage is simple: after `use itertools::Itertools;`, every iterator gains these methods.

```rust
use itertools::Itertools;

[3, 1, 2].iter().sorted().collect_vec();            // [1, 2, 3]: a sorted iterator; collect_vec is short for collect::<Vec<_>>()
["a", "b", "c"].iter().join(", ");                  // "a, b, c": join anything that implements Display
[1, 1, 2, 3, 3].iter().dedup().collect_vec();       // [1, 2, 3]: drop adjacent duplicates
[1, 2, 1, 3].iter().unique().collect_vec();         // [1, 2, 3]: drop all duplicates, keeping first occurrences in order
"hello".chars().counts();                           // HashMap<char, usize>: counting
[1, 2, 3, 4].iter().tuple_windows::<(_, _)>();      // (1,2) (2,3) (3,4): neighbours as tuples
(1..=3).cartesian_product('a'..='b');               // (1,'a') (1,'b') (2,'a') ...: cartesian product, instead of two nested fors
[1, 2, 3, 4, 5].iter().positions(|x| x % 2 == 1);   // 0, 2, 4: every index that matches
```

`chunk_by` groups **adjacent elements with the same key**, which is perfect for things like run-length encoding:

```rust
let s = "aaabcc";
for (ch, group) in &s.chars().chunk_by(|c| *c) {    // note the leading &
    println!("{ch} appears {} times in a row", group.count());
}
```

## A map of the Rust ecosystem

After this chapter you've met the most common crates. Here are the de-facto standard choices in each area — a good starting point for a new project:

| Need | Common crates | Notes |
| --- | --- | --- |
| Serialization | `serde` + `serde_json` / `toml` / `serde_yaml` / `csv` | almost every crate supports serde |
| Error handling | `thiserror` (libraries), `anyhow` (applications) | |
| Command line | `clap` | plus `indicatif` for progress bars |
| Random numbers | `rand` | |
| Regular expressions | `regex` | |
| Date and time | `chrono`, `jiff` | |
| Logging | `tracing`, `log` + `env_logger` | |
| Parallelism | `rayon` | change `.iter()` to `.par_iter()` to use every core |
| Async runtime | `tokio` | the foundation of network services |
| Web servers | `axum`, `actix-web` | |
| HTTP client | `reqwest` | |
| Databases | `sqlx`, `diesel`, `rusqlite` | |
| Testing | `proptest` (property-based), `insta` (snapshots), `criterion` (benchmarks) | |
| Python interop | `pyo3`, `maturin` | write Python extensions in Rust |
| C/C++ interop | `bindgen`, `cxx` | |

Async (`async` / `await`) is a big topic of its own in Rust; it's best learned after finishing this tutorial, together with the [official Tokio tutorial](https://tokio.rs/tokio/tutorial).

## Task

This level forbids `for`, `while` and `loop`; use itertools:

1. `run_length(s)`: run-length encoding, `"aaabcc"` → `"a3b1c2"`
2. `pair_sums(v)`: the sums of neighbouring elements, `[1, 2, 3, 4]` → `[3, 5, 7]`
3. `top_letters(text, k)`: count the letters (`is_alphabetic`, lowercased) and return the `k` most frequent, formatted as `"l:3, o:2"`; ties go in alphabetical order

:::hint
`run_length`: `s.chars().chunk_by(|c| *c).into_iter().map(|(c, g)| format!("{c}{}", g.count())).collect()`. The result of `chunk_by` needs `.into_iter()` (or a reference, as in the lesson) before you can iterate it.
:::

:::hint
`pair_sums`: `v.iter().tuple_windows().map(|(a, b)| a + b).collect()`. The tuple size is inferred from the closure parameter `(a, b)`.
:::

:::hint
`top_letters`:
```rust
text.chars()
    .filter(|c| c.is_alphabetic())
    .flat_map(|c| c.to_lowercase())
    .counts()
    .into_iter()
    .sorted_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)))
    .take(k)
    .map(|(c, n)| format!("{c}:{n}"))
    .join(", ")
```
:::

:::exercise
use itertools::Itertools;

/// Run-length encoding: "aaabcc" -> "a3b1c2"
fn run_length(s: &str) -> String {
    todo!()
}

/// Sums of neighbouring elements
fn pair_sums(v: &[i32]) -> Vec<i32> {
    todo!()
}

/// The k most frequent letters, like "l:3, o:2"
fn top_letters(text: &str, k: usize) -> String {
    todo!()
}

fn main() {
    println!("{}", run_length("aaabccddd"));
    println!("{:?}", pair_sums(&[1, 2, 3, 4]));
    println!("{}", top_letters("Hello, World!", 3));
}
:::

:::solution
use itertools::Itertools;

/// Run-length encoding: "aaabcc" -> "a3b1c2"
fn run_length(s: &str) -> String {
    s.chars()
        .chunk_by(|c| *c)
        .into_iter()
        .map(|(c, g)| format!("{c}{}", g.count()))
        .collect()
}

/// Sums of neighbouring elements
fn pair_sums(v: &[i32]) -> Vec<i32> {
    v.iter().tuple_windows().map(|(a, b)| a + b).collect()
}

/// The k most frequent letters, like "l:3, o:2"
fn top_letters(text: &str, k: usize) -> String {
    text.chars()
        .filter(|c| c.is_alphabetic())
        .flat_map(|c| c.to_lowercase())
        .counts()
        .into_iter()
        .sorted_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)))
        .take(k)
        .map(|(c, n)| format!("{c}:{n}"))
        .join(", ")
}

fn main() {
    println!("{}", run_length("aaabccddd"));
    println!("{:?}", pair_sums(&[1, 2, 3, 4]));
    println!("{}", top_letters("Hello, World!", 3));
}
:::

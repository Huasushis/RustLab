---
title: Word Frequencies
---
The first capstone challenge: find the most frequent words in a piece of English text. You'll use `HashMap`, string processing, iterators and sorting.

## New tool: custom sorting

```rust
let mut v = vec![("b", 2), ("a", 2), ("c", 5)];

// sort_by takes a comparison function returning an Ordering (Less / Equal / Greater)
v.sort_by(|x, y| y.1.cmp(&x.1));                       // by count, descending

// then / then_with chain several sort keys
v.sort_by(|x, y| y.1.cmp(&x.1).then(x.0.cmp(y.0)));    // count descending, then word ascending on ties
// result: [("c", 5), ("a", 2), ("b", 2)]

v.sort_by_key(|x| x.1);                                // simpler when sorting ascending by one key
```

Compare: C++'s `std::sort` takes a comparator returning `bool` ("should a come before b"); Python has `sorted(key=...)`. Rust's `cmp` returns a three-way `Ordering`, which makes chaining several keys natural.

Both `sort` and `sort_by` are **stable** sorts.

## Rules

`top_words(text, k)` returns the `k` most frequent words together with their counts:

1. A **word** is a run of ASCII letters and apostrophes `'`; every other character is a separator. For example, `"don't stop—believing!"` has three words: `don't`, `stop` and `believing`
2. Counting is **case-insensitive**: convert everything to lowercase
3. Sort by count **descending**; words with the same count go in **ascending** alphabetical order
4. If there are fewer than `k` distinct words, return as many as there are

:::hint
Splitting words: `text.split(|c: char| !(c.is_ascii_alphabetic() || c == '\''))` splits at every character that is neither a letter nor an apostrophe. Filter out the empty pieces with `.filter(|w| !w.is_empty())`.
:::

:::hint
Counting: `*counts.entry(w.to_lowercase()).or_insert(0) += 1;`, where `counts` is a `HashMap<String, usize>`.
:::

:::hint
Sorting and truncating:
```rust
let mut v: Vec<(String, usize)> = counts.into_iter().collect();
v.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
v.truncate(k);
v
```
:::

:::exercise
use std::collections::HashMap;

/// The k most frequent words (lowercased) and their counts
fn top_words(text: &str, k: usize) -> Vec<(String, usize)> {
    todo!()
}

fn main() {
    let text = "It was the best of times, it was the worst of times, \
                it was the age of wisdom, it was the age of foolishness...";
    for (word, n) in top_words(text, 5) {
        println!("{word:>8} {n}");
    }
}
:::

:::solution
use std::collections::HashMap;

/// The k most frequent words (lowercased) and their counts
fn top_words(text: &str, k: usize) -> Vec<(String, usize)> {
    let mut counts: HashMap<String, usize> = HashMap::new();
    for w in text.split(|c: char| !(c.is_ascii_alphabetic() || c == '\'')).filter(|w| !w.is_empty()) {
        *counts.entry(w.to_lowercase()).or_insert(0) += 1;
    }
    let mut v: Vec<(String, usize)> = counts.into_iter().collect();
    v.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
    v.truncate(k);
    v
}

fn main() {
    let text = "It was the best of times, it was the worst of times, \
                it was the age of wisdom, it was the age of foolishness...";
    for (word, n) in top_words(text, 5) {
        println!("{word:>8} {n}");
    }
}
:::

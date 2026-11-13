---
title: The Iterator Toolbox
---
The `Iterator` trait has more than seventy methods. This level walks through the most useful ones: before writing a loop, check whether one of these already does the job.

## More adapters (lazy, return a new iterator)

```rust
it.enumerate()            // with indexes: (0, a), (1, b), ...   like Python's enumerate
a.iter().zip(b.iter())    // pair up two iterators: (a0, b0), (a1, b1), ...  stops at the shorter one
it.rev()                  // reverse
it.take(3)  it.skip(2)    // the first 3 / skip the first 2
it.take_while(|x| ..)     // take until the condition first fails
it.chain(other)           // one after the other
it.flat_map(|x| ..)       // map each item to an iterator, then flatten
it.filter_map(|x| ..)     // the closure returns Option: drop the Nones, unwrap the Somes
```

## More consumers (evaluate immediately)

```rust
it.fold(init, |acc, x| ..)       // general accumulation, like functools.reduce / std::accumulate
it.any(|x| ..)  it.all(|x| ..)   // any / all satisfy the condition; short-circuits
it.find(|x| ..)                  // the first matching item, as an Option
it.position(|x| ..)              // the index of the first match, Option<usize>
it.min()  it.max()               // Option
it.max_by_key(|x| ..)            // maximum by some key
it.last()  it.nth(2)
```

## Handy slice helpers

```rust
v.windows(2)      // sliding windows of neighbours: [a,b], [b,c], [c,d] ...
v.chunks(3)       // groups of 3
```

## Examples

```rust
// is it a palindrome?
let s = "level";
let is_pal = s.chars().eq(s.chars().rev());

// parse "k=v;k=v" into pairs, skipping malformed parts
let pairs: Vec<(&str, &str)> = "a=1;bad;b=2".split(';').filter_map(|p| p.split_once('=')).collect();
```

## Task

This level forbids `for`, `while` and `loop` as well.

1. `dot(a, b)`: the dot product of two vectors (multiply matching positions and sum)
2. `index_of_max(v)`: the index of the maximum; `None` for an empty slice. The maximum is never duplicated in the tests
3. `is_sorted_asc(v)`: is it non-decreasing (every element no smaller than the previous)? Empty and single-element slices count as sorted
4. `acronym(s)`: take the first letter of every word, uppercased: `"portable network graphics"` → `"PNG"`

:::hint
`dot`: `a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()`
:::

:::hint
`index_of_max`: `v.iter().enumerate().max_by_key(|(_, x)| **x).map(|(i, _)| i)`. `enumerate` yields `(usize, &i32)`, and the closure receives a reference to that tuple, hence `**x`.
:::

:::hint
`is_sorted_asc`: `v.windows(2).all(|w| w[0] <= w[1])`

`acronym`: `s.split_whitespace().filter_map(|w| w.chars().next()).map(|c| c.to_ascii_uppercase()).collect()`
:::

:::exercise
/// Dot product
fn dot(a: &[i32], b: &[i32]) -> i32 {
    todo!()
}

/// The index of the maximum
fn index_of_max(v: &[i32]) -> Option<usize> {
    todo!()
}

/// Is it non-decreasing?
fn is_sorted_asc(v: &[i32]) -> bool {
    todo!()
}

/// First-letter acronym
fn acronym(s: &str) -> String {
    todo!()
}

fn main() {
    println!("{}", dot(&[1, 2, 3], &[4, 5, 6]));
    println!("{:?}", index_of_max(&[3, 9, 2]));
    println!("{}", is_sorted_asc(&[1, 2, 2, 5]));
    println!("{}", acronym("portable network graphics"));
}
:::

:::solution
/// Dot product
fn dot(a: &[i32], b: &[i32]) -> i32 {
    a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
}

/// The index of the maximum
fn index_of_max(v: &[i32]) -> Option<usize> {
    v.iter().enumerate().max_by_key(|(_, x)| **x).map(|(i, _)| i)
}

/// Is it non-decreasing?
fn is_sorted_asc(v: &[i32]) -> bool {
    v.windows(2).all(|w| w[0] <= w[1])
}

/// First-letter acronym
fn acronym(s: &str) -> String {
    s.split_whitespace()
        .filter_map(|w| w.chars().next())
        .map(|c| c.to_ascii_uppercase())
        .collect()
}

fn main() {
    println!("{}", dot(&[1, 2, 3], &[4, 5, 6]));
    println!("{:?}", index_of_max(&[3, 9, 2]));
    println!("{}", is_sorted_asc(&[1, 2, 2, 5]));
    println!("{}", acronym("portable network graphics"));
}
:::

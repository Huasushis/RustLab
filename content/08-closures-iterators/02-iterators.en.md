---
title: Iterators — map, filter, collect
---
Behind every `for` loop is the `Iterator` trait, whose core is a single method:

```rust
trait Iterator {
    type Item;
    fn next(&mut self) -> Option<Self::Item>;   // Some if there's a next item, None when exhausted
}
```

## Getting an iterator from a collection

These match the three kinds of `for` from chapter 4:

```rust
let v = vec![1, 2, 3];
v.iter();         // yields &T      borrows
v.iter_mut();     // yields &mut T  borrows mutably
v.into_iter();    // yields T       takes ownership
```

## Adapters: turn one iterator into another

```rust
let v = vec![1, 2, 3, 4, 5, 6];
let it = v.iter()
    .filter(|x| **x % 2 == 0)      // keep the even ones
    .map(|x| x * x);               // then square them
```

Iterators are **lazy**: the code above computes nothing, it just sets up a pipeline — the same idea as Python generator expressions and C++20 ranges.

## Consumers: actually drive the iteration

```rust
let squares: Vec<i32> = it.collect();          // gather into a collection; the target type comes from the annotation
let total: i32 = v.iter().sum();
let n = v.iter().count();
let biggest = v.iter().max();                  // Option<&i32>
```

`collect` can build a `Vec`, `String`, `HashMap`, `HashSet` and more, so you **must tell it the target type**: annotate the variable, or use the turbofish `.collect::<Vec<_>>()`.

## About all those * and &

`v.iter()` yields `&i32`; the closure passed to `filter` receives "a reference to the item", which makes `&&i32`, hence `**x`. If that bothers you, there are two fixes:

```rust
v.iter().copied().filter(|x| x % 2 == 0)     // copied() turns &i32 into i32
v.iter().filter(|&&x| x % 2 == 0)            // destructure the references in the parameter pattern
```

## Zero cost

An iterator chain compiles to the same machine code as a hand-written loop: no temporary collections in between, no virtual calls. In Rust, iterators are not "elegance at the price of speed" — use them freely.

## Task

This level forbids `for`, `while` and `loop`; use iterator chains:

1. `squares_of_evens(nums)`: keep the even numbers and return their squares
2. `total_len(words)`: the sum of the lengths of all strings
3. `to_upper_all(words)`: convert every string to uppercase

:::hint
`squares_of_evens`: `nums.iter().copied().filter(|x| x % 2 == 0).map(|x| x * x).collect()`
:::

:::hint
`total_len`: `words.iter().map(|w| w.len()).sum()`

`to_upper_all`: `words.iter().map(|w| w.to_uppercase()).collect()`
:::

:::exercise
fn squares_of_evens(nums: &[i32]) -> Vec<i32> {
    todo!()
}

fn total_len(words: &[&str]) -> usize {
    todo!()
}

fn to_upper_all(words: &[&str]) -> Vec<String> {
    todo!()
}

fn main() {
    println!("{:?}", squares_of_evens(&[1, 2, 3, 4, 5, 6]));
    println!("{}", total_len(&["fearless", "concurrency"]));
    println!("{:?}", to_upper_all(&["zero", "cost"]));
}
:::

:::solution
fn squares_of_evens(nums: &[i32]) -> Vec<i32> {
    nums.iter().copied().filter(|x| x % 2 == 0).map(|x| x * x).collect()
}

fn total_len(words: &[&str]) -> usize {
    words.iter().map(|w| w.len()).sum()
}

fn to_upper_all(words: &[&str]) -> Vec<String> {
    words.iter().map(|w| w.to_uppercase()).collect()
}

fn main() {
    println!("{:?}", squares_of_evens(&[1, 2, 3, 4, 5, 6]));
    println!("{}", total_len(&["fearless", "concurrency"]));
    println!("{:?}", to_upper_all(&["zero", "cost"]));
}
:::

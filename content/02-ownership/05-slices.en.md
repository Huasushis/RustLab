---
title: Slices
---
A **slice** is a reference to a contiguous run of data: "pointer + length", owning nothing.

| Rust | Meaning | Closest thing in C++ |
| --- | --- | --- |
| `&[T]` | A contiguous run of `T` | `std::span<const T>` |
| `&str` | A run of UTF-8 text | `std::string_view` |

The difference: Rust slices are protected by the borrow checker and can never point at freed memory.

## Creating slices

```rust
let v = vec![10, 20, 30, 40, 50];
let a = &v[1..3];     // [20, 30], half-open, same as Python's v[1:3]
let b = &v[..2];      // [10, 20]
let c = &v[2..];      // [30, 40, 50]
let all = &v[..];     // a slice of the whole Vec

let s = String::from("hello world");
let hello = &s[0..5];   // "hello", of type &str
```

Out-of-range indexes panic. String slice indexes are **byte** positions and must fall on character boundaries (more on that in the next level).

## Prefer slices as parameters

```rust
fn sum(nums: &[i32]) -> i32 { ... }    // more general than &Vec<i32>
fn shout(s: &str) -> String { ... }    // more general than &String
```

`&Vec<T>` converts to `&[T]` automatically, and `&String` to `&str`, but not the other way round. With slice parameters, callers can pass a `Vec`, an array, a literal, or just part of one. The `&String` parameters in the previous level would idiomatically be `&str`.

By the way: a string literal `"hello"` has type `&str`; it points at read-only data compiled into the program.

## Task

1. `first_word(s)`: return everything before the first space, or the whole string if there's no space. `s.find(' ')` returns an `Option<usize>` (`None` when nothing is found); in this level you can handle it with `match` — see the hint
2. `sum_slice(nums)`: sum the numbers
3. `middle(nums)`: the slice without the first and last element; return an empty slice `&[]` if there are fewer than 2 elements

:::hint
```rust
match s.find(' ') {
    Some(i) => &s[..i],
    None => s,
}
```
`Option` and `match` are introduced properly in the next chapter; just use them as shown for now.
:::

:::hint
`sum_slice`: `let mut total = 0; for x in nums { total += x; } total`. Iterating over `&[i32]` gives `x: &i32`, and `+=` can add a reference directly.
:::

:::hint
`middle`: `if nums.len() < 2 { &[] } else { &nums[1..nums.len() - 1] }`
:::

:::exercise
/// Everything before the first space; the whole string if there is none
fn first_word(s: &str) -> &str {
    todo!()
}

fn sum_slice(nums: &[i32]) -> i32 {
    todo!()
}

/// Without the first and last element; empty if there are fewer than 2
fn middle(nums: &[i32]) -> &[i32] {
    todo!()
}

fn main() {
    let text = String::from("hello wonderful world");
    println!("first word: {}", first_word(&text));

    let v = vec![1, 2, 3, 4, 5];
    println!("sum of all: {}", sum_slice(&v));
    println!("sum of first three: {}", sum_slice(&v[..3]));
    println!("middle: {:?}", middle(&v));
}
:::

:::solution
/// Everything before the first space; the whole string if there is none
fn first_word(s: &str) -> &str {
    match s.find(' ') {
        Some(i) => &s[..i],
        None => s,
    }
}

fn sum_slice(nums: &[i32]) -> i32 {
    let mut total = 0;
    for x in nums {
        total += x;
    }
    total
}

/// Without the first and last element; empty if there are fewer than 2
fn middle(nums: &[i32]) -> &[i32] {
    if nums.len() < 2 {
        &[]
    } else {
        &nums[1..nums.len() - 1]
    }
}

fn main() {
    let text = String::from("hello wonderful world");
    println!("first word: {}", first_word(&text));

    let v = vec![1, 2, 3, 4, 5];
    println!("sum of all: {}", sum_slice(&v));
    println!("sum of first three: {}", sum_slice(&v[..3]));
    println!("middle: {:?}", middle(&v));
}
:::

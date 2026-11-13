---
title: Basic Types and Conversions
---
## Scalar types

| Kind | Types | Notes |
| --- | --- | --- |
| Signed integers | `i8` `i16` `i32` `i64` `i128` `isize` | Integer literals default to `i32` |
| Unsigned integers | `u8` `u16` `u32` `u64` `u128` `usize` | `usize` is for indexes and lengths, like `size_t` |
| Floating point | `f32` `f64` | Float literals default to `f64` |
| Boolean | `bool` | No implicit conversion to or from integers |
| Character | `char` | 4 bytes, one Unicode scalar value — not C's `char` |

The bit width is right there in the name; no more guessing how big a `long` is.

## No implicit conversions

This is the most common stumbling block coming from C++ or Python:

```rust
let a: i32 = 7;
let b: f64 = 2.0;
let c = a / b;          // ❌ can't mix types in arithmetic
let c = a as f64 / b;   // ✅ convert explicitly with as: 3.5
let d = 7 / 2;          // 3: integer division truncates, like C++ (Python's //)
```

Also, integer overflow **panics** in debug builds (the program stops with an error message) instead of silently wrapping or being undefined behavior as in C++.

## Tuples and arrays

```rust
let pair: (i32, &str) = (1, "one");
let (num, name) = pair;       // destructuring, like Python unpacking
let first = pair.0;           // access with .0 .1

let arr: [i32; 3] = [10, 20, 30];   // fixed-size array; the length is part of the type (like std::array)
let zeros = [0u8; 16];              // 16 zeros
let n = arr.len();                  // out-of-bounds indexing panics instead of reading garbage memory
```

## Task

Implement three functions (`todo!()` is a placeholder macro: it compiles, but panics when reached):

1. `average`: the current version doesn't compile — fix it, and make sure `average(1, 2)` returns `1.5`
2. `div_rem`: return a `(quotient, remainder)` tuple
3. `first_plus_last`: return the sum of the first and last elements of the array

:::hint
`average` returns `f64`, but `(a + b) / 2` is an `i32`. Convert to floating point **before** dividing: `(a + b) as f64 / 2.0`
:::

:::hint
Build a tuple with parentheses: `(a / b, a % b)`. The last element of an array is `arr[arr.len() - 1]`.
:::

:::exercise
/// The average of two integers; the result may have a fractional part
fn average(a: i32, b: i32) -> f64 {
    (a + b) / 2
}

/// Returns (quotient, remainder)
fn div_rem(a: u32, b: u32) -> (u32, u32) {
    todo!()
}

/// Returns the sum of the first and the last element
fn first_plus_last(arr: [i64; 5]) -> i64 {
    todo!()
}

fn main() {
    println!("average(1, 2) = {}", average(1, 2));
    let (q, r) = div_rem(17, 5);
    println!("17 / 5 = {q} remainder {r}");
    println!("first + last: {}", first_plus_last([1, 2, 3, 4, 5]));
}
:::

:::solution
/// The average of two integers; the result may have a fractional part
fn average(a: i32, b: i32) -> f64 {
    (a + b) as f64 / 2.0
}

/// Returns (quotient, remainder)
fn div_rem(a: u32, b: u32) -> (u32, u32) {
    (a / b, a % b)
}

/// Returns the sum of the first and the last element
fn first_plus_last(arr: [i64; 5]) -> i64 {
    arr[0] + arr[arr.len() - 1]
}

fn main() {
    println!("average(1, 2) = {}", average(1, 2));
    let (q, r) = div_rem(17, 5);
    println!("17 / 5 = {q} remainder {r}");
    println!("first + last: {}", first_plus_last([1, 2, 3, 4, 5]));
}
:::

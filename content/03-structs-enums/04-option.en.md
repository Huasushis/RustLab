---
title: Option — a World Without null
---
Rust has **no** `null` / `nullptr` / `None` that "any reference might be". "Maybe there's no value" is expressed with an ordinary enum:

```rust
enum Option<T> {
    Some(T),
    None,
}
```

`Option<i32>` and `i32` are **two different types**. To use the value inside, you have to handle the `None` case first, or it won't compile. "Forgot the null check" turns from a runtime crash into a compile error.

```rust
let v = vec![1, 2, 3];
let a: Option<&i32> = v.get(10);    // out of range gives None instead of panicking
let b: Option<char> = "".chars().next();
```

The counterparts: C++'s `std::optional<T>`; in Python, a value annotated `Optional[T]` — except that Rust forces you to check.

## Ways to handle an Option

```rust
let maybe: Option<i32> = Some(5);

// 1. match: the basic tool
let doubled = match maybe {
    Some(n) => n * 2,
    None => 0,
};

// 2. a default value
let n = maybe.unwrap_or(0);

// 3. "I'm sure there's a value" (panics otherwise). Only for prototypes or when None is truly impossible
let n = maybe.unwrap();
let n = maybe.expect("there must be a value here");

// 4. the ? operator: on None, return None from the current function right away
fn first_plus_one(v: &[i32]) -> Option<i32> {
    let first = v.first()?;     // returns None immediately if v is empty
    Some(first + 1)
}
```

There's also a set of combinators such as `map`, `and_then` and `filter`; they'll feel natural once you've learned closures (chapter 8).

`Some` and `None` can be used directly, without the `Option::` prefix.

## Task

1. `safe_div(a, b)`: return `None` when `b` is 0, otherwise `Some(a / b)`
2. `find_first_even(nums)`: return the first even number, or `None` if there isn't one
3. `get_or_zero(v, i)`: return the element at index `i`, or 0 if out of range. `v.get(i)` returns `Option<&i32>`; `.copied()` turns it into `Option<i32>`
4. `add_options(a, b)`: if both are `Some`, return their sum; if either is `None`, return `None`

:::hint
`safe_div`: `if b == 0 { None } else { Some(a / b) }`.

`find_first_even`: `for &n in nums { if n % 2 == 0 { return Some(n); } }`, and return `None` after the loop.
:::

:::hint
`get_or_zero`: `v.get(i).copied().unwrap_or(0)`
:::

:::hint
`add_options` can be written two ways. With `?`: `Some(a? + b?)`. Or by matching on a tuple:
```rust
match (a, b) {
    (Some(x), Some(y)) => Some(x + y),
    _ => None,
}
```
:::

:::exercise
fn safe_div(a: i32, b: i32) -> Option<i32> {
    todo!()
}

fn find_first_even(nums: &[i32]) -> Option<i32> {
    todo!()
}

/// The element at index i; 0 if out of range
fn get_or_zero(v: &[i32], i: usize) -> i32 {
    todo!()
}

/// Add only if both have a value
fn add_options(a: Option<i32>, b: Option<i32>) -> Option<i32> {
    todo!()
}

fn main() {
    println!("{:?} {:?}", safe_div(7, 2), safe_div(1, 0));
    println!("{:?}", find_first_even(&[1, 3, 8, 5, 6]));
    println!("{}", get_or_zero(&[10, 20], 5));
    println!("{:?}", add_options(Some(1), Some(2)));
}
:::

:::solution
fn safe_div(a: i32, b: i32) -> Option<i32> {
    if b == 0 { None } else { Some(a / b) }
}

fn find_first_even(nums: &[i32]) -> Option<i32> {
    for &n in nums {
        if n % 2 == 0 {
            return Some(n);
        }
    }
    None
}

/// The element at index i; 0 if out of range
fn get_or_zero(v: &[i32], i: usize) -> i32 {
    v.get(i).copied().unwrap_or(0)
}

/// Add only if both have a value
fn add_options(a: Option<i32>, b: Option<i32>) -> Option<i32> {
    Some(a? + b?)
}

fn main() {
    println!("{:?} {:?}", safe_div(7, 2), safe_div(1, 0));
    println!("{:?}", find_first_even(&[1, 3, 8, 5, 6]));
    println!("{}", get_or_zero(&[10, 20], 5));
    println!("{:?}", add_options(Some(1), Some(2)));
}
:::

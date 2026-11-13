---
title: Functions and Expressions
---
## Function signatures

```rust
fn add(a: i32, b: i32) -> i32 {
    a + b
}
```

Parameter and return types **must** be written out (only local variables inside the body are inferred). A function without `->` returns the "unit type" `()`, the equivalent of `void`.

## Rust is an expression language

Notice that `a + b` above has **no semicolon and no `return`**. In Rust:

- **Expressions** produce a value: `a + b`, `x * 2`, function calls, `if`, blocks `{ ... }` …
- **Statements** don't: `let x = 5;`, and any expression followed by a semicolon
- The **last expression without a semicolon** in a block is the value of the whole block — and a function body is a block

```rust
fn square(x: i32) -> i32 {
    x * x      // ✅ returns x * x
}

fn oops(x: i32) -> i32 {
    x * x;     // ❌ the semicolon makes it a statement; the function returns (), a type mismatch
}
```

`return` still exists, but it's mostly used for **returning early**.

## if is an expression too

So Rust doesn't need a ternary operator:

```rust
let abs = if x >= 0 { x } else { -x };          // like C++'s x >= 0 ? x : -x
let label = if score >= 60 { "pass" } else { "fail" };
```

Both branches must have the same type, and the condition must be a `bool` — `if x { ... }` with an integer `x` is a compile error.

## Task

1. `square` doesn't compile — fix it
2. Implement `abs_diff(a, b)`: return `|a - b|`; try an `if` expression
3. Implement `grade(score)`: `>= 90` returns `'A'`, `>= 75` returns `'B'`, `>= 60` returns `'C'`, anything else returns `'D'`

:::hint
`square` has one semicolon too many. Remove it so that `x * x` becomes the return value.
:::

:::hint
`if a > b { a - b } else { b - a }` is a single expression; make it the last line of the function. For `grade`, use an `if ... else if ... else` chain with a character literal like `'A'` in each branch.
:::

:::exercise
fn square(x: i32) -> i32 {
    x * x;
}

/// Returns the absolute difference of a and b
fn abs_diff(a: i32, b: i32) -> i32 {
    todo!()
}

/// Score to grade: >=90 A, >=75 B, >=60 C, otherwise D
fn grade(score: u32) -> char {
    todo!()
}

fn main() {
    println!("7 squared: {}", square(7));
    println!("|3 - 10| = {}", abs_diff(3, 10));
    println!("grade for 82: {}", grade(82));
}
:::

:::solution
fn square(x: i32) -> i32 {
    x * x
}

/// Returns the absolute difference of a and b
fn abs_diff(a: i32, b: i32) -> i32 {
    if a > b { a - b } else { b - a }
}

/// Score to grade: >=90 A, >=75 B, >=60 C, otherwise D
fn grade(score: u32) -> char {
    if score >= 90 {
        'A'
    } else if score >= 75 {
        'B'
    } else if score >= 60 {
        'C'
    } else {
        'D'
    }
}

fn main() {
    println!("7 squared: {}", square(7));
    println!("|3 - 10| = {}", abs_diff(3, 10));
    println!("grade for 82: {}", grade(82));
}
:::

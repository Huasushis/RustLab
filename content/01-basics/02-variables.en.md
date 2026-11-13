---
title: Variables and Mutability
---
## Immutable by default

```rust
let x = 5;
x = 6;          // ❌ compile error: cannot assign twice to immutable variable
let mut y = 5;  // add mut to make it changeable
y += 1;
```

In C++ you opt *in* to immutability with `const`. Rust is the other way round: **you opt in to mutability with `mut`**. When reading code, you can tell at a glance which values change.

Types are usually inferred, but you can annotate them: `let x: i64 = 5;`. Rust is statically and strongly typed: once a variable has a type, it never changes (unlike Python).

## Shadowing

You can use `let` again to declare a **new variable with the same name**, and the new one can even have a different type:

```rust
let input = "42";                         // &str
let input: i32 = input.parse().unwrap();  // a new input, of type i32
let input = input * 2;                    // yet another input
```

This isn't mutation: it creates a new variable that hides the old one. It's handy for "keep the same name after parsing / converting", so you don't need names like `input_str` and `input_num`.

## Constants

```rust
const MAX_SCORE: u32 = 100;   // the type is required, and the value must be known at compile time
```

## Task

Both functions on the right **don't compile**. Fix them:

1. `sum_to(n)`: computes `1 + 2 + … + n`
2. `parse_and_double(input)`: parses a string such as `" 21 "` into an integer and doubles it

Rust's compiler errors can look long the first time, but do read them: they point at the exact spot and often **tell you how to fix it** (look for the `help:` line). Click "Run" and look at the "Problems" panel.

:::hint
`total` in `sum_to` gets modified, so declare it as `let mut total = 0;`
:::

:::hint
In `parse_and_double`, `value` is a `&str` and can't be multiplied by 2. Shadow it with an integer:
`let value: i32 = value.parse().unwrap();`
:::

:::exercise
fn sum_to(n: u32) -> u32 {
    let total = 0;
    for i in 1..=n {
        total += i;
    }
    total
}

fn parse_and_double(input: &str) -> i32 {
    let value = input.trim(); // strip surrounding whitespace; value is still a string
    // TODO: shadow value with the parsed i32
    value * 2
}

fn main() {
    println!("sum of 1 to 10: {}", sum_to(10));
    println!("\" 21 \" doubled: {}", parse_and_double(" 21 "));
}
:::

:::solution
fn sum_to(n: u32) -> u32 {
    let mut total = 0;
    for i in 1..=n {
        total += i;
    }
    total
}

fn parse_and_double(input: &str) -> i32 {
    let value = input.trim();
    let value: i32 = value.parse().unwrap();
    value * 2
}

fn main() {
    println!("sum of 1 to 10: {}", sum_to(10));
    println!("\" 21 \" doubled: {}", parse_and_double(" 21 "));
}
:::

---
title: Trait Bounds
---
Combine generics with traits: use a trait to state "what this type parameter must be able to do". There are three ways to write the same thing:

```rust
use std::fmt::Display;

// 1. bound inside the angle brackets
fn show<T: Display>(item: T) -> String {
    format!("<{item}>")
}

// 2. impl Trait syntax: the parameter is "some type implementing Display"; shorthand for 1
fn show(item: impl Display) -> String {
    format!("<{item}>")
}

// 3. a where clause: clearer when there are many bounds
fn show_both<T, U>(a: T, b: U) -> String
where
    T: Display + Clone,
    U: Display,
{
    format!("{a} {b}")
}
```

All three use **static dispatch**: the compiler generates code per concrete type, and calls can be inlined.

`impl Trait` also works in return position, meaning "returns some concrete type implementing this trait, but I won't say which". It's common for returning closures and iterators (chapter 8):

```rust
fn evens() -> impl Iterator<Item = u32> {
    (0..).step_by(2)
}
```

## Let the compiler tell you which bounds to add

The everyday workflow for generic code: write the body, compile, read the error, add bounds as suggested. For example:

```text
error[E0599]: the method `to_string` exists for reference `&T`, but its trait bounds were not satisfied
   = note: the following trait bounds were not satisfied: `T: std::fmt::Display`
help: consider restricting the type parameter to satisfy the trait bound
```

That's what this level practises. You'll need these bounds:

| Trait | Capability |
| --- | --- |
| `Display` | format with `{}`, `.to_string()` |
| `Clone` | `.clone()`, `.to_vec()` |
| `Ord` | total ordering, required by `.sort()` |

## Task

The **bodies of all three functions are correct**; only their signatures are missing bounds or aren't general enough. Change only the signatures:

1. `join_all`: format every element and join them with `sep`
2. `sorted_copy`: return a sorted copy without modifying the original slice
3. `total_area`: currently only accepts two `Circle`s; make it accept **any two** types implementing `Area` (the two may be different types)

:::hint
`join_all<T: Display>`: because the body calls `item.to_string()`.
:::

:::hint
`sorted_copy<T: Ord + Clone>`: `to_vec()` needs `Clone`, and `sort()` needs `Ord`.
:::

:::hint
`fn total_area(a: &impl Area, b: &impl Area) -> f64`. Each `impl Area` is a separate type parameter, so `a` and `b` can have different types. The equivalent long form is `fn total_area<A: Area, B: Area>(a: &A, b: &B) -> f64`.
:::

:::exercise
use std::fmt::Display;

/// Format every element and join them with sep
fn join_all<T>(items: &[T], sep: &str) -> String {
    let mut out = String::new();
    for (i, item) in items.iter().enumerate() {
        if i > 0 {
            out.push_str(sep);
        }
        out.push_str(&item.to_string());
    }
    out
}

/// Return a sorted copy
fn sorted_copy<T>(items: &[T]) -> Vec<T> {
    let mut out = items.to_vec();
    out.sort();
    out
}

trait Area {
    fn area(&self) -> f64;
}

struct Circle(f64);
struct Square(f64);

impl Area for Circle {
    fn area(&self) -> f64 {
        std::f64::consts::PI * self.0 * self.0
    }
}

impl Area for Square {
    fn area(&self) -> f64 {
        self.0 * self.0
    }
}

fn total_area(a: &Circle, b: &Circle) -> f64 {
    a.area() + b.area()
}

fn main() {
    println!("{}", join_all(&[1, 2, 3], " + "));
    println!("{:?}", sorted_copy(&["pear", "apple", "fig"]));
    println!("{:.2}", total_area(&Circle(1.0), &Square(2.0)));
}
:::

:::solution
use std::fmt::Display;

/// Format every element and join them with sep
fn join_all<T: Display>(items: &[T], sep: &str) -> String {
    let mut out = String::new();
    for (i, item) in items.iter().enumerate() {
        if i > 0 {
            out.push_str(sep);
        }
        out.push_str(&item.to_string());
    }
    out
}

/// Return a sorted copy
fn sorted_copy<T: Ord + Clone>(items: &[T]) -> Vec<T> {
    let mut out = items.to_vec();
    out.sort();
    out
}

trait Area {
    fn area(&self) -> f64;
}

struct Circle(f64);
struct Square(f64);

impl Area for Circle {
    fn area(&self) -> f64 {
        std::f64::consts::PI * self.0 * self.0
    }
}

impl Area for Square {
    fn area(&self) -> f64 {
        self.0 * self.0
    }
}

fn total_area(a: &impl Area, b: &impl Area) -> f64 {
    a.area() + b.area()
}

fn main() {
    println!("{}", join_all(&[1, 2, 3], " + "));
    println!("{:?}", sorted_copy(&["pear", "apple", "fig"]));
    println!("{:.2}", total_area(&Circle(1.0), &Square(2.0)));
}
:::

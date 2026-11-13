---
title: Generics
---
Generics let one piece of code work with many types. You've been using them for a while: `Vec<T>`, `Option<T>` and `Result<T, E>` are all generic types.

```rust
fn first<T>(items: &[T]) -> Option<&T> {    // <T> declares a type parameter
    items.first()
}

struct Pair<T> {
    a: T,
    b: T,
}

impl<T> Pair<T> {                            // impl declares <T> too
    fn new(a: T, b: T) -> Self {
        Pair { a, b }
    }
}
```

## Compared with C++ templates

**Same**: both are **monomorphized** at compile time. The compiler generates specialized code for every concrete type used, with zero runtime cost — the famous "zero-cost abstraction".

**Different**: C++ templates are duck-typed. The template body can do anything with `T` and is only checked when instantiated, which is why the errors are so long and cryptic. Rust requires you to **declare up front what `T` must be able to do**, with a **trait bound**:

```rust
fn largest<T>(a: T, b: T) -> T {
    if a > b { a } else { b }      // ❌ not every type can be compared
}

fn largest<T: PartialOrd>(a: T, b: T) -> T {   // ✅ T must implement PartialOrd
    if a > b { a } else { b }
}
```

A generic function body may only use what its bounds promise, so if it compiles on its own, it is correct for every type that satisfies the bounds. (C++20 concepts follow the same idea.)

The bounds used in this level:

| Trait | Capability |
| --- | --- |
| `PartialOrd` | compare with `<` `>` |
| `Copy` | bitwise copy; the original stays usable after assignment |

Combine several bounds with `+`: `T: PartialOrd + Copy`. Traits are covered systematically starting from the next level.

## Task

1. `largest` only works with `i32`; make it generic so it also works with `f64`, `char` and so on
2. `Pair` only holds `i32`; make it a generic struct and keep the `swap` method

:::hint
Change the signature of `largest` to `fn largest<T: PartialOrd + Copy>(items: &[T]) -> Option<T>`; the body doesn't change at all. `Copy` is needed because `*items.first()?` and `for &x in items` copy elements out of the slice.
:::

:::hint
```rust
struct Pair<T> {
    a: T,
    b: T,
}

impl<T> Pair<T> {
    fn swap(self) -> Pair<T> {
        Pair { a: self.b, b: self.a }
    }
}
```
:::

:::exercise
/// Returns the largest element of the slice; None if it is empty
fn largest(items: &[i32]) -> Option<i32> {
    let mut best = *items.first()?;
    for &x in items {
        if x > best {
            best = x;
        }
    }
    Some(best)
}

struct Pair {
    a: i32,
    b: i32,
}

impl Pair {
    /// Swap the two elements
    fn swap(self) -> Pair {
        Pair { a: self.b, b: self.a }
    }
}

fn main() {
    println!("{:?}", largest(&[3, 9, 2]));
    let p = Pair { a: 1, b: 2 }.swap();
    println!("({}, {})", p.a, p.b);
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn largest_is_generic() {
        assert_eq!(largest(&[3, 9, 2]), Some(9));
        assert_eq!(largest(&[1.5, 0.2, -3.0]), Some(1.5));
        assert_eq!(largest(&['r', 'u', 's', 't']), Some('u'));
        assert_eq!(largest::<u8>(&[]), None);
    }

    #[test]
    fn pair_is_generic() {
        let p = Pair { a: 1, b: 2 }.swap();
        assert_eq!((p.a, p.b), (2, 1));
        let q = Pair { a: "left", b: "right" }.swap();
        assert_eq!((q.a, q.b), ("right", "left"));
        let s = Pair { a: String::from("x"), b: String::from("y") }.swap();
        assert_eq!(s.a, "y");
    }
}
:::

:::solution
/// Returns the largest element of the slice; None if it is empty
fn largest<T: PartialOrd + Copy>(items: &[T]) -> Option<T> {
    let mut best = *items.first()?;
    for &x in items {
        if x > best {
            best = x;
        }
    }
    Some(best)
}

struct Pair<T> {
    a: T,
    b: T,
}

impl<T> Pair<T> {
    /// Swap the two elements
    fn swap(self) -> Pair<T> {
        Pair { a: self.b, b: self.a }
    }
}

fn main() {
    println!("{:?}", largest(&[3, 9, 2]));
    let p = Pair { a: 1, b: 2 }.swap();
    println!("({}, {})", p.a, p.b);
}
:::

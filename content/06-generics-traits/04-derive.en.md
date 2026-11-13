---
title: Common Traits in the Standard Library
---
Many Rust "language features" are actually traits: operators, printing, comparison, copying, hashing… To give your type one of these abilities, implement the matching trait.

## Derivable traits

As long as every field supports them, the compiler can generate these for you:

| Trait | What you get | Analogy |
| --- | --- | --- |
| `Debug` | `{:?}` printing | `__repr__` |
| `Clone` | `.clone()` | copy constructor |
| `Copy` | copy on assignment (requires `Clone`) | trivially copyable types |
| `PartialEq` / `Eq` | `==` `!=` | `operator==` / `__eq__` |
| `PartialOrd` / `Ord` | `<` `>`, sorting (compares fields in order) | `operator<=>` |
| `Hash` | usable as a `HashMap` key or in a `HashSet` | `std::hash` / `__hash__` |
| `Default` | `T::default()` gives a default value | default constructor |

```rust
#[derive(Debug, Clone, PartialEq, Default)]
struct Config {
    name: String,
    retries: u32,
}
```

`PartialEq` vs `Eq`: `Eq` additionally promises "a value always equals itself". Floats only have `PartialEq` because `NaN != NaN`, so types with float fields can't derive `Eq` or `Hash`.

## Traits you write by hand

**`Display`**: the user-facing format. There's no obviously correct default, so it has to be written by hand (you already did this for an error type in chapter 5).

**Operator overloading**: each operator corresponds to a trait in `std::ops`.

```rust
use std::ops::Add;

impl Add for Meters {
    type Output = Meters;                   // associated type: the type of the result
    fn add(self, other: Meters) -> Meters {
        Meters(self.0 + other.0)
    }
}
// now Meters(1.0) + Meters(2.0) works
```

Compared with C++'s `operator+`: Rust lets you overload only this fixed set of operators. You can't invent new ones, and you can't overload assignment, `&&` or `||`.

**`From` / `Into`**: conversions. Implement `From<A> for B` and both `B::from(a)` and `a.into()` work (you used it to convert error types in chapter 5).

## Task

Make the 2-D integer vector `Vec2` feel like a built-in type:

1. Add the right `derive`s so that it supports `{:?}`, copy on assignment, `==`, being put into a `HashSet`, and `Vec2::default()`
2. Implement `Add` so two vectors can be added with `+`
3. Implement `Display` to print something like `(1, 2)`

:::hint
`#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Default)]`. A `HashSet` needs both `Eq` and `Hash`.
:::

:::hint
```rust
impl Add for Vec2 {
    type Output = Vec2;
    fn add(self, other: Vec2) -> Vec2 {
        Vec2 { x: self.x + other.x, y: self.y + other.y }
    }
}
```
:::

:::hint
```rust
impl fmt::Display for Vec2 {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}
```
:::

:::exercise
use std::fmt;
use std::ops::Add;

// TODO: add the derives you need
struct Vec2 {
    x: i32,
    y: i32,
}

// TODO: impl Add for Vec2

// TODO: impl fmt::Display for Vec2

fn main() {
    let a = Vec2 { x: 1, y: 2 };
    let b = Vec2 { x: 3, y: 4 };
    let c = a + b;
    println!("{a} + {b} = {c}");
    println!("{c:?}, equal to (4, 6): {}", c == Vec2 { x: 4, y: 6 });
    println!("default: {}", Vec2::default());
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn add_and_eq() {
        let a = Vec2 { x: 1, y: 2 };
        let b = Vec2 { x: 3, y: 4 };
        assert_eq!(a + b, Vec2 { x: 4, y: 6 });
        // a and b are still usable after adding, so Vec2 is Copy
        assert_eq!(a + a, Vec2 { x: 2, y: 4 });
        assert_ne!(a, b);
    }

    #[test]
    fn display_and_debug() {
        let v = Vec2 { x: -1, y: 20 };
        assert_eq!(format!("{v}"), "(-1, 20)");
        assert_eq!(format!("{v:?}"), "Vec2 { x: -1, y: 20 }");
    }

    #[test]
    fn default_is_origin() {
        assert_eq!(Vec2::default(), Vec2 { x: 0, y: 0 });
    }

    #[test]
    fn usable_in_hash_set() {
        let mut seen = HashSet::new();
        seen.insert(Vec2 { x: 1, y: 1 });
        seen.insert(Vec2 { x: 1, y: 1 });
        seen.insert(Vec2 { x: 2, y: 1 });
        assert_eq!(seen.len(), 2);
    }
}
:::

:::solution
use std::fmt;
use std::ops::Add;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Default)]
struct Vec2 {
    x: i32,
    y: i32,
}

impl Add for Vec2 {
    type Output = Vec2;

    fn add(self, other: Vec2) -> Vec2 {
        Vec2 { x: self.x + other.x, y: self.y + other.y }
    }
}

impl fmt::Display for Vec2 {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}

fn main() {
    let a = Vec2 { x: 1, y: 2 };
    let b = Vec2 { x: 3, y: 4 };
    let c = a + b;
    println!("{a} + {b} = {c}");
    println!("{c:?}, equal to (4, 6): {}", c == Vec2 { x: 4, y: 6 });
    println!("default: {}", Vec2::default());
}
:::

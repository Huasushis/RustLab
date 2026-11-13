---
title: Clone and Copy
---
The last level said "assignment moves", but you may have noticed integers don't behave that way:

```rust
let a = 5;
let b = a;
println!("{a} {b}");   // ✅ fine
```

## Copy: types where a bitwise copy is enough

Integers, floats, `bool`, `char`, and tuples and arrays made only of those implement the `Copy` trait. They live entirely on the stack and are extremely cheap to duplicate, so assignment **copies** them and the old variable stays usable.

Your own types are **not** `Copy` by default. If every field is `Copy`, you can ask the compiler to implement it:

```rust
#[derive(Debug, Clone, Copy)]
struct Point {
    x: i32,
    y: i32,
}
```

`#[derive(...)]` makes the compiler generate trait implementations (traits are like interfaces; there's a whole chapter on them later). `Copy` requires `Clone`, so the two always go together.

## Clone: an explicit deep copy

Types that own heap memory, like `String` and `Vec`, can't be `Copy`. If you want an independent copy you have to **say so**:

```rust
let s1 = String::from("hello");
let s2 = s1.clone();       // the heap data is copied in full
println!("{s1} {s2}");     // ✅ both usable
```

Rust's philosophy: **expensive operations must be visible in the code**. In C++ an innocent-looking `=` can trigger a deep copy; in Rust, wherever there's no `.clone()`, no heap copy happened.

> Adding `.clone()` whenever you hit an ownership error is perfectly fine while learning. Once you've learned borrowing, you'll see which clones can go.

## Task

1. Add the right `derive` to `Point` so it can still be used after being passed to `mirror`
2. Fix `duplicate`: return two copies of the same string

:::hint
Change `#[derive(Debug)]` to `#[derive(Debug, Clone, Copy)]`, and `Point` becomes a "copy on assignment" type.
:::

:::hint
`(s, s)` moves `s` twice. Make one of them a copy: `(s.clone(), s)`. The order matters — if you moved first and cloned second, `s` would already be gone when you clone it.
:::

:::exercise
#[derive(Debug)]
struct Point {
    x: i32,
    y: i32,
}

/// Mirror across the y axis
fn mirror(p: Point) -> Point {
    Point { x: -p.x, y: p.y }
}

/// Returns two copies of the same string
fn duplicate(s: String) -> (String, String) {
    (s, s)
}

fn main() {
    let p = Point { x: 3, y: 4 };
    let q = mirror(p);
    println!("the mirror image of {p:?} is {q:?}");
    println!("{:?}", duplicate(String::from("ab")));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn point_is_copy() {
        let p = Point { x: 3, y: 4 };
        let q = mirror(p);
        // if Point weren't Copy, using p below would not compile
        assert_eq!((p.x, p.y), (3, 4));
        assert_eq!((q.x, q.y), (-3, 4));
    }

    #[test]
    fn duplicate_works() {
        let (a, b) = duplicate(String::from("ab"));
        assert_eq!(a, "ab");
        assert_eq!(b, "ab");
    }
}
:::

:::solution
#[derive(Debug, Clone, Copy)]
struct Point {
    x: i32,
    y: i32,
}

/// Mirror across the y axis
fn mirror(p: Point) -> Point {
    Point { x: -p.x, y: p.y }
}

/// Returns two copies of the same string
fn duplicate(s: String) -> (String, String) {
    (s.clone(), s)
}

fn main() {
    let p = Point { x: 3, y: 4 };
    let q = mirror(p);
    println!("the mirror image of {p:?} is {q:?}");
    println!("{:?}", duplicate(String::from("ab")));
}
:::

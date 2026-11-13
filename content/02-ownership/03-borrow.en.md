---
title: Borrowing — Shared References
---
Moving ownership in and back out (level 1) is clumsy, and cloning every time (level 2) is wasteful. Most of the time a function just wants to **look** at the data. That's **borrowing**:

```rust
fn len_of(s: &String) -> usize {   // the parameter is "a reference to a String"
    s.len()
}

let s = String::from("hello");
let n = len_of(&s);       // &s creates a reference; s keeps ownership
println!("{s} has length {n}");   // ✅ s is still usable
```

`&T` reads as "a shared reference to T". It borrows the value without owning it; when the reference goes out of scope, nothing is freed.

## How it differs from C++ references / pointers

- Creating a reference requires an **explicit `&`** (C++ references are invisible at the call site). When you see `foo(&x)`, you know immediately that `x` is only borrowed.
- References are **always valid**: the compiler guarantees a reference never outlives the data it points to. There are no dangling references and no null references.
- `&T` is **read-only** by default, like `const T&`. Modifying needs `&mut T` (next level).

## Auto-dereferencing

Calling methods or accessing fields through a reference doesn't need `*` or `->`; it's always `.`:

```rust
let r = &s;
r.len();        // no need for (*r).len()
```

You only need `*` when you want the **value itself** behind the reference, e.g. `let n: i32 = *r + 1;`.

## Task

`total_len` currently takes ownership of both strings, so `main` can't use them afterwards.

1. Change `total_len` to **borrow** its parameters, and update the call in `main`
2. Implement `is_longer(a, b)`: return `true` when `a` is longer than `b`

This level forbids `.clone()`.

:::hint
Change the signature to `fn total_len(a: &String, b: &String) -> usize`; the body stays the same.
:::

:::hint
Pass references at the call site: `total_len(&a, &b)`. The body of `is_longer` is `a.len() > b.len()`.
:::

:::exercise
/// Total length of two strings (in bytes)
fn total_len(a: String, b: String) -> usize {
    a.len() + b.len()
}

/// Is a longer than b?
fn is_longer(a: &String, b: &String) -> bool {
    todo!()
}

fn main() {
    let a = String::from("hello");
    let b = String::from("rust");
    let n = total_len(a, b);
    println!("{a} and {b} have {n} bytes in total");
    println!("is {a} longer than {b}? {}", is_longer(&a, &b));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn total_len_borrows() {
        let a = String::from("ab");
        let b = String::from("cde");
        assert_eq!(total_len(&a, &b), 5);
        // the original variables are still usable after borrowing
        assert_eq!(a, "ab");
        assert_eq!(b, "cde");
    }

    #[test]
    fn is_longer_works() {
        let a = String::from("hello");
        let b = String::from("rust");
        assert!(is_longer(&a, &b));
        assert!(!is_longer(&b, &a));
        assert!(!is_longer(&a, &a));
    }
}
:::

:::solution
/// Total length of two strings (in bytes)
fn total_len(a: &String, b: &String) -> usize {
    a.len() + b.len()
}

/// Is a longer than b?
fn is_longer(a: &String, b: &String) -> bool {
    a.len() > b.len()
}

fn main() {
    let a = String::from("hello");
    let b = String::from("rust");
    let n = total_len(&a, &b);
    println!("{a} and {b} have {n} bytes in total");
    println!("is {a} longer than {b}? {}", is_longer(&a, &b));
}
:::

---
title: Mutable Borrows and the Borrowing Rules
---
## &mut: mutable references

```rust
fn shout(s: &mut String) {
    s.push_str("!!!");
}

let mut s = String::from("hey");   // 1. the variable itself must be mut
shout(&mut s);                     // 2. borrow with &mut
println!("{s}");                   // hey!!!
```

Mutability is spelled out in three places: the variable declaration, creating the reference, and the function signature. When reading code, you can see exactly where data might change.

## The borrowing rules

At any given time, for a given piece of data, you can have **either** any number of shared references `&T`, **or** exactly one mutable reference `&mut T` — never both.

In short: **shared means read-only; mutable means exclusive**.

```rust
let mut v = vec![1, 2, 3];
let first = &v[0];      // shared borrow of v
v.push(4);              // ❌ needs a mutable borrow of v, but first is still alive
println!("{first}");
```

Why so strict? `push` may reallocate the `Vec`, leaving `first` dangling. In C++ this is **iterator invalidation**, classic undefined behavior; Rust rejects it at compile time. The same rule also rules out data races between threads (chapter 12).

## A borrow lasts until its last use

```rust
let mut v = vec![1, 2, 3];
let first = &v[0];
println!("{first}");    // last use of first; the borrow ends here
v.push(4);              // ✅ a mutable borrow is fine now
```

So the most common fix for a borrow conflict is to **reorder the code** so the earlier borrow is done first, or to **copy the value out instead of holding a reference** (for `Copy` types).

## Modifying through &mut

```rust
fn reset(x: &mut i32) {
    *x = 0;             // dereference with * to assign to the value behind the reference
}
```

## Task

1. Fix `append_exclaim` and its call in `main`
2. Implement `double_all`: double every number in the `Vec`. `for x in v.iter_mut()` yields a `&mut i32` for each element
3. Fix the borrow conflict between `first` and `push` in `main` so the program prints `first = 1`

:::hint
Change the parameter of `append_exclaim` to `s: &mut String`; in `main`, change it to `let mut s = ...` and `append_exclaim(&mut s)`.
:::

:::hint
The body of `double_all`: `for x in v.iter_mut() { *x *= 2; }`
:::

:::hint
There are two ways to fix the conflict: move `println!("first = {first}")` above `v.push(4)`, or change `let first = &v[0];` to `let first = v[0];` (`i32` is `Copy`, so copying it out means there's no borrow at all).
:::

:::exercise
/// Append an exclamation mark to the string
fn append_exclaim(s: &String) {
    s.push('!');
}

/// Double every element
fn double_all(v: &mut Vec<i32>) {
    todo!()
}

fn main() {
    let s = String::from("hi");
    append_exclaim(&s);
    println!("{s}");

    let mut v = vec![1, 2, 3];
    let first = &v[0];
    v.push(4);
    println!("first = {first}");

    double_all(&mut v);
    println!("{v:?}");
}
:::

:::solution
/// Append an exclamation mark to the string
fn append_exclaim(s: &mut String) {
    s.push('!');
}

/// Double every element
fn double_all(v: &mut Vec<i32>) {
    for x in v.iter_mut() {
        *x *= 2;
    }
}

fn main() {
    let mut s = String::from("hi");
    append_exclaim(&mut s);
    println!("{s}");

    let mut v = vec![1, 2, 3];
    let first = v[0];
    v.push(4);
    println!("first = {first}");

    double_all(&mut v);
    println!("{v:?}");
}
:::

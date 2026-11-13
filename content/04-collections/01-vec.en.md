---
title: Vec — the Growable Array
---
`Vec<T>` is the most-used collection, the counterpart of C++'s `std::vector<T>` and Python's `list` (but all elements must have the same type).

```rust
let mut v: Vec<i32> = Vec::new();
v.push(1);
v.push(2);
let v2 = vec![10, 20, 30];        // the vec! macro initializes directly
let zeros = vec![0; 5];           // [0, 0, 0, 0, 0]

let last: Option<i32> = v.pop();  // removes the last element; None when empty
v.len();
v.is_empty();
```

## Two ways to read an element

```rust
let third = v2[2];              // panics if out of range
let maybe = v2.get(7);          // returns Option<&i32>; None when out of range
```

Use `[]` when the index is certainly valid, and `get` when the index comes from outside input.

## Three ways to iterate

This is ownership applied to collections — worth memorizing:

```rust
for x in &v { }        // x: &i32      read-only borrow; v is still there afterwards
for x in &mut v { }    // x: &mut i32  modify elements through *x
for x in v { }         // x: i32       takes ownership; v can't be used afterwards
```

## Common methods

```rust
v.contains(&3);                 // membership
v.sort();                       // sort in place
v.retain(|x| *x > 0);           // keep only matching elements; |x| ... is a closure, chapter 8
v.insert(0, 99);                // insert at a position, O(n)
v.remove(0);                    // remove and return the element at a position, O(n)
v.extend([7, 8, 9]);            // append several elements
v.first(); v.last();            // first / last element, as Option<&T>
```

## Task

1. `evens_below(n)`: return all non-negative even numbers less than `n`, in increasing order
2. `remove_negatives(v)`: remove all negative numbers in place
3. `max_of(v)`: return the maximum, or `None` for an empty slice (write the loop yourself)

:::hint
`evens_below`: create an empty `Vec`, `for i in 0..n { if i % 2 == 0 { v.push(i); } }`, then return it. Or: `(0..n).step_by(2).collect()`.
:::

:::hint
`remove_negatives`: `v.retain(|x| *x >= 0);`
:::

:::hint
`max_of`: take the first element with `let mut best = *v.first()?;` (for an empty slice `?` returns `None` right away), then loop `for &x in v`, update `best` when you find something bigger, and return `Some(best)`.
:::

:::exercise
/// All non-negative even numbers less than n
fn evens_below(n: u32) -> Vec<u32> {
    todo!()
}

/// Remove all negative numbers in place
fn remove_negatives(v: &mut Vec<i32>) {
    todo!()
}

/// The maximum; None for an empty slice
fn max_of(v: &[i32]) -> Option<i32> {
    todo!()
}

fn main() {
    println!("{:?}", evens_below(10));
    let mut v = vec![3, -1, 4, -1, 5, -9, 2, 6];
    remove_negatives(&mut v);
    println!("{v:?}");
    println!("max: {:?}", max_of(&v));
}
:::

:::solution
/// All non-negative even numbers less than n
fn evens_below(n: u32) -> Vec<u32> {
    let mut v = Vec::new();
    for i in 0..n {
        if i % 2 == 0 {
            v.push(i);
        }
    }
    v
}

/// Remove all negative numbers in place
fn remove_negatives(v: &mut Vec<i32>) {
    v.retain(|x| *x >= 0);
}

/// The maximum; None for an empty slice
fn max_of(v: &[i32]) -> Option<i32> {
    let mut best = *v.first()?;
    for &x in v {
        if x > best {
            best = x;
        }
    }
    Some(best)
}

fn main() {
    println!("{:?}", evens_below(10));
    let mut v = vec![3, -1, 4, -1, 5, -9, 2, 6];
    remove_negatives(&mut v);
    println!("{v:?}");
    println!("max: {:?}", max_of(&v));
}
:::

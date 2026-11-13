---
title: Threads
---
```rust
use std::thread;

let handle = thread::spawn(|| {
    // runs on a new thread
    42
});
let answer = handle.join().unwrap();   // wait for the thread and get the closure's return value
```

`thread::spawn` creates an operating-system thread (like C++'s `std::thread`). It returns a `JoinHandle`; `join()` blocks until the thread finishes and hands back the closure's return value — more convenient than C++, where you need shared variables or a `std::future` to get a result out. If the thread panicked, `join()` returns `Err`.

Unlike Python, Rust has no GIL: threads really run in parallel on multiple CPU cores.

## move: hand data to the thread

```rust
let name = String::from("worker");
let h = thread::spawn(move || {
    println!("I am {name}");      // name was moved into the thread
});
```

Without `move`, the compiler refuses: the new thread might outlive the current function, so borrowing its locals isn't safe. In C++, a lambda capturing a soon-to-die local by reference and handed to a thread is a classic bug that compiles and occasionally crashes; Rust simply won't compile it.

## Scoped threads: threads that can borrow

If you can guarantee every thread finishes before the function returns, borrowing is safe. `thread::scope` gives exactly that guarantee:

```rust
let data = vec![1, 2, 3, 4];
let (left, right) = data.split_at(2);
let total = thread::scope(|s| {
    let a = s.spawn(|| left.iter().sum::<i32>());     // borrows left directly, no move or copy
    let b = s.spawn(|| right.iter().sum::<i32>());
    a.join().unwrap() + b.join().unwrap()
});   // when scope ends, every thread spawned in it is guaranteed to have finished
```

## Task

1. `spawn_squares(n)`: start one thread per `i` in `0..n` to compute `i * i`, and return all results in order of `i`. Collect all the `JoinHandle`s into a `Vec` first, then `join` them one by one
2. `parallel_sum(data, parts)`: with `thread::scope`, split the slice into at most `parts` chunks, sum each chunk on its own thread, and add up the results. `data.chunks(size)` splits a slice into fixed-size chunks

:::hint
`spawn_squares`:
```rust
let handles: Vec<_> = (0..n).map(|i| thread::spawn(move || i * i)).collect();
handles.into_iter().map(|h| h.join().unwrap()).collect()
```
`move` gives each thread its own copy of `i`.
:::

:::hint
For `parallel_sum`, compute the chunk size first (rounded up, and at least 1): `let size = data.len().div_ceil(parts.max(1)).max(1);`
:::

:::hint
```rust
thread::scope(|s| {
    let handles: Vec<_> = data.chunks(size).map(|chunk| s.spawn(move || chunk.iter().sum::<i64>())).collect();
    handles.into_iter().map(|h| h.join().unwrap()).sum()
})
```
:::

:::exercise
use std::thread;

/// One thread per i computing i*i, returned in order
fn spawn_squares(n: u64) -> Vec<u64> {
    todo!()
}

/// Split data into at most parts chunks and sum them in parallel
fn parallel_sum(data: &[i64], parts: usize) -> i64 {
    todo!()
}

fn main() {
    println!("{:?}", spawn_squares(6));
    let data: Vec<i64> = (1..=1000).collect();
    println!("{}", parallel_sum(&data, 4));
}
:::

:::solution
use std::thread;

/// One thread per i computing i*i, returned in order
fn spawn_squares(n: u64) -> Vec<u64> {
    let handles: Vec<_> = (0..n).map(|i| thread::spawn(move || i * i)).collect();
    handles.into_iter().map(|h| h.join().unwrap()).collect()
}

/// Split data into at most parts chunks and sum them in parallel
fn parallel_sum(data: &[i64], parts: usize) -> i64 {
    let size = data.len().div_ceil(parts.max(1)).max(1);
    thread::scope(|s| {
        let handles: Vec<_> = data.chunks(size).map(|chunk| s.spawn(move || chunk.iter().sum::<i64>())).collect();
        handles.into_iter().map(|h| h.join().unwrap()).sum()
    })
}

fn main() {
    println!("{:?}", spawn_squares(6));
    let data: Vec<i64> = (1..=1000).collect();
    println!("{}", parallel_sum(&data, 4));
}
:::

---
title: Arc and Mutex — Shared State
---
When several threads modify the same data, you need two things:

1. **Several owners**: every thread holds on to the data
2. **Mutual exclusion**: only one thread modifies it at a time

On a single thread this is chapter 9's `Rc<RefCell<T>>`. The multi-threaded version is `Arc<Mutex<T>>`:

| Single thread | Multiple threads | Difference |
| --- | --- | --- |
| `Rc<T>` | `Arc<T>` | Atomic RC: the count is updated atomically |
| `RefCell<T>` | `Mutex<T>` | on conflict it blocks and waits instead of panicking |

```rust
use std::sync::{Arc, Mutex};
use std::thread;

let counter = Arc::new(Mutex::new(0));
let mut handles = vec![];
for _ in 0..4 {
    let counter = Arc::clone(&counter);         // one Arc per thread
    handles.push(thread::spawn(move || {
        let mut n = counter.lock().unwrap();    // lock, getting a "lock guard"
        *n += 1;
    }));                                        // the guard unlocks automatically when it goes out of scope
}
for h in handles { h.join().unwrap(); }
println!("{}", *counter.lock().unwrap());       // 4
```

## The Mutex wraps the data instead of sitting next to it

In C++, a `std::mutex` and the data it protects are two separate variables. "Lock before touching the data" is just a convention; forgetting to lock still compiles.

Rust's `Mutex<T>` **wraps the data**: without calling `lock()` you simply can't reach the `T`. And the guard returned by `lock()` unlocks as soon as it's dropped (RAII), so you can't forget to unlock either.

## Send and Sync: how the compiler knows Rc can't cross threads

- `Send`: values of this type can be **moved** to another thread
- `Sync`: values of this type can be **referenced** from several threads at once

The compiler derives both automatically. `Rc`'s count isn't atomic, so it's neither `Send` nor `Sync`; `RefCell`'s borrow flag isn't thread-safe, so it isn't `Sync`. `thread::spawn` requires the closure to be `Send`, so handing an `Rc` to a thread is a **compile error**.

That's what Rust means by "fearless concurrency": data races aren't weird bugs that show up occasionally at run time, they're compile errors.

## Task

The code on the right is written with single-threaded `Rc<RefCell<…>>` and doesn't compile. Read the compiler error, then:

1. Replace `Rc` with `Arc` and `RefCell` with `Mutex` to fix `concurrent_count`
2. Implement `collect_ids` the same way: start `n` threads, where thread `i` pushes `i` onto a shared `Vec`, and return the result **sorted** (the order in which threads run isn't deterministic)

:::hint
`use std::sync::{Arc, Mutex};`, then replace `Rc::new(RefCell::new(0))` with `Arc::new(Mutex::new(0))`, `Rc::clone` with `Arc::clone`, and `borrow_mut()` with `lock().unwrap()`.
:::

:::hint
When the function ends, every thread has been joined and only one `Arc` is left. Read the final value with `*counter.lock().unwrap()` (`u64` is `Copy`, so it's copied out).
:::

:::hint
`collect_ids`: same structure as `concurrent_count`; in the thread, `ids.lock().unwrap().push(i);`. Afterwards: `let mut v = ids.lock().unwrap().clone(); v.sort(); v`.
:::

:::exercise
use std::cell::RefCell;
use std::rc::Rc;
use std::thread;

/// threads threads, each incrementing the counter per_thread times
fn concurrent_count(threads: usize, per_thread: u64) -> u64 {
    let counter = Rc::new(RefCell::new(0u64));
    let mut handles = Vec::new();
    for _ in 0..threads {
        let counter = Rc::clone(&counter);
        handles.push(thread::spawn(move || {
            for _ in 0..per_thread {
                *counter.borrow_mut() += 1;
            }
        }));
    }
    for h in handles {
        h.join().unwrap();
    }
    *counter.borrow()
}

/// n threads each push their own number i onto a shared Vec; return the sorted result
fn collect_ids(n: usize) -> Vec<usize> {
    todo!()
}

fn main() {
    println!("{}", concurrent_count(8, 1000));
    println!("{:?}", collect_ids(5));
}
:::

:::solution
use std::sync::{Arc, Mutex};
use std::thread;

/// threads threads, each incrementing the counter per_thread times
fn concurrent_count(threads: usize, per_thread: u64) -> u64 {
    let counter = Arc::new(Mutex::new(0u64));
    let mut handles = Vec::new();
    for _ in 0..threads {
        let counter = Arc::clone(&counter);
        handles.push(thread::spawn(move || {
            for _ in 0..per_thread {
                *counter.lock().unwrap() += 1;
            }
        }));
    }
    for h in handles {
        h.join().unwrap();
    }
    *counter.lock().unwrap()
}

/// n threads each push their own number i onto a shared Vec; return the sorted result
fn collect_ids(n: usize) -> Vec<usize> {
    let ids = Arc::new(Mutex::new(Vec::new()));
    let mut handles = Vec::new();
    for i in 0..n {
        let ids = Arc::clone(&ids);
        handles.push(thread::spawn(move || {
            ids.lock().unwrap().push(i);
        }));
    }
    for h in handles {
        h.join().unwrap();
    }
    let mut v = ids.lock().unwrap().clone();
    v.sort();
    v
}

fn main() {
    println!("{}", concurrent_count(8, 1000));
    println!("{:?}", collect_ids(5));
}
:::

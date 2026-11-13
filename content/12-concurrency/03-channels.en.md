---
title: Channels — Communicating by Message Passing
---
> Do not communicate by sharing memory; instead, share memory by communicating. — a Go proverb that Rust embraces too

A **channel** is a pipe between threads: one end sends, the other receives. Ownership of the data travels with the message: once sent, the sender can't touch it any more, so nothing is "shared" at all.

```rust
use std::sync::mpsc;      // multi-producer, single-consumer: many senders, one receiver
use std::thread;

let (tx, rx) = mpsc::channel();

thread::spawn(move || {
    tx.send(String::from("hello")).unwrap();
    // the String can't be used here any more: it has been sent away
});

let msg = rx.recv().unwrap();     // block until a message arrives
println!("{msg}");
```

Analogies: Python's `queue.Queue`, Go's channels. The C++ standard library has nothing ready-made; you'd usually build one from a `mutex` and a `condition_variable`.

## Several producers

`tx.clone()` gives you more senders to hand to different threads:

```rust
for id in 0..3 {
    let tx = tx.clone();
    thread::spawn(move || {
        tx.send(id * 10).unwrap();
    });
}
drop(tx);                   // crucial: drop the original sender

for value in rx {           // the receiver can be used directly as an iterator
    println!("{value}");
}                           // the loop ends once every sender has been dropped
```

**Why `drop(tx)`?** As long as any sender is alive, the receiver assumes "more messages may come", and `for value in rx` keeps waiting. The original `tx` stays unused in the main thread; if you don't drop it by hand, the program hangs forever.

## Task

Implement a simple worker pool, `parallel_map(inputs, workers)`:

1. Split `inputs` evenly across `workers` threads (thread `w` handles the indexes with `i % workers == w`)
2. Each thread computes `x * x` for its elements and sends `(index, result)` back to the main thread through a channel
3. The main thread collects every result and returns them **in the original order**

Treat `workers == 0` as 1.

:::hint
Prepare the data first: `let workers = workers.max(1); let inputs = Arc::new(inputs);` — sharing the input through an `Arc` lets every thread read it without copying the whole `Vec`.
:::

:::hint
```rust
let (tx, rx) = mpsc::channel();
for w in 0..workers {
    let tx = tx.clone();
    let inputs = Arc::clone(&inputs);
    thread::spawn(move || {
        for i in (w..inputs.len()).step_by(workers) {
            tx.send((i, inputs[i] * inputs[i])).unwrap();
        }
    });
}
drop(tx);
```
:::

:::hint
The receiving side: allocate the result array `let mut out = vec![0; inputs.len()];`, then `for (i, v) in rx { out[i] = v; }`, and return `out`.
:::

:::exercise
use std::sync::mpsc;
use std::sync::Arc;
use std::thread;

/// Square every element in parallel with workers threads; return in the original order
fn parallel_map(inputs: Vec<i64>, workers: usize) -> Vec<i64> {
    todo!()
}

fn main() {
    let inputs: Vec<i64> = (1..=10).collect();
    println!("{:?}", parallel_map(inputs, 3));
}
:::

:::solution
use std::sync::mpsc;
use std::sync::Arc;
use std::thread;

/// Square every element in parallel with workers threads; return in the original order
fn parallel_map(inputs: Vec<i64>, workers: usize) -> Vec<i64> {
    let workers = workers.max(1);
    let inputs = Arc::new(inputs);
    let (tx, rx) = mpsc::channel();
    for w in 0..workers {
        let tx = tx.clone();
        let inputs = Arc::clone(&inputs);
        thread::spawn(move || {
            for i in (w..inputs.len()).step_by(workers) {
                tx.send((i, inputs[i] * inputs[i])).unwrap();
            }
        });
    }
    drop(tx);

    let mut out = vec![0; inputs.len()];
    for (i, v) in rx {
        out[i] = v;
    }
    out
}

fn main() {
    let inputs: Vec<i64> = (1..=10).collect();
    println!("{:?}", parallel_map(inputs, 3));
}
:::

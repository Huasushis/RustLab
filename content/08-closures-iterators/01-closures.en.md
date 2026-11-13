---
title: Closures
---
Closures are anonymous functions that can **capture variables from their surroundings** — C++ lambdas and Python's `lambda` (except Rust closures can contain multiple statements).

```rust
let add_one = |x| x + 1;                 // parameters go between | |; types are usually inferred
let add = |a: i32, b: i32| -> i32 {      // or write the types out, with a braced body
    a + b
};

let factor = 3;
let scale = |x| x * factor;              // captures factor from outside
println!("{}", scale(5));                // 15
```

## How captures work

C++ makes you choose by-value or by-reference capture in `[=]` / `[&]`, and choosing wrong gives you dangling references. Rust's compiler **picks the least restrictive mode automatically** based on the closure body, and the borrow checker keeps it safe:

```rust
let name = String::from("Ferris");
let greet = || println!("hello {name}");     // only reads -> captured by shared reference

let mut count = 0;
let mut inc = || count += 1;                 // modifies -> captured by mutable reference (the closure variable must be mut)
inc();

let consume = move || drop(name);            // move: force the closure to take ownership of what it uses
```

The two most common uses of `move`: **returning** a closure from a function, or handing it to **another thread** (chapter 12). In both cases the closure outlives the current function's locals, so it has to own its data.

## The three closure traits

Every closure has its own unique anonymous type that you can't write down. When a function accepts or returns a closure, it describes it with a trait:

| Trait | Can be called | What the closure does with captures |
| --- | --- | --- |
| `Fn` | any number of times | only reads them |
| `FnMut` | any number of times | modifies them |
| `FnOnce` | only once | consumes (moves out) a captured value |

```rust
fn apply(f: impl Fn(i32) -> i32, x: i32) -> i32 {     // accept a closure
    f(x)
}

fn make_multiplier(k: i32) -> impl Fn(i32) -> i32 {   // return a closure
    move |x| x * k                                    // k is a local, so it must be moved into the closure
}
```

Plain functions implement these traits too, so `apply(i32::abs, -3)` works as well.

## Task

1. `apply_twice(f, x)`: return `f(f(x))`
2. `make_adder(n)`: return a closure that adds `n` to its argument
3. `make_counter()`: return a closure that returns 1 the first time it's called, 2 the second time, and so on. Every counter is independent

:::hint
The body of `apply_twice`: `f(f(x))`
:::

:::hint
`make_adder`: `move |x| x + n`
:::

:::hint
`make_counter`: declare `let mut count = 0;` in the function, then return `move || { count += 1; count }`. The closure modifies the state it captured, which is why the return type is `impl FnMut() -> u32`.
:::

:::exercise
fn apply_twice(f: impl Fn(i32) -> i32, x: i32) -> i32 {
    todo!()
}

fn make_adder(n: i32) -> impl Fn(i32) -> i32 {
    todo!();
    |x| x // placeholder so the starting code type-checks; replace these two lines
}

fn make_counter() -> impl FnMut() -> u32 {
    todo!();
    || 0 // placeholder; replace these two lines
}

fn main() {
    println!("{}", apply_twice(|x| x * 3, 2));
    let add5 = make_adder(5);
    println!("{}", add5(10));
    let mut next = make_counter();
    println!("{} {} {}", next(), next(), next());
}
:::

:::solution
fn apply_twice(f: impl Fn(i32) -> i32, x: i32) -> i32 {
    f(f(x))
}

fn make_adder(n: i32) -> impl Fn(i32) -> i32 {
    move |x| x + n
}

fn make_counter() -> impl FnMut() -> u32 {
    let mut count = 0;
    move || {
        count += 1;
        count
    }
}

fn main() {
    println!("{}", apply_twice(|x| x * 3, 2));
    let add5 = make_adder(5);
    println!("{}", add5(10));
    let mut next = make_counter();
    println!("{} {} {}", next(), next(), next());
}
:::

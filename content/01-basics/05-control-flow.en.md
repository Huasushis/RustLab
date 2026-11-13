---
title: Loops
---
Rust has three kinds of loops.

## for: iterate over anything iterable

```rust
for i in 0..5 { }          // 0,1,2,3,4      like Python's range(5)
for i in 1..=5 { }         // 1,2,3,4,5      ..= includes the end
for i in (0..5).rev() { }  // 4,3,2,1,0
for x in [10, 20, 30] { }  // iterate over an array
```

Rust has **no** C-style `for (int i = 0; i < n; i++)` and no `++`. Ranges and iterators cover almost every case, with no out-of-bounds or off-by-one errors.

## while

```rust
let mut n = 100;
while n > 1 {
    n /= 2;
}
```

## loop: an infinite loop that can "return" a value

```rust
let mut attempts = 0;
let result = loop {
    attempts += 1;
    if attempts * attempts > 50 {
        break attempts;      // the value after break becomes the value of the whole loop expression
    }
};
```

`loop` is `while true`, except the compiler knows it runs at least once, so `break value` can carry a result out. `continue` works as in other languages. Nested loops can be labeled: `'outer: for ... { break 'outer; }`.

## Task

1. `fizzbuzz(n)`: multiples of 3 return `"Fizz"`, multiples of 5 return `"Buzz"`, multiples of both return `"FizzBuzz"`; anything else returns the number itself as a string
2. `collatz_steps(n)`: the Collatz conjecture — halve even numbers, map odd numbers to 3n + 1 — return how many steps it takes `n` to reach 1
3. `first_power_of_two_above(limit)`: return the first power of two **greater than** `limit`, using `loop` + `break value`

`"Fizz".to_string()` turns a literal into a `String`, and numbers have `.to_string()` too. The difference between `String` and `&str` is covered in the next chapter.

:::hint
`fizzbuzz`: check `n % 15 == 0` first, then 3 and 5. Every branch returns a `String`, e.g. `"Fizz".to_string()`; the final `else` branch returns `n.to_string()`.
:::

:::hint
`collatz_steps`: the parameter is already declared as `mut n`. Loop with `while n != 1 { ... }`, use `if n % 2 == 0 { n /= 2 } else { n = 3 * n + 1 }` in the body, and count the steps.
:::

:::hint
`first_power_of_two_above`: `let mut p = 1; loop { if p > limit { break p; } p *= 2; }` — make that `loop` expression the last line of the function.
:::

:::exercise
fn fizzbuzz(n: u32) -> String {
    todo!()
}

/// How many steps until n becomes 1: even -> n/2, odd -> 3n+1
fn collatz_steps(mut n: u64) -> u32 {
    todo!()
}

/// The first power of two greater than limit
fn first_power_of_two_above(limit: u32) -> u32 {
    todo!()
}

fn main() {
    for i in 1..=15 {
        println!("{}", fizzbuzz(i));
    }
    println!("27 takes {} steps", collatz_steps(27));
    println!("first power of two above 1000: {}", first_power_of_two_above(1000));
}
:::

:::solution
fn fizzbuzz(n: u32) -> String {
    if n % 15 == 0 {
        "FizzBuzz".to_string()
    } else if n % 3 == 0 {
        "Fizz".to_string()
    } else if n % 5 == 0 {
        "Buzz".to_string()
    } else {
        n.to_string()
    }
}

/// How many steps until n becomes 1: even -> n/2, odd -> 3n+1
fn collatz_steps(mut n: u64) -> u32 {
    let mut steps = 0;
    while n != 1 {
        if n % 2 == 0 {
            n /= 2;
        } else {
            n = 3 * n + 1;
        }
        steps += 1;
    }
    steps
}

/// The first power of two greater than limit
fn first_power_of_two_above(limit: u32) -> u32 {
    let mut p = 1;
    loop {
        if p > limit {
            break p;
        }
        p *= 2;
    }
}

fn main() {
    for i in 1..=15 {
        println!("{}", fizzbuzz(i));
    }
    println!("27 takes {} steps", collatz_steps(27));
    println!("first power of two above 1000: {}", first_power_of_two_above(1000));
}
:::

---
title: Writing Your Own Iterator
---
To make your own type an iterator, you implement **a single method**:

```rust
struct Countdown {
    n: u32,
}

impl Iterator for Countdown {
    type Item = u32;                         // associated type: what this iterator yields

    fn next(&mut self) -> Option<u32> {
        if self.n == 0 {
            None                             // None means "finished"
        } else {
            self.n -= 1;
            Some(self.n + 1)
        }
    }
}
```

And you get **every** method from the previous two levels for free, plus `for` loop support:

```rust
for i in (Countdown { n: 3 }) { println!("{i}"); }              // 3 2 1
let total: u32 = Countdown { n: 4 }.map(|x| x * x).sum();      // 30
```

That's the power of default trait methods: `map`, `filter`, `sum`… are all default implementations written in terms of `next`.

Compare the effort: a standard-conforming C++ iterator needs five type aliases plus `operator*`, `operator++` and `operator==`; Python needs `__iter__` and `__next__`, or a generator function.

## Infinite iterators

Iterators are lazy, so it's fine if `next` **never returns `None`**; the consumer decides how much to take:

```rust
let first_ten: Vec<u32> = (1..).take(10).collect();      // 1.. is a range without an upper bound
let big = (1..).map(|x| x * x).find(|x| *x > 500);       // Some(529)
```

## Task

1. Implement `Iterator` for `Countdown`: count down from `n` to 1. For example, `Countdown { n: 3 }` yields 3, 2, 1
2. Implement `Iterator` for `Fib`: yield the Fibonacci sequence 0, 1, 1, 2, 3, 5, 8, … (`Item` is `u64`); it is infinite
3. Implement `Fib::new()`

What fields `Fib` needs is up to you.

:::hint
`Countdown` can copy the code from the lesson directly.
:::

:::hint
Let `Fib` store "the current term" and "the next term": `struct Fib { a: u64, b: u64 }`, with `new` returning `Fib { a: 0, b: 1 }`.
:::

:::hint
`next` for `Fib`:
```rust
let current = self.a;
self.a = self.b;
self.b += current;
Some(current)
```
:::

:::exercise
struct Countdown {
    n: u32,
}

// TODO: impl Iterator for Countdown

struct Fib {
    // TODO: which fields do you need?
}

impl Fib {
    fn new() -> Self {
        todo!()
    }
}

// TODO: impl Iterator for Fib

fn main() {
    let v: Vec<u32> = Countdown { n: 5 }.collect();
    println!("{v:?}");
    let fibs: Vec<u64> = Fib::new().take(10).collect();
    println!("{fibs:?}");
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn countdown_works() {
        assert_eq!(Countdown { n: 3 }.collect::<Vec<u32>>(), vec![3, 2, 1]);
        assert_eq!(Countdown { n: 0 }.count(), 0);
        assert_eq!(Countdown { n: 4 }.map(|x| x * x).sum::<u32>(), 30);
    }

    #[test]
    fn fib_sequence() {
        let first: Vec<u64> = Fib::new().take(10).collect();
        assert_eq!(first, vec![0, 1, 1, 2, 3, 5, 8, 13, 21, 34]);
    }

    #[test]
    fn fib_with_adapters() {
        // sum of the even Fibonacci numbers below 100: 0 + 2 + 8 + 34
        let sum: u64 = Fib::new().take_while(|&x| x < 100).filter(|x| x % 2 == 0).sum();
        assert_eq!(sum, 44);
        assert_eq!(Fib::new().find(|&x| x > 1000), Some(1597));
        assert_eq!(Fib::new().nth(50), Some(12586269025));
    }
}
:::

:::solution
struct Countdown {
    n: u32,
}

impl Iterator for Countdown {
    type Item = u32;

    fn next(&mut self) -> Option<u32> {
        if self.n == 0 {
            None
        } else {
            self.n -= 1;
            Some(self.n + 1)
        }
    }
}

struct Fib {
    a: u64,
    b: u64,
}

impl Fib {
    fn new() -> Self {
        Fib { a: 0, b: 1 }
    }
}

impl Iterator for Fib {
    type Item = u64;

    fn next(&mut self) -> Option<u64> {
        let current = self.a;
        self.a = self.b;
        self.b += current;
        Some(current)
    }
}

fn main() {
    let v: Vec<u32> = Countdown { n: 5 }.collect();
    println!("{v:?}");
    let fibs: Vec<u64> = Fib::new().take(10).collect();
    println!("{fibs:?}");
}
:::

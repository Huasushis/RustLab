---
title: Pattern Matching
---
`match` isn't limited to enums. The left side of each arm is a **pattern**, and patterns can be quite rich:

```rust
let n = 42;
let kind = match n {
    0 => "zero",                   // literal
    1 | 2 | 3 => "tiny",           // several patterns joined with |
    4..=9 => "one digit",          // inclusive range
    x if x % 2 == 0 => "even",     // bind to x, then add a "guard" condition
    _ => "other",                  // _ matches anything, like default
};
```

## Destructuring

Patterns can take tuples, structs and enums apart and match on part of them at the same time:

```rust
let point = (0, 7);
match point {
    (0, 0) => println!("origin"),
    (0, y) => println!("on the y axis, y = {y}"),
    (x, 0) => println!("on the x axis, x = {x}"),
    (x, y) => println!("({x}, {y})"),
}
```

Arms are tried **top to bottom** and the first match wins, so more specific patterns go first.

Bundling several values into a tuple and matching on it is a common replacement for nested `if / else`:

```rust
match (n % 3 == 0, n % 5 == 0) {
    (true, true) => "FizzBuzz",
    (true, false) => "Fizz",
    (false, true) => "Buzz",
    (false, false) => "",
}
```

## How it differs from switch

- No fall-through to the next arm, no `break` needed
- Must cover every possibility, or it doesn't compile
- It's an expression and produces a value directly

Python 3.10's `match` statement is very similar; the difference is that Rust checks exhaustiveness and types at compile time.

> The return type `&'static str` means "a string slice that is valid for the whole run of the program". String literals have exactly this type. `'static` is a lifetime — chapter 7 covers lifetimes; for now, just write it as shown.

## Task

1. `describe(n)`: negatives return `"negative"`, 0 returns `"zero"`, 1 to 9 return `"one digit"`, 10 to 99 return `"two digits"`, anything else returns `"big"`
2. `quadrant(point)`: `(0, 0)` returns `"origin"`; a point on an axis returns `"axis"`; otherwise return `"quadrant 1"` to `"quadrant 4"` (both x and y positive is quadrant 1, then counter-clockwise: 2, 3, 4)

Implement both with `match`.

:::hint
`describe`: a range can be open at one end. `i32::MIN..=-1 => "negative"`, or use a guard: `x if x < 0 => "negative"`. Then `0`, `1..=9`, `10..=99`, and finally `_ => "big"`.
:::

:::hint
`quadrant`: write `(0, 0)` first, then `(0, _) | (_, 0) => "axis"`, then use guards for the quadrants, e.g. `(x, y) if x > 0 && y > 0 => "quadrant 1"`. The last quadrant can simply be the `_` catch-all.
:::

:::exercise
fn describe(n: i32) -> &'static str {
    todo!()
}

/// Where is the point: origin / axis / quadrant 1 to 4
fn quadrant(point: (i32, i32)) -> &'static str {
    todo!()
}

fn main() {
    for n in [-5, 0, 7, 42, 1000] {
        println!("{n}: {}", describe(n));
    }
    for p in [(0, 0), (3, 0), (1, 1), (-1, 1), (-1, -1), (1, -1)] {
        println!("{p:?}: {}", quadrant(p));
    }
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn describe_works() {
        assert_eq!(describe(-1), "negative");
        assert_eq!(describe(i32::MIN), "negative");
        assert_eq!(describe(0), "zero");
        assert_eq!(describe(1), "one digit");
        assert_eq!(describe(9), "one digit");
        assert_eq!(describe(10), "two digits");
        assert_eq!(describe(99), "two digits");
        assert_eq!(describe(100), "big");
        assert_eq!(describe(i32::MAX), "big");
    }

    #[test]
    fn quadrant_works() {
        assert_eq!(quadrant((0, 0)), "origin");
        assert_eq!(quadrant((0, 5)), "axis");
        assert_eq!(quadrant((-2, 0)), "axis");
        assert_eq!(quadrant((1, 1)), "quadrant 1");
        assert_eq!(quadrant((-1, 1)), "quadrant 2");
        assert_eq!(quadrant((-1, -1)), "quadrant 3");
        assert_eq!(quadrant((1, -1)), "quadrant 4");
    }
}
:::

:::solution
fn describe(n: i32) -> &'static str {
    match n {
        x if x < 0 => "negative",
        0 => "zero",
        1..=9 => "one digit",
        10..=99 => "two digits",
        _ => "big",
    }
}

/// Where is the point: origin / axis / quadrant 1 to 4
fn quadrant(point: (i32, i32)) -> &'static str {
    match point {
        (0, 0) => "origin",
        (0, _) | (_, 0) => "axis",
        (x, y) if x > 0 && y > 0 => "quadrant 1",
        (x, y) if x < 0 && y > 0 => "quadrant 2",
        (x, y) if x < 0 && y < 0 => "quadrant 3",
        _ => "quadrant 4",
    }
}

fn main() {
    for n in [-5, 0, 7, 42, 1000] {
        println!("{n}: {}", describe(n));
    }
    for p in [(0, 0), (3, 0), (1, 1), (-1, 1), (-1, -1), (1, -1)] {
        println!("{p:?}: {}", quadrant(p));
    }
}
:::

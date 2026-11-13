---
title: Result — Recoverable Errors
---
Rust has **no exceptions**. Errors come in two kinds:

| | Meaning | Mechanism |
| --- | --- | --- |
| Unrecoverable | A bug; the program state can't be trusted any more | `panic!`: print a message and stop the current thread |
| Recoverable | Expected failures: a missing file, invalid input… | Return a `Result<T, E>` |

`Result` is an ordinary enum, just like `Option`:

```rust
enum Result<T, E> {
    Ok(T),     // success, carrying the result
    Err(E),    // failure, carrying the error
}
```

## Why not exceptions

In C++ / Python, a function signature doesn't tell you whether it throws or what; forget the `try` and nobody reminds you. Rust puts "can fail" into the return type:

```rust
fn parse_port(s: &str) -> Result<u16, String> { ... }
```

The caller **has** to do something with the `Result` to get the value out. Ignoring a `Result` entirely produces a compiler warning.

## Handling a Result

```rust
match "8080".parse::<u16>() {
    Ok(port) => println!("port {port}"),
    Err(e) => println!("parse failed: {e}"),
}

let port = "8080".parse::<u16>().unwrap_or(80);              // default on failure
let port = "8080".parse::<u16>().expect("port must be a number");  // panic with this message on failure
```

`unwrap` / `expect` say "I assert this can't fail; if it does, that's a bug". They're common in examples, tests and prototypes; in code meant to last, hand the error back to the caller instead.

## Producing errors

```rust
fn checked_sqrt(x: f64) -> Result<f64, String> {
    if x < 0.0 {
        return Err(format!("cannot take the square root of the negative number {x}"));
    }
    Ok(x.sqrt())
}
```

We use `String` as the error type for now — simple and direct. The more principled approach, a custom error type, comes in level 3 of this chapter.

## Task

1. `divide(a, b)`: return `Err("division by zero".to_string())` when `b` is `0.0`, otherwise the quotient
2. `parse_age(s)`: parse a string into an age
   - after trimming whitespace, it can't be parsed as a `u8` → `Err(format!("not a valid number: {s}"))`
   - it parses but is greater than 150 → `Err("unrealistic age".to_string())`
   - otherwise `Ok(age)`

:::hint
`divide`: `if b == 0.0 { Err("division by zero".to_string()) } else { Ok(a / b) }`
:::

:::hint
`parse_age`:
```rust
match s.trim().parse::<u8>() {
    Ok(age) if age > 150 => Err("unrealistic age".to_string()),
    Ok(age) => Ok(age),
    Err(_) => Err(format!("not a valid number: {s}")),
}
```
:::

:::exercise
fn divide(a: f64, b: f64) -> Result<f64, String> {
    todo!()
}

fn parse_age(s: &str) -> Result<u8, String> {
    todo!()
}

fn main() {
    println!("{:?}", divide(1.0, 4.0));
    println!("{:?}", divide(1.0, 0.0));
    for input in ["36", " 7 ", "abc", "200", "-1"] {
        match parse_age(input) {
            Ok(age) => println!("{input:?} -> {age} years old"),
            Err(e) => println!("{input:?} -> error: {e}"),
        }
    }
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn divide_works() {
        assert_eq!(divide(1.0, 4.0), Ok(0.25));
        assert_eq!(divide(-6.0, 3.0), Ok(-2.0));
        assert_eq!(divide(1.0, 0.0), Err("division by zero".to_string()));
    }

    #[test]
    fn parse_age_ok() {
        assert_eq!(parse_age("36"), Ok(36));
        assert_eq!(parse_age(" 7 "), Ok(7));
        assert_eq!(parse_age("150"), Ok(150));
    }

    #[test]
    fn parse_age_err() {
        assert_eq!(parse_age("abc"), Err("not a valid number: abc".to_string()));
        assert_eq!(parse_age("200"), Err("unrealistic age".to_string()));
        assert!(parse_age("-1").is_err());
        assert!(parse_age("").is_err());
        assert!(parse_age("999").is_err());
    }
}
:::

:::solution
fn divide(a: f64, b: f64) -> Result<f64, String> {
    if b == 0.0 {
        Err("division by zero".to_string())
    } else {
        Ok(a / b)
    }
}

fn parse_age(s: &str) -> Result<u8, String> {
    match s.trim().parse::<u8>() {
        Ok(age) if age > 150 => Err("unrealistic age".to_string()),
        Ok(age) => Ok(age),
        Err(_) => Err(format!("not a valid number: {s}")),
    }
}

fn main() {
    println!("{:?}", divide(1.0, 4.0));
    println!("{:?}", divide(1.0, 0.0));
    for input in ["36", " 7 ", "abc", "200", "-1"] {
        match parse_age(input) {
            Ok(age) => println!("{input:?} -> {age} years old"),
            Err(e) => println!("{input:?} -> error: {e}"),
        }
    }
}
:::

---
title: The ? Operator
---
If every call that can fail needs its own `match`, error handling soon drowns the code:

```rust
fn sum_strs(a: &str, b: &str) -> Result<i32, ParseIntError> {
    let x = match a.parse::<i32>() {
        Ok(v) => v,
        Err(e) => return Err(e),
    };
    let y = match b.parse::<i32>() {
        Ok(v) => v,
        Err(e) => return Err(e),
    };
    Ok(x + y)
}
```

"On success take the value, on failure return the error to the caller unchanged" is so common that Rust has a dedicated operator for it, `?`:

```rust
fn sum_strs(a: &str, b: &str) -> Result<i32, ParseIntError> {
    let x = a.parse::<i32>()?;
    let y = b.parse::<i32>()?;
    Ok(x + y)
}
```

You get the brevity of exceptions (the happy path reads straight through) and the explicitness of return values (every place that may return early is marked with a `?`).

## Where it can be used

`?` only works in functions that return a `Result` (or an `Option`), and the error types have to line up. `main` can return a `Result` too:

```rust
fn main() -> Result<(), String> {
    let n = parse_something("42")?;
    println!("{n}");
    Ok(())
}
```

## When error types don't match

The error type of `parse::<i32>()` is `ParseIntError`. If your function returns `Result<_, String>`, convert it first:

```rust
let n = s.parse::<i32>().map_err(|e| e.to_string())?;           // map the error to a String
let n = s.parse::<i32>().map_err(|_| "not an integer".to_string())?;   // or use your own message
```

An `Option` can be turned into a `Result` with `ok_or`:

```rust
let (key, value) = line.split_once('=').ok_or("missing '='".to_string())?;
```

(The next level shows how the `From` trait lets `?` do this conversion **automatically**.)

## Task

This level forbids `.unwrap()` and `.expect(`.

1. `sum_strs(a, b)`: parse both strings as `i32` and add them, propagating errors with `?`
2. `parse_point(s)`: parse a string like `"3,4"` into `(3, 4)`
   - no comma → `Err("missing comma".to_string())`
   - either side of the comma (after trimming) isn't an integer → `Err("coordinate is not an integer".to_string())`

:::hint
The body of `sum_strs` is just three lines: `let x = a.parse::<i32>()?;` twice, then `Ok(x + y)`.
:::

:::hint
`parse_point`:
```rust
let (x, y) = s.split_once(',').ok_or("missing comma".to_string())?;
let x = x.trim().parse::<i32>().map_err(|_| "coordinate is not an integer".to_string())?;
```
`y` works the same way, then `Ok((x, y))`.
:::

:::exercise
use std::num::ParseIntError;

/// Parse two strings as integers and add them
fn sum_strs(a: &str, b: &str) -> Result<i32, ParseIntError> {
    todo!()
}

/// Parse a coordinate of the form "x,y"
fn parse_point(s: &str) -> Result<(i32, i32), String> {
    todo!()
}

fn main() {
    println!("{:?}", sum_strs("40", "2"));
    println!("{:?}", sum_strs("40", "two"));
    println!("{:?}", parse_point("3, 4"));
    println!("{:?}", parse_point("34"));
    println!("{:?}", parse_point("3,four"));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sum_strs_works() {
        assert_eq!(sum_strs("40", "2"), Ok(42));
        assert_eq!(sum_strs("-5", "5"), Ok(0));
        assert!(sum_strs("40", "two").is_err());
        assert!(sum_strs("", "1").is_err());
    }

    #[test]
    fn parse_point_ok() {
        assert_eq!(parse_point("3,4"), Ok((3, 4)));
        assert_eq!(parse_point(" -1 , 20 "), Ok((-1, 20)));
    }

    #[test]
    fn parse_point_err() {
        assert_eq!(parse_point("34"), Err("missing comma".to_string()));
        assert_eq!(parse_point("3,four"), Err("coordinate is not an integer".to_string()));
        assert_eq!(parse_point("x,4"), Err("coordinate is not an integer".to_string()));
        assert_eq!(parse_point(","), Err("coordinate is not an integer".to_string()));
    }
}
:::

:::solution
use std::num::ParseIntError;

/// Parse two strings as integers and add them
fn sum_strs(a: &str, b: &str) -> Result<i32, ParseIntError> {
    let x = a.parse::<i32>()?;
    let y = b.parse::<i32>()?;
    Ok(x + y)
}

/// Parse a coordinate of the form "x,y"
fn parse_point(s: &str) -> Result<(i32, i32), String> {
    let (x, y) = s.split_once(',').ok_or("missing comma".to_string())?;
    let x = x.trim().parse::<i32>().map_err(|_| "coordinate is not an integer".to_string())?;
    let y = y.trim().parse::<i32>().map_err(|_| "coordinate is not an integer".to_string())?;
    Ok((x, y))
}

fn main() {
    println!("{:?}", sum_strs("40", "2"));
    println!("{:?}", sum_strs("40", "two"));
    println!("{:?}", parse_point("3, 4"));
    println!("{:?}", parse_point("34"));
    println!("{:?}", parse_point("3,four"));
}
:::

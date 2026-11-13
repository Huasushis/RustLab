---
title: Writing Tests
---
You've been "checked" by tests for dozens of levels; now it's your turn to write them. Rust builds unit testing into the language and toolchain, with no need for a framework like gtest or pytest.

```rust
fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[cfg(test)]                 // this module is only compiled when running tests, never in the real program
mod tests {
    use super::*;            // bring everything from the parent module (the code under test) into scope

    #[test]                  // marks a test function
    fn adds_two_numbers() {
        assert_eq!(add(2, 3), 5);
    }

    #[test]
    #[should_panic]          // this code is expected to panic; not panicking counts as a failure
    fn overflow_panics() {
        let _ = add(i32::MAX, 1);
    }
}
```

Locally, `cargo test` compiles and runs every test.

## Assertion macros

```rust
assert!(cond);                       // the condition is true
assert_eq!(left, right);             // equal; on failure both values are printed
assert_ne!(left, right);             // not equal
assert!(x > 0, "x should be positive, got {x}");   // all of them accept a custom failure message
```

## Tests that return Result

A test function can return a `Result`, so you can use `?` inside it:

```rust
#[test]
fn parses() -> Result<(), std::num::ParseIntError> {
    assert_eq!("42".parse::<i32>()?, 42);
    Ok(())
}
```

## Good habits

- Unit tests live in the **same file** as the code they test; the test module can reach private functions
- Name tests like sentences, so a failure tells you immediately which behavior broke
- Besides "normal input", test the **edges**: empty input, zero, maximum values, invalid input

## Task

`is_leap_year` is already implemented: years divisible by 4 are leap years, except those divisible by 100, unless they're also divisible by 400.

Write **at least 3 passing tests** in the `tests` module, covering different branches of the rule, for example:

- an ordinary leap year (2024)
- an ordinary common year (2023)
- a century that isn't a leap year (1900)
- a 400-year mark that is (2000)

The checker also runs a few hidden tests to make sure the function itself hasn't been broken.

:::hint
A test looks like this:
```rust
#[test]
fn year_divisible_by_four_is_leap() {
    assert!(is_leap_year(2024));
}
```
:::

:::hint
To check "not a leap year", use `assert!(!is_leap_year(1900));`. Each test function needs its own `#[test]` attribute and a different name.
:::

:::exercise
/// The Gregorian leap year rule
fn is_leap_year(year: u32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

fn main() {
    for y in [1900, 2000, 2023, 2024] {
        println!("{y}: {}", is_leap_year(y));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn example() {
        // TODO: turn this into a real test, then write at least two more
        todo!()
    }
}
:::

:::solution
/// The Gregorian leap year rule
fn is_leap_year(year: u32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

fn main() {
    for y in [1900, 2000, 2023, 2024] {
        println!("{y}: {}", is_leap_year(y));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn year_divisible_by_four_is_leap() {
        assert!(is_leap_year(2024));
    }

    #[test]
    fn ordinary_year_is_not_leap() {
        assert!(!is_leap_year(2023));
    }

    #[test]
    fn century_is_not_leap() {
        assert!(!is_leap_year(1900));
    }

    #[test]
    fn every_four_hundred_years_is_leap() {
        assert!(is_leap_year(2000));
    }
}
:::

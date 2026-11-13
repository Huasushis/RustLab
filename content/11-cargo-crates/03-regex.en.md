---
title: regex — Regular Expressions
---
Rust's standard library has no regular expressions; the de-facto standard is the `regex` crate. The syntax is basically the same as Python's `re` and C++'s `std::regex`, with one important difference:

> `regex` guarantees matching time **linear** in the input size, so a pattern can never hang for minutes on a crafted input (ReDoS). The price is no backreferences and no lookaround.

It's also much faster than C++'s `std::regex`.

```rust
use regex::Regex;

let re = Regex::new(r"(\d{4})-(\d{2})-(\d{2})").unwrap();   // compile the pattern; a syntax error returns Err

re.is_match("2024-05-01");                     // true
re.find("today is 2024-05-01").map(|m| m.as_str());   // Some("2024-05-01")

for m in re.find_iter("2024-05-01 and 2025-12-31") {  // all matches
    println!("{}", m.as_str());
}

if let Some(caps) = re.captures("2024-05-01") {      // capture groups
    let year = &caps[1];                             // "2024"; indexing panics if the group doesn't exist
    let month = caps.get(2).map(|m| m.as_str());     // get returns an Option
}

re.replace_all("2024-05-01", "$3/$2/$1");      // "01/05/2024", a Cow<str>; call .to_string() if needed
```

Always write patterns as **raw strings** `r"..."` so you don't have to double every backslash.

## Named capture groups

```rust
let re = Regex::new(r"(?<key>\w+)=(?<value>\w+)").unwrap();
let caps = re.captures("lang=rust").unwrap();
assert_eq!(&caps["key"], "lang");
```

## Don't compile a regex inside a loop

`Regex::new` compiles the pattern into a state machine, which takes time. For a regex you use repeatedly, make it a global with the standard library's `LazyLock`; it's compiled once, on first use:

```rust
use std::sync::LazyLock;

static DATE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\d{4}-\d{2}-\d{2}").unwrap());

fn has_date(s: &str) -> bool {
    DATE.is_match(s)       // LazyLock dereferences to &Regex automatically
}
```

It's the equivalent of a function-local `static const std::regex re(...)` in C++, or a module-level `re.compile(...)` in Python.

## Task

1. `find_numbers(text)`: find every integer in the text (possibly negative), in order of appearance
2. `parse_date(s)`: parse a whole string `YYYY-MM-DD` into `(year, month, day)`; return `None` if the format is wrong (including extra text before or after). No need to check that the date really exists
3. `mask_phones(text)`: in every 11-digit phone number starting with 1 (a mainland-China mobile number), replace the middle 4 digits with `****`, e.g. `13812345678` → `138****5678`

Make at least one of the regexes a global with `LazyLock`.

:::hint
`find_numbers`: the pattern `-?\d+`, then `re.find_iter(text).map(|m| m.as_str().parse().unwrap()).collect()`.
:::

:::hint
`parse_date`: anchor the whole string with `^` and `$`: `^(\d{4})-(\d{2})-(\d{2})$`. With `caps` in hand, `caps[1].parse().ok()?` turns each group into a number.
:::

:::hint
`mask_phones`: the pattern `\b(1\d{2})\d{4}(\d{4})\b`, replaced with `"${1}****${2}"`. Prefer `${1}` over `$1`: `$1****` happens to work, but `$1abc` would be read as a group named `1abc`; braces are always safe.
:::

:::exercise
use regex::Regex;
use std::sync::LazyLock;

/// Every integer in the text (may be negative)
fn find_numbers(text: &str) -> Vec<i64> {
    todo!()
}

/// Parse YYYY-MM-DD
fn parse_date(s: &str) -> Option<(u32, u32, u32)> {
    todo!()
}

/// Mask the middle four digits of phone numbers
fn mask_phones(text: &str) -> String {
    todo!()
}

fn main() {
    println!("{:?}", find_numbers("the temperature rose from -5 to 12 degrees, humidity 80%"));
    println!("{:?}", parse_date("2024-05-01"));
    println!("{}", mask_phones("contacts: Zhang 13812345678, Li 15900001111"));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn numbers() {
        assert_eq!(find_numbers("the temperature rose from -5 to 12 degrees, humidity 80%"), vec![-5, 12, 80]);
        assert_eq!(find_numbers("no digits"), Vec::<i64>::new());
        assert_eq!(find_numbers("a1b22c333"), vec![1, 22, 333]);
    }

    #[test]
    fn dates() {
        assert_eq!(parse_date("2024-05-01"), Some((2024, 5, 1)));
        assert_eq!(parse_date("1999-12-31"), Some((1999, 12, 31)));
        assert_eq!(parse_date("2024-5-1"), None);
        assert_eq!(parse_date("date: 2024-05-01"), None);
        assert_eq!(parse_date("2024-05-01 "), None);
        assert_eq!(parse_date(""), None);
    }

    #[test]
    fn phones() {
        assert_eq!(
            mask_phones("contacts: Zhang 13812345678, Li 15900001111"),
            "contacts: Zhang 138****5678, Li 159****1111"
        );
        assert_eq!(mask_phones("order 123456789012345"), "order 123456789012345");
        assert_eq!(mask_phones("no numbers"), "no numbers");
    }
}
:::

:::solution
use regex::Regex;
use std::sync::LazyLock;

static NUMBER: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"-?\d+").unwrap());
static DATE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^(\d{4})-(\d{2})-(\d{2})$").unwrap());
static PHONE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\b(1\d{2})\d{4}(\d{4})\b").unwrap());

/// Every integer in the text (may be negative)
fn find_numbers(text: &str) -> Vec<i64> {
    NUMBER.find_iter(text).map(|m| m.as_str().parse().unwrap()).collect()
}

/// Parse YYYY-MM-DD
fn parse_date(s: &str) -> Option<(u32, u32, u32)> {
    let caps = DATE.captures(s)?;
    Some((caps[1].parse().ok()?, caps[2].parse().ok()?, caps[3].parse().ok()?))
}

/// Mask the middle four digits of phone numbers
fn mask_phones(text: &str) -> String {
    PHONE.replace_all(text, "${1}****${2}").to_string()
}

fn main() {
    println!("{:?}", find_numbers("the temperature rose from -5 to 12 degrees, humidity 80%"));
    println!("{:?}", parse_date("2024-05-01"));
    println!("{}", mask_phones("contacts: Zhang 13812345678, Li 15900001111"));
}
:::

---
title: Working with Text
---
Let's combine what we've learned and do something practical: parse and transform text. `&str` has a large set of methods that return **iterators**; they never copy the string, and each piece they yield is a slice pointing into the original.

```rust
let line = "  alice, 30 ,engineer  ";

line.trim();                          // strip both ends -> "alice, 30 ,engineer"
line.split(',');                      // split on a separator: "  alice", " 30 ", "engineer  "
line.split_whitespace();              // split on any whitespace, skipping runs of it
"a\nb\nc".lines();                    // split into lines

"key=value".split_once('=');          // Some(("key", "value")): cut only at the first match
"hello".starts_with("he");            // also ends_with, contains
"Hello".to_uppercase();               // returns a new String; also to_lowercase
"a-b".replace("-", "+");              // returns a new String
```

## Strings to numbers

`parse` is generic; the target type comes from an annotation. Parsing can fail, so it returns a `Result` (the star of the next chapter):

```rust
let n: i32 = "42".parse().unwrap();           // style 1: annotate the variable
let x = "3.14".parse::<f64>().unwrap();       // style 2: the "turbofish" ::<T>

if let Ok(n) = "abc".parse::<i32>() {         // only handle a successful parse
    println!("{n}");
}
```

## Joining

```rust
let words = vec!["a", "b", "c"];
let joined = words.join("-");                 // "a-b-c", like Python's "-".join(words)

let mut out = String::new();
out.push_str("hello");
out += " world";                              // the right-hand side must be a &str
```

## Character methods

```rust
let c = 'a';
c.is_alphabetic(); c.is_ascii_digit(); c.is_whitespace();
c.to_ascii_uppercase();                       // 'A'
```

## Task

1. `parse_numbers(line)`: split a line such as `"1, 2, x, 4"` on commas and parse the integers; **skip items that fail to parse**
2. `capitalize(word)`: uppercase the first letter (ASCII is enough) and keep the rest; an empty string returns an empty string
3. `title_case(s)`: capitalize every word and join them with **a single** space

:::hint
`parse_numbers`:
```rust
let mut out = Vec::new();
for part in line.split(',') {
    if let Ok(n) = part.trim().parse::<i32>() {
        out.push(n);
    }
}
out
```
:::

:::hint
`capitalize`: get a character iterator with `let mut chars = word.chars();`; `chars.next()` takes the first character (an `Option`), after which `chars.as_str()` is the rest. Glue the uppercased first character and the rest together: `format!("{}{}", first.to_ascii_uppercase(), chars.as_str())`.
:::

:::hint
`title_case`: build a `Vec<String>`, call `capitalize` on each word of `s.split_whitespace()` and push it, then `.join(" ")`.
:::

:::exercise
/// Parse comma-separated integers, skipping items that don't parse
fn parse_numbers(line: &str) -> Vec<i32> {
    todo!()
}

/// Uppercase the first letter
fn capitalize(word: &str) -> String {
    todo!()
}

/// Capitalize every word, joined by single spaces
fn title_case(s: &str) -> String {
    todo!()
}

fn main() {
    println!("{:?}", parse_numbers("1, 2, x, 4,, -5"));
    println!("{}", capitalize("rust"));
    println!("{}", title_case("the   rust programming language"));
}
:::

:::solution
/// Parse comma-separated integers, skipping items that don't parse
fn parse_numbers(line: &str) -> Vec<i32> {
    let mut out = Vec::new();
    for part in line.split(',') {
        if let Ok(n) = part.trim().parse::<i32>() {
            out.push(n);
        }
    }
    out
}

/// Uppercase the first letter
fn capitalize(word: &str) -> String {
    let mut chars = word.chars();
    match chars.next() {
        Some(first) => format!("{}{}", first.to_ascii_uppercase(), chars.as_str()),
        None => String::new(),
    }
}

/// Capitalize every word, joined by single spaces
fn title_case(s: &str) -> String {
    let mut words = Vec::new();
    for word in s.split_whitespace() {
        words.push(capitalize(word));
    }
    words.join(" ")
}

fn main() {
    println!("{:?}", parse_numbers("1, 2, x, 4,, -5"));
    println!("{}", capitalize("rust"));
    println!("{}", title_case("the   rust programming language"));
}
:::

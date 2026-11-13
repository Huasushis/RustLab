---
title: String and &str
---
Rust has two everyday string types. Telling them apart exercises everything from the previous levels on ownership.

| | `String` | `&str` |
| --- | --- | --- |
| What it is | An owned, growable string on the heap | A borrowed view of UTF-8 text (a slice) |
| Analogy | `std::string` | `std::string_view` |
| Mutable? | Yes (`push`, `push_str`…) | No |
| Typical use | Struct fields, return values | Parameters, literals |

```rust
let literal: &str = "hi";                   // literals are &str
let owned: String = literal.to_string();    // &str -> String (allocates)
let also = String::from("hello");
let view: &str = &owned;                    // String -> &str (free)

let mut s = String::new();
s.push('R');                // append a char
s.push_str("ust");          // append a &str
let msg = format!("{s} is {} bytes", s.len());   // format! is like println!, but returns a String
```

**Rule of thumb**: take `&str` as a parameter; use `String` when you need to own or return a new string.

## Strings are UTF-8: no indexing by character

```rust
let s = "héllo, 世界";
s.len();            // 14: the number of BYTES — é takes 2, each Chinese character takes 3
s.chars().count();  // 9: the number of characters
// s[0]             // ❌ compile error: String doesn't support integer indexing
```

Because a character takes 1 to 4 bytes, "the n-th character" can't be found in O(1), so Rust doesn't offer it at all rather than let you think it's cheap. To work character by character, use iterators:

```rust
for c in s.chars() { /* c is a char */ }
let first: Option<char> = s.chars().next();
let reversed: String = s.chars().rev().collect();   // collect gathers an iterator into a String
```

Python's `str` is indexed by code point, so `s[0]` works; C++'s `std::string` is indexed by byte and will happily slice a character in half. Rust makes you say whether you want bytes (`.bytes()`) or characters (`.chars()`).

## Task

1. `greet(name)`: return `Hello, {name}!`
2. `char_count(s)`: return the number of **characters**, not bytes
3. `reverse(s)`: reverse the string character by character

:::hint
`greet`: `format!("Hello, {name}!")` returns a `String` directly.
:::

:::hint
`char_count`: `s.chars().count()`. `reverse`: `s.chars().rev().collect()` — the return type already says `String`, which tells the compiler what to collect into.
:::

:::exercise
fn greet(name: &str) -> String {
    todo!()
}

/// Number of characters (not bytes)
fn char_count(s: &str) -> usize {
    todo!()
}

/// Reverse by characters
fn reverse(s: &str) -> String {
    todo!()
}

fn main() {
    let name = String::from("Ferris 🦀");
    println!("{}", greet(&name));
    println!("{name} has {} characters and {} bytes", char_count(&name), name.len());
    println!("{}", reverse("Rust is fun"));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn greet_works() {
        assert_eq!(greet("Ferris"), "Hello, Ferris!");
        assert_eq!(greet("世界"), "Hello, 世界!");
    }

    #[test]
    fn char_count_works() {
        assert_eq!(char_count(""), 0);
        assert_eq!(char_count("rust"), 4);
        assert_eq!(char_count("héllo"), 5);
        assert_eq!(char_count("🦀 crab"), 6);
    }

    #[test]
    fn reverse_works() {
        assert_eq!(reverse("abc"), "cba");
        assert_eq!(reverse("añb"), "bña");
        assert_eq!(reverse(""), "");
    }
}
:::

:::solution
fn greet(name: &str) -> String {
    format!("Hello, {name}!")
}

/// Number of characters (not bytes)
fn char_count(s: &str) -> usize {
    s.chars().count()
}

/// Reverse by characters
fn reverse(s: &str) -> String {
    s.chars().rev().collect()
}

fn main() {
    let name = String::from("Ferris 🦀");
    println!("{}", greet(&name));
    println!("{name} has {} characters and {} bytes", char_count(&name), name.len());
    println!("{}", reverse("Rust is fun"));
}
:::

---
title: References Inside Structs
---
So far every struct field has been an **owning** type such as `String` or `Vec`. A field can also be a reference, but then it needs a lifetime annotation:

```rust
struct Excerpt<'a> {
    text: &'a str,
}
```

Meaning: an `Excerpt` **can't outlive the text it refers to**.

```rust
let novel = String::from("Call me Ishmael. Some years ago...");
let first = Excerpt { text: novel.split('.').next().unwrap() };
// as long as first is in use, novel can't be freed or modified
```

## Writing the impl block

```rust
impl<'a> Excerpt<'a> {
    fn len(&self) -> usize {
        self.text.len()
    }

    fn text(&self) -> &'a str {     // lives as long as the original text, not as long as self
        self.text
    }
}
```

Look at the last method. Written as `fn text(&self) -> &str`, elision would tie the result to `&self`: once the `Excerpt` is gone, the slice could no longer be used. But it really points into the original text and has nothing to do with the `Excerpt` itself. Writing `&'a str` tells the compiler the looser — and more accurate — relationship.

## 'static

`'static` means "valid for the whole run of the program". All string literals are `&'static str`, because they're stored right in the executable.

## When to use reference fields

- The struct is a temporary "view" of data: parsers, iterators, wrappers around slices → use references, zero copies
- The struct stores data long-term and is passed around → own it (`String`) and save yourself a lot of trouble

If lifetimes are driving you mad while learning, switching the field to an owned type is often the better design anyway.

## Task

Implement a zero-copy word scanner `Words` that holds a string slice and returns the next word on each call to `next_word`:

1. Add a lifetime parameter to `Words` so it compiles
2. Implement `new`
3. Implement `next_word`: skip leading spaces and return the next space-separated word; return `None` when there are no more words

The returned words must live as long as the **original text**: the tests keep using them after the `Words` instance is destroyed.

:::hint
The struct: `struct Words<'a> { rest: &'a str }`. The impl block: `impl<'a> Words<'a> { ... }`, with `new` as `fn new(text: &'a str) -> Self`.
:::

:::hint
`next_word` must be declared as `fn next_word(&mut self) -> Option<&'a str>`, so the result has the lifetime of the original text rather than that of `self`.
:::

:::hint
The body:
```rust
let trimmed = self.rest.trim_start();
if trimmed.is_empty() {
    return None;
}
let end = trimmed.find(' ').unwrap_or(trimmed.len());
let (word, rest) = trimmed.split_at(end);
self.rest = rest;
Some(word)
```
:::

:::exercise
/// Yields the space-separated words of a text one by one, without copying anything
struct Words {
    rest: &str,
}

impl Words {
    fn new(text: &str) -> Self {
        todo!()
    }

    /// Returns the next word, or None when there are no more
    fn next_word(&mut self) -> Option<&str> {
        todo!()
    }
}

fn main() {
    let text = String::from("  hello big   world ");
    let mut words = Words::new(&text);
    while let Some(w) = words.next_word() {
        println!("[{w}]");
    }
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn yields_words_in_order() {
        let mut w = Words::new("  hello big   world ");
        assert_eq!(w.next_word(), Some("hello"));
        assert_eq!(w.next_word(), Some("big"));
        assert_eq!(w.next_word(), Some("world"));
        assert_eq!(w.next_word(), None);
        assert_eq!(w.next_word(), None);
    }

    #[test]
    fn empty_text() {
        assert_eq!(Words::new("").next_word(), None);
        assert_eq!(Words::new("    ").next_word(), None);
    }

    #[test]
    fn words_outlive_the_scanner() {
        let text = String::from("alpha beta");
        let first;
        let second;
        {
            let mut w = Words::new(&text);
            first = w.next_word();
            second = w.next_word();
        } // the scanner is destroyed here, but the words point into text and stay valid
        assert_eq!(first, Some("alpha"));
        assert_eq!(second, Some("beta"));
    }
}
:::

:::solution
/// Yields the space-separated words of a text one by one, without copying anything
struct Words<'a> {
    rest: &'a str,
}

impl<'a> Words<'a> {
    fn new(text: &'a str) -> Self {
        Words { rest: text }
    }

    /// Returns the next word, or None when there are no more
    fn next_word(&mut self) -> Option<&'a str> {
        let trimmed = self.rest.trim_start();
        if trimmed.is_empty() {
            return None;
        }
        let end = trimmed.find(' ').unwrap_or(trimmed.len());
        let (word, rest) = trimmed.split_at(end);
        self.rest = rest;
        Some(word)
    }
}

fn main() {
    let text = String::from("  hello big   world ");
    let mut words = Words::new(&text);
    while let Some(w) = words.next_word() {
        println!("[{w}]");
    }
}
:::

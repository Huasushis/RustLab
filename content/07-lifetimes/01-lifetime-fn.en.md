---
title: Lifetimes in Functions
---
The borrow checker must guarantee that **a reference never outlives the data it points to**. Most of the time it figures this out by itself, but sometimes it doesn't have enough information:

```rust
fn longest(a: &str, b: &str) -> &str {      // ❌ missing lifetime specifier
    if a.len() >= b.len() { a } else { b }
}
```

Does the returned reference come from `a` or from `b`? The compiler only looks at the signature, not the body (otherwise changing a body could break callers far away). So you have to spell it out in the signature.

## Lifetime annotations

```rust
fn longest<'a>(a: &'a str, b: &'a str) -> &'a str {
    if a.len() >= b.len() { a } else { b }
}
```

`'a` is a **lifetime parameter**, declared in `<>` just like a generic parameter. The signature says:

> The returned reference is only valid while **both** `a` and `b` are still valid.

The most important point: **annotations don't change how long anything lives**. They only describe how references relate to each other, so the compiler can check that callers respect it.

```rust
let result;
let s1 = String::from("long string");
{
    let s2 = String::from("short");
    result = longest(&s1, &s2);
}                          // s2 is freed here
println!("{result}");      // ❌ result might point to s2, so the compiler refuses
```

C++ has no such mechanism: the same code compiles, then reads freed memory at run time.

## Not every parameter needs the same lifetime

If the return value can only come from one parameter, tie just that parameter to the result:

```rust
fn first_part<'a>(text: &'a str, sep: &str) -> &'a str {
    text.split(sep).next().unwrap_or(text)
}
```

Now however long `sep` lives doesn't affect the result, which places the fewest restrictions on callers.

## Why you didn't need this before

Because of the **elision rules**. The compiler fills lifetimes in automatically when:

1. there's exactly one reference parameter → the return value gets its lifetime
2. there's `&self` or `&mut self` → the return value gets the lifetime of `self`

`fn first_word(s: &str) -> &str` matches rule 1, which is why chapter 2 never mentioned this.

## Task

1. Add lifetime annotations to `longest` so it compiles
2. Annotate `skip_prefix`. Its return value **only ever comes from `line`**. The tests keep using the result after `prefix` has been freed; if you give both parameters the same lifetime, the tests won't compile — think about why

:::hint
`fn longest<'a>(a: &'a str, b: &'a str) -> &'a str`
:::

:::hint
`fn skip_prefix<'a>(line: &'a str, prefix: &str) -> &'a str`. `prefix` doesn't contribute to the return value, so it doesn't get `'a`. If it did, you'd be telling the compiler "the result might point into prefix", and the result couldn't be used after `prefix` is freed.
:::

:::exercise
/// Returns the longer one; a if they're equally long
fn longest(a: &str, b: &str) -> &str {
    if a.len() >= b.len() { a } else { b }
}

/// If line starts with prefix, return the rest; otherwise return line unchanged
fn skip_prefix(line: &str, prefix: &str) -> &str {
    if line.starts_with(prefix) {
        &line[prefix.len()..]
    } else {
        line
    }
}

fn main() {
    println!("{}", longest("hello", "hi"));
    println!("{}", skip_prefix("log: started", "log: "));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn longest_works() {
        assert_eq!(longest("hello", "hi"), "hello");
        assert_eq!(longest("a", "bcd"), "bcd");
        assert_eq!(longest("same", "size"), "same");
        let owned = String::from("owned string");
        assert_eq!(longest(&owned, "x"), "owned string");
    }

    #[test]
    fn skip_prefix_works() {
        assert_eq!(skip_prefix("log: started", "log: "), "started");
        assert_eq!(skip_prefix("started", "log: "), "started");
        assert_eq!(skip_prefix("", "x"), "");
    }

    #[test]
    fn result_only_borrows_from_line() {
        let line = String::from("log: started");
        let rest;
        {
            let prefix = String::from("log: ");
            rest = skip_prefix(&line, &prefix);
        } // prefix is freed here
        assert_eq!(rest, "started");
    }
}
:::

:::solution
/// Returns the longer one; a if they're equally long
fn longest<'a>(a: &'a str, b: &'a str) -> &'a str {
    if a.len() >= b.len() { a } else { b }
}

/// If line starts with prefix, return the rest; otherwise return line unchanged
fn skip_prefix<'a>(line: &'a str, prefix: &str) -> &'a str {
    if line.starts_with(prefix) {
        &line[prefix.len()..]
    } else {
        line
    }
}

fn main() {
    println!("{}", longest("hello", "hi"));
    println!("{}", skip_prefix("log: started", "log: "));
}
:::

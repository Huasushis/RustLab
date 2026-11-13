---
title: if let, let else and while let
---
When you only care about **one** case, a full `match` is a bit verbose:

```rust
match config.get("port") {
    Some(port) => println!("port is {port}"),
    None => {}
}
```

Rust has three pieces of syntactic sugar for this, all using the same patterns as `match`.

## if let: run only if it matches

```rust
if let Some(port) = config.get("port") {
    println!("port is {port}");
} else {
    println!("no port configured");    // the else is optional
}
```

Read it as: "if the value on the right matches the pattern on the left, bind what's inside and run the block".

## let else: leave early if it doesn't match

```rust
fn first_char_upper(s: &str) -> char {
    let Some(c) = s.chars().next() else {
        return '?';              // the else block must diverge: return, break, continue or panic
    };
    c.to_ascii_uppercase()       // c is usable here directly, without an extra level of nesting
}
```

It's perfect for **guard clauses**: turn away whatever doesn't fit up front, and the main logic stays flat.

## while let: keep looping while it matches

```rust
let mut stack = vec![1, 2, 3];
while let Some(top) = stack.pop() {     // pop returns an Option; None when empty ends the loop
    println!("{top}");
}
```

## The matches! macro

When all you want is a `bool`:

```rust
let is_text = matches!(msg, Message::Text(_));
```

## Task

1. `text_len(msg)`: if it's a `Message::Text`, return the byte length of the text, otherwise 0. Use `if let`
2. `first_digit(s)`: return the digit represented by the first character; return 0 if the string is empty or the first character isn't a digit. Use `let else`. `c.to_digit(10)` converts a char to an `Option<u32>` in base 10
3. `drain_sum(stack)`: pop every number off the stack and sum them; the stack must be empty afterwards. Use `while let`
4. `is_quit(msg)`: is it `Message::Quit`? Use `matches!`

:::hint
`text_len`: `if let Message::Text(s) = msg { s.len() } else { 0 }`
:::

:::hint
`first_digit` can use `let else` twice in a row:
```rust
let Some(c) = s.chars().next() else { return 0; };
let Some(d) = c.to_digit(10) else { return 0; };
d
```
:::

:::hint
`drain_sum`: `let mut total = 0; while let Some(x) = stack.pop() { total += x; } total`

`is_quit`: `matches!(msg, Message::Quit)`
:::

:::exercise
enum Message {
    Text(String),
    Number(i64),
    Quit,
}

fn text_len(msg: &Message) -> usize {
    todo!()
}

/// The digit of the first character; 0 if missing or not a digit
fn first_digit(s: &str) -> u32 {
    todo!()
}

/// Pop all elements and sum them
fn drain_sum(stack: &mut Vec<i32>) -> i32 {
    todo!()
}

fn is_quit(msg: &Message) -> bool {
    todo!()
}

fn main() {
    let msgs = [Message::Text("hello".to_string()), Message::Number(7), Message::Quit];
    for m in &msgs {
        println!("text_len = {}, is_quit = {}", text_len(m), is_quit(m));
    }
    println!("first_digit(\"42abc\") = {}", first_digit("42abc"));
    let mut stack = vec![1, 2, 3, 4];
    println!("drain_sum = {}, stack afterwards: {stack:?}", drain_sum(&mut stack));
}
:::

:::solution
enum Message {
    Text(String),
    Number(i64),
    Quit,
}

fn text_len(msg: &Message) -> usize {
    if let Message::Text(s) = msg { s.len() } else { 0 }
}

/// The digit of the first character; 0 if missing or not a digit
fn first_digit(s: &str) -> u32 {
    let Some(c) = s.chars().next() else {
        return 0;
    };
    let Some(d) = c.to_digit(10) else {
        return 0;
    };
    d
}

/// Pop all elements and sum them
fn drain_sum(stack: &mut Vec<i32>) -> i32 {
    let mut total = 0;
    while let Some(x) = stack.pop() {
        total += x;
    }
    total
}

fn is_quit(msg: &Message) -> bool {
    matches!(msg, Message::Quit)
}

fn main() {
    let msgs = [Message::Text("hello".to_string()), Message::Number(7), Message::Quit];
    for m in &msgs {
        println!("text_len = {}, is_quit = {}", text_len(m), is_quit(m));
    }
    println!("first_digit(\"42abc\") = {}", first_digit("42abc"));
    let mut stack = vec![1, 2, 3, 4];
    println!("drain_sum = {}, stack afterwards: {stack:?}", drain_sum(&mut stack));
}
:::

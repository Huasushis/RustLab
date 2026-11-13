---
title: if let、let else 与 while let
---
只关心**一种**情况时，写完整的 `match` 有点啰嗦：

```rust
match config.get("port") {
    Some(port) => println!("端口是 {port}"),
    None => {}
}
```

Rust 为这种场景提供了三个语法糖，它们用的都是和 `match` 一样的模式。

## if let：匹配上了才执行

```rust
if let Some(port) = config.get("port") {
    println!("端口是 {port}");
} else {
    println!("没有配置端口");    // else 可以省略
}
```

读作「如果右边的值能匹配左边的模式，就把里面的东西绑定出来并执行代码块」。

## let else：匹配不上就提前离开

```rust
fn first_char_upper(s: &str) -> char {
    let Some(c) = s.chars().next() else {
        return '?';              // else 块必须「发散」：return、break、continue 或 panic
    };
    c.to_ascii_uppercase()       // 这里 c 可以直接用，不用缩进一层
}
```

它特别适合写**卫语句**：先把不满足条件的情况挡在门外，主逻辑不用层层嵌套。

## while let：匹配得上就继续循环

```rust
let mut stack = vec![1, 2, 3];
while let Some(top) = stack.pop() {     // pop 返回 Option，栈空时返回 None，循环结束
    println!("{top}");
}
```

## matches! 宏

只想得到一个 `bool` 时：

```rust
let is_text = matches!(msg, Message::Text(_));
```

## 任务

1. `text_len(msg)`：如果是 `Message::Text`，返回文本的字节长度，否则返回 0。用 `if let`
2. `first_digit(s)`：返回字符串第一个字符代表的数字；字符串为空或第一个字符不是数字时返回 0。用 `let else`。`c.to_digit(10)` 把字符按十进制转成 `Option<u32>`
3. `drain_sum(stack)`：把栈里的数全部弹出并求和，结束后栈应为空。用 `while let`
4. `is_quit(msg)`：是否是 `Message::Quit`。用 `matches!`

:::hint
`text_len`：`if let Message::Text(s) = msg { s.len() } else { 0 }`
:::

:::hint
`first_digit` 可以连用两次 `let else`：
```rust
let Some(c) = s.chars().next() else { return 0; };
let Some(d) = c.to_digit(10) else { return 0; };
d
```
:::

:::hint
`drain_sum`：`let mut total = 0; while let Some(x) = stack.pop() { total += x; } total`

`is_quit`：`matches!(msg, Message::Quit)`
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

/// 第一个字符代表的数字；没有或不是数字则返回 0
fn first_digit(s: &str) -> u32 {
    todo!()
}

/// 弹出所有元素并求和
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
    println!("drain_sum = {}，之后栈: {stack:?}", drain_sum(&mut stack));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn text_len_works() {
        assert_eq!(text_len(&Message::Text("hello".to_string())), 5);
        assert_eq!(text_len(&Message::Text(String::new())), 0);
        assert_eq!(text_len(&Message::Number(12345)), 0);
        assert_eq!(text_len(&Message::Quit), 0);
    }

    #[test]
    fn first_digit_works() {
        assert_eq!(first_digit("42abc"), 4);
        assert_eq!(first_digit("9"), 9);
        assert_eq!(first_digit("abc"), 0);
        assert_eq!(first_digit(""), 0);
    }

    #[test]
    fn drain_sum_works() {
        let mut stack = vec![1, 2, 3, 4];
        assert_eq!(drain_sum(&mut stack), 10);
        assert!(stack.is_empty());
        assert_eq!(drain_sum(&mut stack), 0);
    }

    #[test]
    fn is_quit_works() {
        assert!(is_quit(&Message::Quit));
        assert!(!is_quit(&Message::Number(0)));
        assert!(!is_quit(&Message::Text("quit".to_string())));
    }
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

/// 第一个字符代表的数字；没有或不是数字则返回 0
fn first_digit(s: &str) -> u32 {
    let Some(c) = s.chars().next() else {
        return 0;
    };
    let Some(d) = c.to_digit(10) else {
        return 0;
    };
    d
}

/// 弹出所有元素并求和
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
    println!("drain_sum = {}，之后栈: {stack:?}", drain_sum(&mut stack));
}
:::

---
title: 文本处理
---
把前面学的东西合起来，做点实际的事：解析和变换文本。`&str` 上有一大批返回**迭代器**的方法，它们不会复制字符串，产出的每一段都是指向原字符串的切片。

```rust
let line = "  alice, 30 ,engineer  ";

line.trim();                          // 去掉首尾空白 -> "alice, 30 ,engineer"
line.split(',');                      // 按分隔符切分，产出 "  alice"、" 30 "、"engineer  "
line.split_whitespace();              // 按任意空白切分，自动跳过连续空白
"a\nb\nc".lines();                    // 按行切分

"key=value".split_once('=');          // Some(("key", "value"))，只切第一刀
"hello".starts_with("he");            // 还有 ends_with、contains
"Hello".to_uppercase();               // 返回新的 String，还有 to_lowercase
"a-b".replace("-", "+");              // 返回新的 String
```

## 字符串转数字

`parse` 是泛型方法，目标类型由标注决定。解析可能失败，所以返回 `Result`（下一章的主角）：

```rust
let n: i32 = "42".parse().unwrap();           // 写法一：标注变量类型
let x = "3.14".parse::<f64>().unwrap();       // 写法二：「涡轮鱼」语法 ::<T>

if let Ok(n) = "abc".parse::<i32>() {         // 只在解析成功时处理
    println!("{n}");
}
```

## 拼接

```rust
let words = vec!["a", "b", "c"];
let joined = words.join("-");                 // "a-b-c"，相当于 Python 的 "-".join(words)

let mut out = String::new();
out.push_str("hello");
out += " world";                              // += 右边要是 &str
```

## 字符的方法

```rust
let c = 'a';
c.is_alphabetic(); c.is_ascii_digit(); c.is_whitespace();
c.to_ascii_uppercase();                       // 'A'
```

## 任务

1. `parse_numbers(line)`：把形如 `"1, 2, x, 4"` 的一行按逗号切开，解析成整数；**解析失败的项直接跳过**
2. `capitalize(word)`：首字母变大写（只需处理 ASCII），其余保持不变；空串返回空串
3. `title_case(s)`：把每个单词首字母大写，单词之间用**一个**空格连接

:::hint
`parse_numbers`：
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
`capitalize`：用 `let mut chars = word.chars();` 拿到字符迭代器，`chars.next()` 取出第一个字符（是个 `Option`）；取走之后 `chars.as_str()` 就是剩下的部分。把大写后的首字符和剩余部分拼起来：`format!("{}{}", first.to_ascii_uppercase(), chars.as_str())`。
:::

:::hint
`title_case`：先建一个 `Vec<String>`，对 `s.split_whitespace()` 的每个单词调用 `capitalize` 并 push 进去，最后 `.join(" ")`。
:::

:::exercise
/// 解析逗号分隔的整数，跳过无法解析的项
fn parse_numbers(line: &str) -> Vec<i32> {
    todo!()
}

/// 首字母大写
fn capitalize(word: &str) -> String {
    todo!()
}

/// 每个单词首字母大写，用单个空格连接
fn title_case(s: &str) -> String {
    todo!()
}

fn main() {
    println!("{:?}", parse_numbers("1, 2, x, 4,, -5"));
    println!("{}", capitalize("rust"));
    println!("{}", title_case("the   rust programming language"));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_numbers_works() {
        assert_eq!(parse_numbers("1, 2, 3"), vec![1, 2, 3]);
        assert_eq!(parse_numbers("1, 2, x, 4,, -5"), vec![1, 2, 4, -5]);
        assert_eq!(parse_numbers(""), Vec::<i32>::new());
        assert_eq!(parse_numbers("  42  "), vec![42]);
    }

    #[test]
    fn capitalize_works() {
        assert_eq!(capitalize("rust"), "Rust");
        assert_eq!(capitalize("Rust"), "Rust");
        assert_eq!(capitalize("a"), "A");
        assert_eq!(capitalize(""), "");
        assert_eq!(capitalize("42x"), "42x");
    }

    #[test]
    fn title_case_works() {
        assert_eq!(title_case("the rust programming language"), "The Rust Programming Language");
        assert_eq!(title_case("  hello   world "), "Hello World");
        assert_eq!(title_case(""), "");
    }
}
:::

:::solution
/// 解析逗号分隔的整数，跳过无法解析的项
fn parse_numbers(line: &str) -> Vec<i32> {
    let mut out = Vec::new();
    for part in line.split(',') {
        if let Ok(n) = part.trim().parse::<i32>() {
            out.push(n);
        }
    }
    out
}

/// 首字母大写
fn capitalize(word: &str) -> String {
    let mut chars = word.chars();
    match chars.next() {
        Some(first) => format!("{}{}", first.to_ascii_uppercase(), chars.as_str()),
        None => String::new(),
    }
}

/// 每个单词首字母大写，用单个空格连接
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

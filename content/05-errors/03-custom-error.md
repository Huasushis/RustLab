---
title: 自定义错误类型
---
用 `String` 当错误类型很省事，但调用者没法按错误的**种类**做不同处理，只能去比较字符串。正规的做法是用枚举列出所有可能的失败：

```rust
#[derive(Debug)]
enum ConfigError {
    Missing(String),            // 缺少某个配置项
    BadNumber(ParseIntError),   // 包着底层的错误
}
```

调用者就可以 `match` 了，而且以后新增一种错误时，编译器会提醒所有处理它的地方。这相当于 C++ / Python 里定义异常类的层次结构，只不过是用枚举而不是继承。

## 让它成为「正经的」错误：实现 Display

`Debug`（`{:?}`）是给开发者看的，可以 derive；`Display`（`{}`）是给用户看的，必须手写：

```rust
use std::fmt;

impl fmt::Display for ConfigError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            ConfigError::Missing(key) => write!(f, "缺少配置项 {key}"),
            ConfigError::BadNumber(e) => write!(f, "数字格式错误: {e}"),
        }
    }
}

impl std::error::Error for ConfigError {}   // 标记它是一个错误类型，通常不需要写任何方法
```

`write!` 和 `println!` 用法一样，只是写到第一个参数 `f` 里。实现了 `Display` 的类型会自动获得 `.to_string()` 方法。

## 用 From 让 ? 自动转换错误

上一关用 `map_err` 手动转换错误类型。其实 `?` 在返回错误之前，会自动调用 `From::from` 做转换。所以只要告诉编译器「`ParseIntError` 怎么变成 `ConfigError`」：

```rust
impl From<ParseIntError> for ConfigError {
    fn from(e: ParseIntError) -> Self {
        ConfigError::BadNumber(e)
    }
}

fn parse_port(s: &str) -> Result<u16, ConfigError> {
    let port = s.parse::<u16>()?;     // ParseIntError 被自动包成 ConfigError::BadNumber
    Ok(port)
}
```

> 实际项目里，这些样板代码通常交给 `thiserror`（写库时）或 `anyhow`（写应用时）这两个第三方库生成。它们做的就是你在这一关手写的事情。

## 任务

`ParseError` 枚举已经定义好了，请完成：

1. `impl fmt::Display for ParseError`，三种错误分别显示为 `输入为空`、`不是数字`、`必须是正数`
2. `impl From<ParseIntError> for ParseError`，转换成 `ParseError::BadNumber`
3. `parse_positive(s)`：去掉首尾空白后
   - 是空串 → `Err(ParseError::Empty)`
   - 不能解析成 `i64` → `BadNumber`（请用 `?` 让它自动转换）
   - 小于等于 0 → `Err(ParseError::NotPositive)`
   - 否则 `Ok(n)`

:::hint
`Display` 的 `fmt` 方法体：
```rust
match self {
    ParseError::Empty => write!(f, "输入为空"),
    ParseError::BadNumber(_) => write!(f, "不是数字"),
    ParseError::NotPositive => write!(f, "必须是正数"),
}
```
:::

:::hint
`From` 的实现需要你整个写出来（初始代码里没有）：
```rust
impl From<ParseIntError> for ParseError {
    fn from(e: ParseIntError) -> Self {
        ParseError::BadNumber(e)
    }
}
```
:::

:::hint
`parse_positive`：先 `let s = s.trim();`，空串就 `return Err(ParseError::Empty);`。然后 `let n = s.parse::<i64>()?;`，再判断 `n <= 0`。
:::

:::exercise
use std::fmt;
use std::num::ParseIntError;

#[derive(Debug, PartialEq)]
enum ParseError {
    Empty,
    BadNumber(ParseIntError),
    NotPositive,
}

impl fmt::Display for ParseError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        todo!()
    }
}

impl std::error::Error for ParseError {}

// TODO: 在这里实现 From<ParseIntError> for ParseError

fn parse_positive(s: &str) -> Result<i64, ParseError> {
    todo!()
}

fn main() {
    for input in ["42", "  7 ", "", "abc", "-3", "0"] {
        match parse_positive(input) {
            Ok(n) => println!("{input:?} -> {n}"),
            Err(e) => println!("{input:?} -> 错误: {e}"),
        }
    }
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ok_cases() {
        assert_eq!(parse_positive("42"), Ok(42));
        assert_eq!(parse_positive("  7 "), Ok(7));
    }

    #[test]
    fn error_kinds() {
        assert_eq!(parse_positive(""), Err(ParseError::Empty));
        assert_eq!(parse_positive("   "), Err(ParseError::Empty));
        assert_eq!(parse_positive("-3"), Err(ParseError::NotPositive));
        assert_eq!(parse_positive("0"), Err(ParseError::NotPositive));
        assert!(matches!(parse_positive("abc"), Err(ParseError::BadNumber(_))));
        assert!(matches!(parse_positive("1.5"), Err(ParseError::BadNumber(_))));
    }

    #[test]
    fn display_messages() {
        assert_eq!(ParseError::Empty.to_string(), "输入为空");
        assert_eq!(ParseError::NotPositive.to_string(), "必须是正数");
        assert_eq!(parse_positive("abc").unwrap_err().to_string(), "不是数字");
    }

    #[test]
    fn from_conversion() {
        let inner = "x".parse::<i32>().unwrap_err();
        let converted: ParseError = inner.clone().into();
        assert_eq!(converted, ParseError::BadNumber(inner));
    }
}
:::

:::solution
use std::fmt;
use std::num::ParseIntError;

#[derive(Debug, PartialEq)]
enum ParseError {
    Empty,
    BadNumber(ParseIntError),
    NotPositive,
}

impl fmt::Display for ParseError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            ParseError::Empty => write!(f, "输入为空"),
            ParseError::BadNumber(_) => write!(f, "不是数字"),
            ParseError::NotPositive => write!(f, "必须是正数"),
        }
    }
}

impl std::error::Error for ParseError {}

impl From<ParseIntError> for ParseError {
    fn from(e: ParseIntError) -> Self {
        ParseError::BadNumber(e)
    }
}

fn parse_positive(s: &str) -> Result<i64, ParseError> {
    let s = s.trim();
    if s.is_empty() {
        return Err(ParseError::Empty);
    }
    let n = s.parse::<i64>()?;
    if n <= 0 {
        return Err(ParseError::NotPositive);
    }
    Ok(n)
}

fn main() {
    for input in ["42", "  7 ", "", "abc", "-3", "0"] {
        match parse_positive(input) {
            Ok(n) => println!("{input:?} -> {n}"),
            Err(e) => println!("{input:?} -> 错误: {e}"),
        }
    }
}
:::

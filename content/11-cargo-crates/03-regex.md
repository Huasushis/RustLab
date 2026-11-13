---
title: regex：正则表达式
crates: regex
---
Rust 标准库没有正则，事实标准是 `regex` 库。语法和 Python 的 `re`、C++ 的 `std::regex` 基本一样，但有一个重要区别：

> `regex` 保证匹配时间与输入长度**成线性关系**，不会出现某些正则在特殊输入下卡死几分钟的情况（ReDoS）。代价是不支持反向引用和环视（lookaround）。

它也比 C++ 的 `std::regex` 快得多。

```rust
use regex::Regex;

let re = Regex::new(r"(\d{4})-(\d{2})-(\d{2})").unwrap();   // 编译正则；语法错误会返回 Err

re.is_match("2024-05-01");                     // true
re.find("今天是 2024-05-01").map(|m| m.as_str());   // Some("2024-05-01")

for m in re.find_iter("2024-05-01 和 2025-12-31") {  // 所有匹配
    println!("{}", m.as_str());
}

if let Some(caps) = re.captures("2024-05-01") {      // 捕获组
    let year = &caps[1];                             // "2024"；用下标取，组不存在会 panic
    let month = caps.get(2).map(|m| m.as_str());     // 用 get 取，返回 Option
}

re.replace_all("2024-05-01", "$3/$2/$1");      // "01/05/2024"，返回 Cow<str>，可以 .to_string()
```

正则字面量建议总是写成**原始字符串** `r"..."`，免得反斜杠要写两遍。

## 命名捕获组

```rust
let re = Regex::new(r"(?<key>\w+)=(?<value>\w+)").unwrap();
let caps = re.captures("lang=rust").unwrap();
assert_eq!(&caps["key"], "lang");
```

## 不要在循环里反复编译正则

`Regex::new` 要把正则编译成状态机，比较耗时。需要反复使用的正则，用标准库的 `LazyLock` 做成全局变量，第一次用到时编译一次：

```rust
use std::sync::LazyLock;

static DATE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\d{4}-\d{2}-\d{2}").unwrap());

fn has_date(s: &str) -> bool {
    DATE.is_match(s)       // LazyLock 会自动解引用成 &Regex
}
```

相当于 C++ 里函数内的 `static const std::regex re(...)`，或 Python 模块顶层的 `re.compile(...)`。

## 任务

1. `find_numbers(text)`：找出文本里所有的整数（可以带负号），按出现顺序返回
2. `parse_date(s)`：把整个字符串 `YYYY-MM-DD` 解析成 `(年, 月, 日)`；格式不对（包括前后有多余内容）返回 `None`。不需要检查日期是否真实存在
3. `mask_phones(text)`：把文本中所有 11 位手机号（以 1 开头）中间 4 位换成 `****`，例如 `13812345678` → `138****5678`

至少有一个正则请用 `LazyLock` 做成全局变量。

:::hint
`find_numbers`：正则 `-?\d+`，然后 `re.find_iter(text).map(|m| m.as_str().parse().unwrap()).collect()`。
:::

:::hint
`parse_date`：用 `^` 和 `$` 锚定整个字符串：`^(\d{4})-(\d{2})-(\d{2})$`。拿到 `caps` 之后，`caps[1].parse().ok()?` 把每一组解析成数字。
:::

:::hint
`mask_phones`：正则 `\b(1\d{2})\d{4}(\d{4})\b`，替换成 `"${1}****${2}"`。用 `${1}` 而不是 `$1`，是因为后面紧跟着别的字符时 `$1****` 也没问题，但 `$1abc` 会被理解成名为 `1abc` 的组，写成花括号最稳妥。
:::

:::exercise
use regex::Regex;
use std::sync::LazyLock;

/// 文本中所有的整数（可以是负数）
fn find_numbers(text: &str) -> Vec<i64> {
    todo!()
}

/// 解析 YYYY-MM-DD
fn parse_date(s: &str) -> Option<(u32, u32, u32)> {
    todo!()
}

/// 手机号中间四位打码
fn mask_phones(text: &str) -> String {
    todo!()
}

fn main() {
    println!("{:?}", find_numbers("温度从 -5 度升到 12 度，湿度 80%"));
    println!("{:?}", parse_date("2024-05-01"));
    println!("{}", mask_phones("联系人：张三 13812345678，李四 15900001111"));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn numbers() {
        assert_eq!(find_numbers("温度从 -5 度升到 12 度，湿度 80%"), vec![-5, 12, 80]);
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
            mask_phones("联系人：张三 13812345678，李四 15900001111"),
            "联系人：张三 138****5678，李四 159****1111"
        );
        assert_eq!(mask_phones("订单号 123456789012345"), "订单号 123456789012345");
        assert_eq!(mask_phones("没有号码"), "没有号码");
    }
}
:::

:::solution
use regex::Regex;
use std::sync::LazyLock;

static NUMBER: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"-?\d+").unwrap());
static DATE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^(\d{4})-(\d{2})-(\d{2})$").unwrap());
static PHONE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\b(1\d{2})\d{4}(\d{4})\b").unwrap());

/// 文本中所有的整数（可以是负数）
fn find_numbers(text: &str) -> Vec<i64> {
    NUMBER.find_iter(text).map(|m| m.as_str().parse().unwrap()).collect()
}

/// 解析 YYYY-MM-DD
fn parse_date(s: &str) -> Option<(u32, u32, u32)> {
    let caps = DATE.captures(s)?;
    Some((caps[1].parse().ok()?, caps[2].parse().ok()?, caps[3].parse().ok()?))
}

/// 手机号中间四位打码
fn mask_phones(text: &str) -> String {
    PHONE.replace_all(text, "${1}****${2}").to_string()
}

fn main() {
    println!("{:?}", find_numbers("温度从 -5 度升到 12 度，湿度 80%"));
    println!("{:?}", parse_date("2024-05-01"));
    println!("{}", mask_phones("联系人：张三 13812345678，李四 15900001111"));
}
:::

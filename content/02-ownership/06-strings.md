---
title: String 与 &str
---
Rust 有两种最常用的字符串类型，分清它们就等于把前面几关的所有权知识用了一遍。

| | `String` | `&str` |
| --- | --- | --- |
| 是什么 | 拥有堆内存、可增长的字符串 | 对一段 UTF-8 文本的借用（切片） |
| 类比 | `std::string` | `std::string_view` |
| 能否修改 | 可以（`push`、`push_str`…） | 不可以 |
| 典型用途 | 结构体字段、函数返回值 | 函数参数、字面量 |

```rust
let literal: &str = "你好";                 // 字面量是 &str
let owned: String = literal.to_string();    // &str -> String（发生堆分配）
let also = String::from("hello");
let view: &str = &owned;                    // String -> &str（零成本）

let mut s = String::new();
s.push('R');                // 追加一个字符
s.push_str("ust");          // 追加一个 &str
let msg = format!("{s} 有 {} 个字节", s.len());   // format! 像 println!，但返回 String
```

**经验法则**：参数用 `&str`，需要拥有或返回新字符串时用 `String`。

## 字符串是 UTF-8，不能用下标取字符

```rust
let s = "你好, Rust";
s.len();            // 12：是「字节数」，每个汉字占 3 个字节
s.chars().count();  // 8：字符数
// s[0]             // ❌ 编译错误：String 不支持整数下标
```

因为每个字符占 1 到 4 个字节，按下标取「第 n 个字符」做不到 O(1)，Rust 干脆不提供这个操作，免得你误以为它很便宜。要按字符处理就用迭代器：

```rust
for c in s.chars() { /* c 是 char */ }
let first: Option<char> = s.chars().next();
let reversed: String = s.chars().rev().collect();   // collect 把迭代器收集成 String
```

Python 的 `str` 按码点索引，`s[0]` 没问题；C++ 的 `std::string` 按字节索引，遇到中文就会切出半个字符。Rust 选择让你明确说出要的是字节（`.bytes()`）还是字符（`.chars()`）。

## 任务

1. `greet(name)`：返回 `你好，{name}！`（注意是中文逗号和中文感叹号）
2. `char_count(s)`：返回**字符**数而不是字节数
3. `reverse(s)`：按字符反转字符串

:::hint
`greet`：`format!("你好，{name}！")`，它直接返回一个 `String`。
:::

:::hint
`char_count`：`s.chars().count()`。`reverse`：`s.chars().rev().collect()`——返回类型已经写明是 `String`，编译器由此知道要收集成什么。
:::

:::exercise
fn greet(name: &str) -> String {
    todo!()
}

/// 字符数（不是字节数）
fn char_count(s: &str) -> usize {
    todo!()
}

/// 按字符反转
fn reverse(s: &str) -> String {
    todo!()
}

fn main() {
    let name = String::from("小螃蟹");
    println!("{}", greet(&name));
    println!("{name} 有 {} 个字符、{} 个字节", char_count(&name), name.len());
    println!("{}", reverse("Rust 真香"));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn greet_works() {
        assert_eq!(greet("Ferris"), "你好，Ferris！");
        assert_eq!(greet("小明"), "你好，小明！");
    }

    #[test]
    fn char_count_works() {
        assert_eq!(char_count(""), 0);
        assert_eq!(char_count("rust"), 4);
        assert_eq!(char_count("你好"), 2);
        assert_eq!(char_count("🦀 crab"), 6);
    }

    #[test]
    fn reverse_works() {
        assert_eq!(reverse("abc"), "cba");
        assert_eq!(reverse("你好吗"), "吗好你");
        assert_eq!(reverse(""), "");
    }
}
:::

:::solution
fn greet(name: &str) -> String {
    format!("你好，{name}！")
}

/// 字符数（不是字节数）
fn char_count(s: &str) -> usize {
    s.chars().count()
}

/// 按字符反转
fn reverse(s: &str) -> String {
    s.chars().rev().collect()
}

fn main() {
    let name = String::from("小螃蟹");
    println!("{}", greet(&name));
    println!("{name} 有 {} 个字符、{} 个字节", char_count(&name), name.len());
    println!("{}", reverse("Rust 真香"));
}
:::

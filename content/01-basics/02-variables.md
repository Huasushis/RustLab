---
title: 变量与可变性
---
## 默认不可变

```rust
let x = 5;
x = 6;          // ❌ 编译错误：cannot assign twice to immutable variable
let mut y = 5;  // 加上 mut 才能修改
y += 1;
```

在 C++ 里你要主动写 `const` 才不可变；Rust 反过来，**要主动写 `mut` 才可变**。这样读代码时，一眼就知道哪些值会变。

类型通常由编译器推断，也可以显式标注：`let x: i64 = 5;`。Rust 是静态强类型的，变量的类型一旦确定就不会变（这点和 Python 不同）。

## 遮蔽（shadowing）

可以用 `let` 重新声明一个**同名的新变量**，新变量甚至可以是不同类型：

```rust
let input = "42";                         // &str
let input: i32 = input.parse().unwrap();  // 新的 input，类型是 i32
let input = input * 2;                    // 又一个新的 input
```

这不是「修改」，而是创建新变量并挡住旧的。它常用于「解析 / 转换之后沿用同一个名字」，省得起 `input_str`、`input_num` 这样的名字。

## 常量

```rust
const MAX_SCORE: u32 = 100;   // 必须标注类型，值必须在编译期可知
```

## 任务

下面两个函数都**编译不过**，请修好它们：

1. `sum_to(n)`：计算 `1 + 2 + … + n`
2. `parse_and_double(input)`：把形如 `" 21 "` 的字符串解析成整数再乘以 2

第一次看到 Rust 的编译错误可能觉得很长，但请耐心读一读：它会指出出错的位置，并且经常**直接告诉你怎么改**（看 `help:` 那一行）。点「运行」后到「问题」面板里看看。

:::hint
`sum_to` 里的 `total` 需要被修改，所以声明时要写 `let mut total = 0;`
:::

:::hint
`parse_and_double` 里 `value` 是 `&str`，不能直接乘 2。用遮蔽把它变成整数：
`let value: i32 = value.parse().unwrap();`
:::

:::exercise
fn sum_to(n: u32) -> u32 {
    let total = 0;
    for i in 1..=n {
        total += i;
    }
    total
}

fn parse_and_double(input: &str) -> i32 {
    let value = input.trim(); // 去掉首尾空白，此时 value 仍是字符串
    // TODO: 用遮蔽把 value 重新绑定为解析后的 i32
    value * 2
}

fn main() {
    println!("1 到 10 的和: {}", sum_to(10));
    println!("\" 21 \" 翻倍: {}", parse_and_double(" 21 "));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sum_to_works() {
        assert_eq!(sum_to(0), 0);
        assert_eq!(sum_to(1), 1);
        assert_eq!(sum_to(10), 55);
        assert_eq!(sum_to(100), 5050);
    }

    #[test]
    fn parse_and_double_works() {
        assert_eq!(parse_and_double("21"), 42);
        assert_eq!(parse_and_double("  -4 "), -8);
    }
}
:::

:::solution
fn sum_to(n: u32) -> u32 {
    let mut total = 0;
    for i in 1..=n {
        total += i;
    }
    total
}

fn parse_and_double(input: &str) -> i32 {
    let value = input.trim();
    let value: i32 = value.parse().unwrap();
    value * 2
}

fn main() {
    println!("1 到 10 的和: {}", sum_to(10));
    println!("\" 21 \" 翻倍: {}", parse_and_double(" 21 "));
}
:::

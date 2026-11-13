---
title: 基本类型与转换
---
## 标量类型

| 类别 | 类型 | 备注 |
| --- | --- | --- |
| 有符号整数 | `i8` `i16` `i32` `i64` `i128` `isize` | 整数字面量默认是 `i32` |
| 无符号整数 | `u8` `u16` `u32` `u64` `u128` `usize` | `usize` 用于下标和长度，相当于 `size_t` |
| 浮点 | `f32` `f64` | 浮点字面量默认是 `f64` |
| 布尔 | `bool` | 不能和整数互相隐式转换 |
| 字符 | `char` | 4 字节，一个 Unicode 标量值，不是 C 的 `char` |

类型名直接写明了位宽，不用再猜 `long` 到底是几位。

## 没有隐式类型转换

这是从 C++ / Python 过来最容易踩的坑：

```rust
let a: i32 = 7;
let b: f64 = 2.0;
let c = a / b;          // ❌ 不同类型不能直接运算
let c = a as f64 / b;   // ✅ 用 as 显式转换，结果是 3.5
let d = 7 / 2;          // 3：整数除法截断，和 C++ 一样（Python 的 // ）
```

另外，整数溢出在 debug 模式下会 **panic**（程序带着错误信息终止），而不是像 C++ 那样悄悄回绕或成为未定义行为。

## 元组与数组

```rust
let pair: (i32, &str) = (1, "one");
let (num, name) = pair;       // 解构，类似 Python 的拆包
let first = pair.0;           // 用 .0 .1 访问

let arr: [i32; 3] = [10, 20, 30];   // 定长数组，长度是类型的一部分（类似 std::array）
let zeros = [0u8; 16];              // 16 个 0
let n = arr.len();                  // 下标越界会 panic，而不是读到脏内存
```

## 任务

实现三个函数（`todo!()` 是占位宏，能通过编译，但运行到就会 panic）：

1. `average`：现在的写法编译不过，修好它，并保证 `average(1, 2)` 得到 `1.5`
2. `div_rem`：返回 `(商, 余数)` 元组
3. `first_plus_last`：返回数组首尾元素之和

:::hint
`average` 的返回类型是 `f64`，而 `(a + b) / 2` 是 `i32`。要**先**转成浮点再除：`(a + b) as f64 / 2.0`
:::

:::hint
元组直接用括号构造：`(a / b, a % b)`。数组最后一个元素是 `arr[arr.len() - 1]`。
:::

:::exercise
/// 两个整数的平均值，注意结果可能带小数
fn average(a: i32, b: i32) -> f64 {
    (a + b) / 2
}

/// 返回 (商, 余数)
fn div_rem(a: u32, b: u32) -> (u32, u32) {
    todo!()
}

/// 返回数组第一个元素与最后一个元素之和
fn first_plus_last(arr: [i64; 5]) -> i64 {
    todo!()
}

fn main() {
    println!("average(1, 2) = {}", average(1, 2));
    let (q, r) = div_rem(17, 5);
    println!("17 / 5 = {q} 余 {r}");
    println!("首尾之和: {}", first_plus_last([1, 2, 3, 4, 5]));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn average_keeps_fraction() {
        assert_eq!(average(1, 2), 1.5);
        assert_eq!(average(-3, 3), 0.0);
        assert_eq!(average(10, 20), 15.0);
    }

    #[test]
    fn div_rem_works() {
        assert_eq!(div_rem(17, 5), (3, 2));
        assert_eq!(div_rem(8, 4), (2, 0));
    }

    #[test]
    fn first_plus_last_works() {
        assert_eq!(first_plus_last([1, 2, 3, 4, 5]), 6);
        assert_eq!(first_plus_last([-10, 0, 0, 0, 10]), 0);
    }
}
:::

:::solution
/// 两个整数的平均值，注意结果可能带小数
fn average(a: i32, b: i32) -> f64 {
    (a + b) as f64 / 2.0
}

/// 返回 (商, 余数)
fn div_rem(a: u32, b: u32) -> (u32, u32) {
    (a / b, a % b)
}

/// 返回数组第一个元素与最后一个元素之和
fn first_plus_last(arr: [i64; 5]) -> i64 {
    arr[0] + arr[arr.len() - 1]
}

fn main() {
    println!("average(1, 2) = {}", average(1, 2));
    let (q, r) = div_rem(17, 5);
    println!("17 / 5 = {q} 余 {r}");
    println!("首尾之和: {}", first_plus_last([1, 2, 3, 4, 5]));
}
:::

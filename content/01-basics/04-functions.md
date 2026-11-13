---
title: 函数与表达式
---
## 函数签名

```rust
fn add(a: i32, b: i32) -> i32 {
    a + b
}
```

参数和返回值的类型**必须**写出来（函数体内部的局部变量才能靠推断）。没有 `->` 的函数返回「单元类型」`()`，相当于 `void`。

## Rust 是「表达式语言」

注意上面的 `a + b` 后面**没有分号，也没有 `return`**。在 Rust 里：

- **表达式**会算出一个值：`a + b`、`x * 2`、函数调用、`if`、代码块 `{ ... }` ……
- **语句**不产生值：`let x = 5;`，以及任何以分号结尾的表达式
- 代码块里**最后一个不带分号的表达式**，就是整个块的值；函数体也是代码块

```rust
fn square(x: i32) -> i32 {
    x * x      // ✅ 返回 x * x
}

fn oops(x: i32) -> i32 {
    x * x;     // ❌ 加了分号变成语句，函数实际返回 ()，类型不匹配
}
```

`return` 依然存在，但一般只用于**提前返回**。

## if 也是表达式

所以 Rust 不需要三目运算符：

```rust
let abs = if x >= 0 { x } else { -x };          // 类似 C++ 的 x >= 0 ? x : -x
let label = if score >= 60 { "及格" } else { "不及格" };
```

两个分支的类型必须一致；条件必须是 `bool`，写 `if x { ... }`（x 是整数）是编译错误。

## 任务

1. `square` 编译不过，修好它
2. 实现 `abs_diff(a, b)`：返回 `|a - b|`，试试用 `if` 表达式
3. 实现 `grade(score)`：`>= 90` 返回 `'A'`，`>= 75` 返回 `'B'`，`>= 60` 返回 `'C'`，其余返回 `'D'`

:::hint
`square` 的问题是多了一个分号。去掉它，让 `x * x` 成为函数的返回值。
:::

:::hint
`if a > b { a - b } else { b - a }` 整个就是一个表达式，把它作为函数体的最后一行即可。`grade` 用 `if ... else if ... else` 链，每个分支写一个字符字面量如 `'A'`。
:::

:::exercise
fn square(x: i32) -> i32 {
    x * x;
}

/// 返回 a 与 b 之差的绝对值
fn abs_diff(a: i32, b: i32) -> i32 {
    todo!()
}

/// 分数转等级：>=90 A，>=75 B，>=60 C，其余 D
fn grade(score: u32) -> char {
    todo!()
}

fn main() {
    println!("7 的平方: {}", square(7));
    println!("|3 - 10| = {}", abs_diff(3, 10));
    println!("82 分的等级: {}", grade(82));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn square_works() {
        assert_eq!(square(7), 49);
        assert_eq!(square(-3), 9);
    }

    #[test]
    fn abs_diff_works() {
        assert_eq!(abs_diff(3, 10), 7);
        assert_eq!(abs_diff(10, 3), 7);
        assert_eq!(abs_diff(-2, -2), 0);
    }

    #[test]
    fn grade_works() {
        assert_eq!(grade(100), 'A');
        assert_eq!(grade(90), 'A');
        assert_eq!(grade(89), 'B');
        assert_eq!(grade(75), 'B');
        assert_eq!(grade(60), 'C');
        assert_eq!(grade(59), 'D');
        assert_eq!(grade(0), 'D');
    }
}
:::

:::solution
fn square(x: i32) -> i32 {
    x * x
}

/// 返回 a 与 b 之差的绝对值
fn abs_diff(a: i32, b: i32) -> i32 {
    if a > b { a - b } else { b - a }
}

/// 分数转等级：>=90 A，>=75 B，>=60 C，其余 D
fn grade(score: u32) -> char {
    if score >= 90 {
        'A'
    } else if score >= 75 {
        'B'
    } else if score >= 60 {
        'C'
    } else {
        'D'
    }
}

fn main() {
    println!("7 的平方: {}", square(7));
    println!("|3 - 10| = {}", abs_diff(3, 10));
    println!("82 分的等级: {}", grade(82));
}
:::

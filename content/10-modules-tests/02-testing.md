---
title: 编写测试
min_tests: 3
---
你已经被测试「检查」了几十关，现在轮到你来写。Rust 把单元测试内置在语言和工具链里，不需要 gtest、pytest 之类的框架。

```rust
fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[cfg(test)]                 // 这个模块只在运行测试时编译，不会进入正式的程序
mod tests {
    use super::*;            // 引入父模块（也就是被测代码）里的所有东西

    #[test]                  // 标记一个测试函数
    fn adds_two_numbers() {
        assert_eq!(add(2, 3), 5);
    }

    #[test]
    #[should_panic]          // 期望这段代码 panic，没有 panic 反而算失败
    fn overflow_panics() {
        let _ = add(i32::MAX, 1);
    }
}
```

本地运行 `cargo test` 就会编译并执行所有测试。

## 断言宏

```rust
assert!(cond);                       // 条件为真
assert_eq!(left, right);             // 相等。失败时会打印出两边的值
assert_ne!(left, right);             // 不相等
assert!(x > 0, "x 应该是正数，实际是 {x}");   // 都可以附带自定义的失败信息
```

## 测试返回 Result

测试函数也可以返回 `Result`，这样就能在里面用 `?`：

```rust
#[test]
fn parses() -> Result<(), std::num::ParseIntError> {
    assert_eq!("42".parse::<i32>()?, 42);
    Ok(())
}
```

## 习惯

- 单元测试和被测代码放在**同一个文件**里，测试模块能访问私有函数
- 测试名写成一句话，失败时一眼就能看出哪个行为坏了
- 除了「正常输入」，也要测**边界**：空输入、零、最大值、非法输入

## 任务

`is_leap_year` 已经实现好了：能被 4 整除的是闰年，但能被 100 整除的不是，除非它也能被 400 整除。

请在 `tests` 模块里**至少写 3 个能通过的测试**，覆盖这条规则的不同分支，比如：

- 普通闰年（2024）
- 普通平年（2023）
- 整百年但不是闰年（1900）
- 整四百年是闰年（2000）

判题时还会运行几个隐藏测试，确认函数本身没有被改坏。

:::hint
一个测试长这样：
```rust
#[test]
fn year_divisible_by_four_is_leap() {
    assert!(is_leap_year(2024));
}
```
:::

:::hint
判断「不是闰年」用 `assert!(!is_leap_year(1900));`。每个测试函数都要有自己的 `#[test]` 标记和不同的名字。
:::

:::exercise
/// 公历闰年规则
fn is_leap_year(year: u32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

fn main() {
    for y in [1900, 2000, 2023, 2024] {
        println!("{y}: {}", is_leap_year(y));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn example() {
        // TODO: 把这个测试改成真正的测试，然后再写至少两个
        todo!()
    }
}
:::

:::tests
#[cfg(test)]
mod rustlab_checks {
    use super::is_leap_year;

    #[test]
    fn rule_still_holds() {
        assert!(is_leap_year(2024));
        assert!(is_leap_year(2000));
        assert!(!is_leap_year(1900));
        assert!(!is_leap_year(2023));
        assert!(is_leap_year(1600));
        assert!(!is_leap_year(2100));
    }
}
:::

:::solution
/// 公历闰年规则
fn is_leap_year(year: u32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

fn main() {
    for y in [1900, 2000, 2023, 2024] {
        println!("{y}: {}", is_leap_year(y));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn year_divisible_by_four_is_leap() {
        assert!(is_leap_year(2024));
    }

    #[test]
    fn ordinary_year_is_not_leap() {
        assert!(!is_leap_year(2023));
    }

    #[test]
    fn century_is_not_leap() {
        assert!(!is_leap_year(1900));
    }

    #[test]
    fn every_four_hundred_years_is_leap() {
        assert!(is_leap_year(2000));
    }
}
:::

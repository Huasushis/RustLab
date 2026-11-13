---
title: 循环
---
Rust 有三种循环。

## for：遍历任何可迭代的东西

```rust
for i in 0..5 { }          // 0,1,2,3,4      相当于 Python 的 range(5)
for i in 1..=5 { }         // 1,2,3,4,5      ..= 包含右端点
for i in (0..5).rev() { }  // 4,3,2,1,0
for x in [10, 20, 30] { }  // 遍历数组
```

Rust **没有** C 风格的 `for (int i = 0; i < n; i++)`，也没有 `++`。绝大多数场景用区间或迭代器，既不会越界也不会差一。

## while

```rust
let mut n = 100;
while n > 1 {
    n /= 2;
}
```

## loop：无限循环，而且能「返回值」

```rust
let mut attempts = 0;
let result = loop {
    attempts += 1;
    if attempts * attempts > 50 {
        break attempts;      // break 后面跟的值，就是整个 loop 表达式的值
    }
};
```

`loop` 相当于 `while true`，但编译器明确知道它至少执行一次，所以可以用 `break 值` 把结果带出来。`continue` 的用法和别的语言一样。嵌套循环可以打标签：`'outer: for ... { break 'outer; }`。

## 任务

1. `fizzbuzz(n)`：3 的倍数返回 `"Fizz"`，5 的倍数返回 `"Buzz"`，同时是两者的倍数返回 `"FizzBuzz"`，否则返回数字本身的字符串形式
2. `collatz_steps(n)`：考拉兹猜想——偶数除以 2，奇数乘 3 加 1，返回 `n` 变成 1 所需的步数
3. `first_power_of_two_above(limit)`：返回第一个**大于** `limit` 的 2 的幂，用 `loop` + `break 值` 实现

`"Fizz".to_string()` 可以把字面量变成 `String`，数字也有 `.to_string()`。`String` 与 `&str` 的区别下一章会细讲。

:::hint
`fizzbuzz`：先判断 `n % 15 == 0`，再判断 3 和 5。每个分支返回 `String`，比如 `"Fizz".to_string()`，最后的 `else` 分支返回 `n.to_string()`。
:::

:::hint
`collatz_steps`：参数已经声明为 `mut n`，用 `while n != 1 { ... }` 循环，循环体里用 `if n % 2 == 0 { n /= 2 } else { n = 3 * n + 1 }` 并累加步数。
:::

:::hint
`first_power_of_two_above`：`let mut p = 1; loop { if p > limit { break p; } p *= 2; }`，把这个 `loop` 表达式作为函数的最后一行。
:::

:::exercise
fn fizzbuzz(n: u32) -> String {
    todo!()
}

/// n 经过多少步变成 1：偶数 n/2，奇数 3n+1
fn collatz_steps(mut n: u64) -> u32 {
    todo!()
}

/// 第一个大于 limit 的 2 的幂
fn first_power_of_two_above(limit: u32) -> u32 {
    todo!()
}

fn main() {
    for i in 1..=15 {
        println!("{}", fizzbuzz(i));
    }
    println!("27 需要 {} 步", collatz_steps(27));
    println!("大于 1000 的第一个 2 的幂: {}", first_power_of_two_above(1000));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fizzbuzz_works() {
        assert_eq!(fizzbuzz(1), "1");
        assert_eq!(fizzbuzz(3), "Fizz");
        assert_eq!(fizzbuzz(5), "Buzz");
        assert_eq!(fizzbuzz(15), "FizzBuzz");
        assert_eq!(fizzbuzz(30), "FizzBuzz");
        assert_eq!(fizzbuzz(98), "98");
    }

    #[test]
    fn collatz_works() {
        assert_eq!(collatz_steps(1), 0);
        assert_eq!(collatz_steps(2), 1);
        assert_eq!(collatz_steps(6), 8);
        assert_eq!(collatz_steps(27), 111);
    }

    #[test]
    fn power_of_two_works() {
        assert_eq!(first_power_of_two_above(0), 1);
        assert_eq!(first_power_of_two_above(1), 2);
        assert_eq!(first_power_of_two_above(8), 16);
        assert_eq!(first_power_of_two_above(1000), 1024);
    }
}
:::

:::solution
fn fizzbuzz(n: u32) -> String {
    if n % 15 == 0 {
        "FizzBuzz".to_string()
    } else if n % 3 == 0 {
        "Fizz".to_string()
    } else if n % 5 == 0 {
        "Buzz".to_string()
    } else {
        n.to_string()
    }
}

/// n 经过多少步变成 1：偶数 n/2，奇数 3n+1
fn collatz_steps(mut n: u64) -> u32 {
    let mut steps = 0;
    while n != 1 {
        if n % 2 == 0 {
            n /= 2;
        } else {
            n = 3 * n + 1;
        }
        steps += 1;
    }
    steps
}

/// 第一个大于 limit 的 2 的幂
fn first_power_of_two_above(limit: u32) -> u32 {
    let mut p = 1;
    loop {
        if p > limit {
            break p;
        }
        p *= 2;
    }
}

fn main() {
    for i in 1..=15 {
        println!("{}", fizzbuzz(i));
    }
    println!("27 需要 {} 步", collatz_steps(27));
    println!("大于 1000 的第一个 2 的幂: {}", first_power_of_two_above(1000));
}
:::

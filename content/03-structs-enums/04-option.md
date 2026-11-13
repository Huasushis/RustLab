---
title: Option：没有 null 的世界
---
Rust **没有** `null` / `nullptr` / `None` 这种「任何引用都可能是空」的东西。「可能没有值」用一个普通的枚举来表达：

```rust
enum Option<T> {
    Some(T),
    None,
}
```

`Option<i32>` 和 `i32` 是**两种不同的类型**。想用里面的值，必须先处理 `None` 的情况，否则编译不过。于是「忘了判空」这类 bug 从运行时崩溃变成了编译错误。

```rust
let v = vec![1, 2, 3];
let a: Option<&i32> = v.get(10);    // 越界时返回 None，不会 panic
let b: Option<char> = "".chars().next();
```

对应关系：C++ 的 `std::optional<T>`；Python 里类型标注为 `Optional[T]` 的值——区别是 Rust 强制你检查。

## 处理 Option 的几种方式

```rust
let maybe: Option<i32> = Some(5);

// 1. match：最基础
let doubled = match maybe {
    Some(n) => n * 2,
    None => 0,
};

// 2. 提供默认值
let n = maybe.unwrap_or(0);

// 3. 确定一定有值（否则 panic）。只在原型代码或确实不可能为 None 时使用
let n = maybe.unwrap();
let n = maybe.expect("这里必须有值");

// 4. ? 运算符：是 None 就让当前函数提前返回 None
fn first_plus_one(v: &[i32]) -> Option<i32> {
    let first = v.first()?;     // v 为空时直接 return None
    Some(first + 1)
}
```

还有一批组合子，如 `map`、`and_then`、`filter`，等学了闭包（第 8 章）会用得很顺手。

`Some` 和 `None` 可以直接写，不需要 `Option::` 前缀。

## 任务

1. `safe_div(a, b)`：`b` 为 0 时返回 `None`，否则返回 `Some(a / b)`
2. `find_first_even(nums)`：返回第一个偶数，没有则返回 `None`
3. `get_or_zero(v, i)`：返回下标 `i` 处的元素，越界时返回 0。`v.get(i)` 返回的是 `Option<&i32>`，`.copied()` 能把它变成 `Option<i32>`
4. `add_options(a, b)`：两个都是 `Some` 时返回它们的和，任何一个是 `None` 就返回 `None`

:::hint
`safe_div`：`if b == 0 { None } else { Some(a / b) }`。

`find_first_even`：用 `for &n in nums { if n % 2 == 0 { return Some(n); } }`，循环结束后返回 `None`。
:::

:::hint
`get_or_zero`：`v.get(i).copied().unwrap_or(0)`
:::

:::hint
`add_options` 有两种写法。用 `?`：`Some(a? + b?)`。或者匹配元组：
```rust
match (a, b) {
    (Some(x), Some(y)) => Some(x + y),
    _ => None,
}
```
:::

:::exercise
fn safe_div(a: i32, b: i32) -> Option<i32> {
    todo!()
}

fn find_first_even(nums: &[i32]) -> Option<i32> {
    todo!()
}

/// 下标 i 处的元素；越界时返回 0
fn get_or_zero(v: &[i32], i: usize) -> i32 {
    todo!()
}

/// 两个都有值才相加
fn add_options(a: Option<i32>, b: Option<i32>) -> Option<i32> {
    todo!()
}

fn main() {
    println!("{:?} {:?}", safe_div(7, 2), safe_div(1, 0));
    println!("{:?}", find_first_even(&[1, 3, 8, 5, 6]));
    println!("{}", get_or_zero(&[10, 20], 5));
    println!("{:?}", add_options(Some(1), Some(2)));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn safe_div_works() {
        assert_eq!(safe_div(7, 2), Some(3));
        assert_eq!(safe_div(-9, 3), Some(-3));
        assert_eq!(safe_div(1, 0), None);
    }

    #[test]
    fn find_first_even_works() {
        assert_eq!(find_first_even(&[1, 3, 8, 5, 6]), Some(8));
        assert_eq!(find_first_even(&[1, 3, 5]), None);
        assert_eq!(find_first_even(&[]), None);
    }

    #[test]
    fn get_or_zero_works() {
        assert_eq!(get_or_zero(&[10, 20], 1), 20);
        assert_eq!(get_or_zero(&[10, 20], 2), 0);
        assert_eq!(get_or_zero(&[], 0), 0);
    }

    #[test]
    fn add_options_works() {
        assert_eq!(add_options(Some(1), Some(2)), Some(3));
        assert_eq!(add_options(Some(1), None), None);
        assert_eq!(add_options(None, Some(2)), None);
        assert_eq!(add_options(None, None), None);
    }
}
:::

:::solution
fn safe_div(a: i32, b: i32) -> Option<i32> {
    if b == 0 { None } else { Some(a / b) }
}

fn find_first_even(nums: &[i32]) -> Option<i32> {
    for &n in nums {
        if n % 2 == 0 {
            return Some(n);
        }
    }
    None
}

/// 下标 i 处的元素；越界时返回 0
fn get_or_zero(v: &[i32], i: usize) -> i32 {
    v.get(i).copied().unwrap_or(0)
}

/// 两个都有值才相加
fn add_options(a: Option<i32>, b: Option<i32>) -> Option<i32> {
    Some(a? + b?)
}

fn main() {
    println!("{:?} {:?}", safe_div(7, 2), safe_div(1, 0));
    println!("{:?}", find_first_even(&[1, 3, 8, 5, 6]));
    println!("{}", get_or_zero(&[10, 20], 5));
    println!("{:?}", add_options(Some(1), Some(2)));
}
:::

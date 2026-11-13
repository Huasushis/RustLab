---
title: 迭代器工具箱
forbid: for | while | loop
---
`Iterator` trait 上有七十多个方法。这一关把最常用的过一遍，以后写循环之前，先想想有没有现成的。

## 更多适配器（惰性，返回新的迭代器）

```rust
it.enumerate()            // 带上下标：(0, a), (1, b), ...   相当于 Python 的 enumerate
a.iter().zip(b.iter())    // 两个迭代器配对：(a0, b0), (a1, b1), ...  以较短的为准
it.rev()                  // 反向
it.take(3)  it.skip(2)    // 取前 3 个 / 跳过前 2 个
it.take_while(|x| ..)     // 一直取到条件第一次不成立
it.chain(other)           // 首尾相接
it.flat_map(|x| ..)       // 每个元素映射成一个迭代器，再摊平
it.filter_map(|x| ..)     // 闭包返回 Option：None 的丢掉，Some 的拆开
```

## 更多消费者（立即求值）

```rust
it.fold(init, |acc, x| ..)       // 通用的累积，相当于 functools.reduce / std::accumulate
it.any(|x| ..)  it.all(|x| ..)   // 有任何一个 / 全部 满足，会短路
it.find(|x| ..)                  // 第一个满足条件的元素，Option
it.position(|x| ..)              // 第一个满足条件的下标，Option<usize>
it.min()  it.max()               // Option
it.max_by_key(|x| ..)            // 按某个键比较取最大
it.last()  it.nth(2)
```

## 切片上的好帮手

```rust
v.windows(2)      // 相邻的滑动窗口：[a,b], [b,c], [c,d] ...
v.chunks(3)       // 每 3 个一组
```

## 例子

```rust
// 判断是否是回文
let s = "level";
let is_pal = s.chars().eq(s.chars().rev());

// 把 "k=v;k=v" 解析成键值对，格式不对的跳过
let pairs: Vec<(&str, &str)> = "a=1;bad;b=2".split(';').filter_map(|p| p.split_once('=')).collect();
```

## 任务

本关同样禁止使用 `for`、`while`、`loop`。

1. `dot(a, b)`：两个向量的点积（对应位置相乘再求和）
2. `index_of_max(v)`：最大值的下标；空切片返回 `None`。测试数据里最大值不会重复
3. `is_sorted_asc(v)`：是否是非递减的（每个元素都不小于前一个）。空切片和单元素切片算已排序
4. `acronym(s)`：取每个单词的首字母并大写，拼成缩写。`"portable network graphics"` → `"PNG"`

:::hint
`dot`：`a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()`
:::

:::hint
`index_of_max`：`v.iter().enumerate().max_by_key(|(_, x)| **x).map(|(i, _)| i)`。`enumerate` 产出 `(usize, &i32)`，闭包参数是对这个元组的引用，所以取值要写 `**x`。
:::

:::hint
`is_sorted_asc`：`v.windows(2).all(|w| w[0] <= w[1])`

`acronym`：`s.split_whitespace().filter_map(|w| w.chars().next()).map(|c| c.to_ascii_uppercase()).collect()`
:::

:::exercise
/// 点积
fn dot(a: &[i32], b: &[i32]) -> i32 {
    todo!()
}

/// 最大值的下标
fn index_of_max(v: &[i32]) -> Option<usize> {
    todo!()
}

/// 是否非递减
fn is_sorted_asc(v: &[i32]) -> bool {
    todo!()
}

/// 首字母缩写
fn acronym(s: &str) -> String {
    todo!()
}

fn main() {
    println!("{}", dot(&[1, 2, 3], &[4, 5, 6]));
    println!("{:?}", index_of_max(&[3, 9, 2]));
    println!("{}", is_sorted_asc(&[1, 2, 2, 5]));
    println!("{}", acronym("portable network graphics"));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dot_works() {
        assert_eq!(dot(&[1, 2, 3], &[4, 5, 6]), 32);
        assert_eq!(dot(&[], &[]), 0);
        assert_eq!(dot(&[-1, 1], &[1, 1]), 0);
    }

    #[test]
    fn index_of_max_works() {
        assert_eq!(index_of_max(&[3, 9, 2]), Some(1));
        assert_eq!(index_of_max(&[-5, -2, -8]), Some(1));
        assert_eq!(index_of_max(&[7]), Some(0));
        assert_eq!(index_of_max(&[]), None);
    }

    #[test]
    fn is_sorted_asc_works() {
        assert!(is_sorted_asc(&[1, 2, 2, 5]));
        assert!(!is_sorted_asc(&[1, 3, 2]));
        assert!(is_sorted_asc(&[]));
        assert!(is_sorted_asc(&[42]));
    }

    #[test]
    fn acronym_works() {
        assert_eq!(acronym("portable network graphics"), "PNG");
        assert_eq!(acronym("  as soon   as possible "), "ASAP");
        assert_eq!(acronym("Rust"), "R");
        assert_eq!(acronym(""), "");
    }
}
:::

:::solution
/// 点积
fn dot(a: &[i32], b: &[i32]) -> i32 {
    a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
}

/// 最大值的下标
fn index_of_max(v: &[i32]) -> Option<usize> {
    v.iter().enumerate().max_by_key(|(_, x)| **x).map(|(i, _)| i)
}

/// 是否非递减
fn is_sorted_asc(v: &[i32]) -> bool {
    v.windows(2).all(|w| w[0] <= w[1])
}

/// 首字母缩写
fn acronym(s: &str) -> String {
    s.split_whitespace()
        .filter_map(|w| w.chars().next())
        .map(|c| c.to_ascii_uppercase())
        .collect()
}

fn main() {
    println!("{}", dot(&[1, 2, 3], &[4, 5, 6]));
    println!("{:?}", index_of_max(&[3, 9, 2]));
    println!("{}", is_sorted_asc(&[1, 2, 2, 5]));
    println!("{}", acronym("portable network graphics"));
}
:::

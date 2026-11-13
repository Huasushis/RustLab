---
title: Trait 约束
---
把泛型和 trait 结合起来：用 trait 限定「这个类型参数必须会做什么」。同一件事有三种写法：

```rust
use std::fmt::Display;

// 1. 尖括号里写 bound
fn show<T: Display>(item: T) -> String {
    format!("<{item}>")
}

// 2. impl Trait 语法：参数「是某个实现了 Display 的类型」，是写法 1 的简写
fn show(item: impl Display) -> String {
    format!("<{item}>")
}

// 3. where 子句：约束多的时候更清晰
fn show_both<T, U>(a: T, b: U) -> String
where
    T: Display + Clone,
    U: Display,
{
    format!("{a} {b}")
}
```

三种写法都是**静态分发**：编译器为每个具体类型生成一份代码，调用可以被内联。

`impl Trait` 也能用在返回值上，表示「返回某个实现了该 trait 的具体类型，但我不告诉你是哪个」，常用于返回闭包和迭代器（第 8 章）：

```rust
fn evens() -> impl Iterator<Item = u32> {
    (0..).step_by(2)
}
```

## 跟着编译器加约束

写泛型代码的日常流程是：先写函数体，编译，看报错，按提示补上 bound。例如：

```text
error[E0599]: the method `to_string` exists for reference `&T`, but its trait bounds were not satisfied
   = note: the following trait bounds were not satisfied: `T: std::fmt::Display`
help: consider restricting the type parameter to satisfy the trait bound
```

本关就是练这个。你会用到这些 bound：

| trait | 提供的能力 |
| --- | --- |
| `Display` | 用 `{}` 格式化、`.to_string()` |
| `Clone` | `.clone()`、`.to_vec()` |
| `Ord` | 全序比较，`.sort()` 需要它 |

## 任务

三个函数的**函数体都是对的**，只是签名里缺少约束或者不够通用。请只修改签名：

1. `join_all`：把每个元素格式化后用 `sep` 连接
2. `sorted_copy`：返回排好序的副本，不修改原切片
3. `total_area`：现在只接受两个 `Circle`，改成能接受**任意两个**实现了 `Area` 的类型（两个参数的类型可以不同）

:::hint
`join_all<T: Display>`：因为函数体里调用了 `item.to_string()`。
:::

:::hint
`sorted_copy<T: Ord + Clone>`：`to_vec()` 需要 `Clone`，`sort()` 需要 `Ord`。
:::

:::hint
`fn total_area(a: &impl Area, b: &impl Area) -> f64`。每个 `impl Area` 都是一个独立的类型参数，所以 `a` 和 `b` 可以是不同的类型。等价的写法是 `fn total_area<A: Area, B: Area>(a: &A, b: &B) -> f64`。
:::

:::exercise
use std::fmt::Display;

/// 把每个元素格式化后用 sep 连接
fn join_all<T>(items: &[T], sep: &str) -> String {
    let mut out = String::new();
    for (i, item) in items.iter().enumerate() {
        if i > 0 {
            out.push_str(sep);
        }
        out.push_str(&item.to_string());
    }
    out
}

/// 返回排好序的副本
fn sorted_copy<T>(items: &[T]) -> Vec<T> {
    let mut out = items.to_vec();
    out.sort();
    out
}

trait Area {
    fn area(&self) -> f64;
}

struct Circle(f64);
struct Square(f64);

impl Area for Circle {
    fn area(&self) -> f64 {
        std::f64::consts::PI * self.0 * self.0
    }
}

impl Area for Square {
    fn area(&self) -> f64 {
        self.0 * self.0
    }
}

fn total_area(a: &Circle, b: &Circle) -> f64 {
    a.area() + b.area()
}

fn main() {
    println!("{}", join_all(&[1, 2, 3], " + "));
    println!("{:?}", sorted_copy(&["pear", "apple", "fig"]));
    println!("{:.2}", total_area(&Circle(1.0), &Square(2.0)));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn join_all_works() {
        assert_eq!(join_all(&[1, 2, 3], " + "), "1 + 2 + 3");
        assert_eq!(join_all(&["a", "b"], ""), "ab");
        assert_eq!(join_all(&[1.5], ", "), "1.5");
        assert_eq!(join_all::<char>(&[], ", "), "");
    }

    #[test]
    fn sorted_copy_works() {
        let original = vec![3, 1, 2];
        assert_eq!(sorted_copy(&original), vec![1, 2, 3]);
        assert_eq!(original, vec![3, 1, 2]);
        assert_eq!(sorted_copy(&["pear", "apple", "fig"]), vec!["apple", "fig", "pear"]);
        assert_eq!(sorted_copy(&[String::from("b"), String::from("a")]), vec!["a", "b"]);
    }

    #[test]
    fn total_area_accepts_any_shapes() {
        assert_eq!(total_area(&Square(1.0), &Square(2.0)), 5.0);
        let mixed = total_area(&Circle(1.0), &Square(2.0));
        assert!((mixed - (std::f64::consts::PI + 4.0)).abs() < 1e-9);
        let mixed2 = total_area(&Square(2.0), &Circle(1.0));
        assert!((mixed - mixed2).abs() < 1e-9);
    }
}
:::

:::solution
use std::fmt::Display;

/// 把每个元素格式化后用 sep 连接
fn join_all<T: Display>(items: &[T], sep: &str) -> String {
    let mut out = String::new();
    for (i, item) in items.iter().enumerate() {
        if i > 0 {
            out.push_str(sep);
        }
        out.push_str(&item.to_string());
    }
    out
}

/// 返回排好序的副本
fn sorted_copy<T: Ord + Clone>(items: &[T]) -> Vec<T> {
    let mut out = items.to_vec();
    out.sort();
    out
}

trait Area {
    fn area(&self) -> f64;
}

struct Circle(f64);
struct Square(f64);

impl Area for Circle {
    fn area(&self) -> f64 {
        std::f64::consts::PI * self.0 * self.0
    }
}

impl Area for Square {
    fn area(&self) -> f64 {
        self.0 * self.0
    }
}

fn total_area(a: &impl Area, b: &impl Area) -> f64 {
    a.area() + b.area()
}

fn main() {
    println!("{}", join_all(&[1, 2, 3], " + "));
    println!("{:?}", sorted_copy(&["pear", "apple", "fig"]));
    println!("{:.2}", total_area(&Circle(1.0), &Square(2.0)));
}
:::

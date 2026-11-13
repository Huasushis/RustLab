---
title: Clone 与 Copy
---
上一关说「赋值即移动」，但你可能已经发现整数不是这样：

```rust
let a = 5;
let b = a;
println!("{a} {b}");   // ✅ 没问题
```

## Copy：按位复制就够了的类型

整数、浮点、`bool`、`char`，以及只由这些类型组成的元组和数组，都实现了 `Copy` trait。它们完全存在栈上，复制一份极其便宜，所以赋值时是**复制**，旧变量照常可用。

自己定义的类型默认**不是** `Copy`。如果所有字段都是 `Copy` 的，可以让编译器帮你实现：

```rust
#[derive(Debug, Clone, Copy)]
struct Point {
    x: i32,
    y: i32,
}
```

`#[derive(...)]` 让编译器自动生成 trait 的实现（trait 类似接口，后面有专门的章节）。`Copy` 要求同时实现 `Clone`，所以两个总是一起写。

## Clone：显式的深拷贝

`String`、`Vec` 这类拥有堆内存的类型不能是 `Copy`。想要一份独立的副本，必须**明确写出来**：

```rust
let s1 = String::from("hello");
let s2 = s1.clone();       // 堆上的数据被完整复制
println!("{s1} {s2}");     // ✅ 两个都能用
```

Rust 的设计哲学是：**昂贵的操作必须在代码里看得见**。C++ 里一个不起眼的 `=` 可能触发一次深拷贝；在 Rust 里，凡是没写 `.clone()` 的地方，就一定没有发生堆拷贝。

> 初学时遇到所有权报错就加 `.clone()`，这没什么可耻的。等学了借用，你自然会知道哪些 clone 可以去掉。

## 任务

1. 给 `Point` 加上合适的 `derive`，让它在传给 `mirror` 之后还能继续使用
2. 修好 `duplicate`：返回同一个字符串的两份

:::hint
把 `#[derive(Debug)]` 改成 `#[derive(Debug, Clone, Copy)]`，`Point` 就变成了「赋值即复制」的类型。
:::

:::hint
`(s, s)` 把 `s` 移动了两次。让其中一个是副本：`(s.clone(), s)`。顺序很重要——如果先移动再 clone，clone 的时候 `s` 已经失效了。
:::

:::exercise
#[derive(Debug)]
struct Point {
    x: i32,
    y: i32,
}

/// 关于 y 轴镜像
fn mirror(p: Point) -> Point {
    Point { x: -p.x, y: p.y }
}

/// 返回同一个字符串的两份
fn duplicate(s: String) -> (String, String) {
    (s, s)
}

fn main() {
    let p = Point { x: 3, y: 4 };
    let q = mirror(p);
    println!("{p:?} 的镜像是 {q:?}");
    println!("{:?}", duplicate(String::from("ab")));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn point_is_copy() {
        let p = Point { x: 3, y: 4 };
        let q = mirror(p);
        // 如果 Point 不是 Copy，下面使用 p 就会编译失败
        assert_eq!((p.x, p.y), (3, 4));
        assert_eq!((q.x, q.y), (-3, 4));
    }

    #[test]
    fn duplicate_works() {
        let (a, b) = duplicate(String::from("ab"));
        assert_eq!(a, "ab");
        assert_eq!(b, "ab");
    }
}
:::

:::solution
#[derive(Debug, Clone, Copy)]
struct Point {
    x: i32,
    y: i32,
}

/// 关于 y 轴镜像
fn mirror(p: Point) -> Point {
    Point { x: -p.x, y: p.y }
}

/// 返回同一个字符串的两份
fn duplicate(s: String) -> (String, String) {
    (s.clone(), s)
}

fn main() {
    let p = Point { x: 3, y: 4 };
    let q = mirror(p);
    println!("{p:?} 的镜像是 {q:?}");
    println!("{:?}", duplicate(String::from("ab")));
}
:::

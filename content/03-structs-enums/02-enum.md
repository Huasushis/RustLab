---
title: 带数据的枚举
---
C++ 的 `enum class` 和 Python 的 `Enum` 只是一组命名常量。Rust 的枚举强大得多：**每个变体都可以携带不同的数据**。

```rust
enum Message {
    Quit,                          // 不带数据
    Move { x: i32, y: i32 },       // 像结构体一样带具名字段
    Write(String),                 // 像元组一样带数据
    Color(u8, u8, u8),
}

let m = Message::Move { x: 3, y: -1 };
```

一个 `Message` 的值，在任一时刻是其中**恰好一种**。这在类型论里叫「和类型」（sum type），也叫 tagged union：

- C++ 里最接近的是 `std::variant<Quit, Move, Write, Color>`，配合 `std::visit`
- 面向对象的写法是一个基类加四个子类，再加虚函数
- Rust 把它做成了一等公民，并配有 `match`

## 用 match 取出数据

```rust
fn describe(m: &Message) -> String {
    match m {
        Message::Quit => "退出".to_string(),
        Message::Move { x, y } => format!("移动到 ({x}, {y})"),
        Message::Write(text) => format!("写入 {text}"),
        Message::Color(r, g, b) => format!("颜色 #{r:02x}{g:02x}{b:02x}"),
    }
}
```

`match` 有两个关键性质：

1. 它是**表达式**，每个分支的值就是整个 `match` 的值
2. 它必须**穷尽**所有情况。以后给 `Message` 加一个新变体，所有没处理它的 `match` 都会编译失败——编译器替你找出每一处需要修改的地方

枚举同样可以有 `impl` 块。

## 任务

为 `Shape` 实现两个方法：

- `area(&self) -> f64`：圆是 `PI * r²`，矩形是宽乘高，三角形是底乘高除以 2
- `name(&self) -> &str`：分别返回 `"圆"`、`"矩形"`、`"三角形"`

圆周率用标准库的常量 `std::f64::consts::PI`（代码里已经 `use` 好了）。

:::hint
```rust
match self {
    Shape::Circle { radius } => PI * radius * radius,
    Shape::Rect { width, height } => width * height,
    Shape::Triangle { base, height } => base * height / 2.0,
}
```
:::

:::hint
`name` 不关心数据，可以用 `..` 忽略全部字段：`Shape::Circle { .. } => "圆"`
:::

:::exercise
use std::f64::consts::PI;

enum Shape {
    Circle { radius: f64 },
    Rect { width: f64, height: f64 },
    Triangle { base: f64, height: f64 },
}

impl Shape {
    fn area(&self) -> f64 {
        todo!()
    }

    fn name(&self) -> &str {
        todo!()
    }
}

fn main() {
    let shapes = [
        Shape::Circle { radius: 1.0 },
        Shape::Rect { width: 2.0, height: 3.0 },
        Shape::Triangle { base: 4.0, height: 5.0 },
    ];
    for s in &shapes {
        println!("{} 的面积是 {:.2}", s.name(), s.area());
    }
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn area_works() {
        assert!((Shape::Circle { radius: 2.0 }.area() - 4.0 * PI).abs() < 1e-9);
        assert_eq!(Shape::Rect { width: 2.0, height: 3.5 }.area(), 7.0);
        assert_eq!(Shape::Triangle { base: 4.0, height: 5.0 }.area(), 10.0);
    }

    #[test]
    fn name_works() {
        assert_eq!(Shape::Circle { radius: 1.0 }.name(), "圆");
        assert_eq!(Shape::Rect { width: 1.0, height: 1.0 }.name(), "矩形");
        assert_eq!(Shape::Triangle { base: 1.0, height: 1.0 }.name(), "三角形");
    }
}
:::

:::solution
use std::f64::consts::PI;

enum Shape {
    Circle { radius: f64 },
    Rect { width: f64, height: f64 },
    Triangle { base: f64, height: f64 },
}

impl Shape {
    fn area(&self) -> f64 {
        match self {
            Shape::Circle { radius } => PI * radius * radius,
            Shape::Rect { width, height } => width * height,
            Shape::Triangle { base, height } => base * height / 2.0,
        }
    }

    fn name(&self) -> &str {
        match self {
            Shape::Circle { .. } => "圆",
            Shape::Rect { .. } => "矩形",
            Shape::Triangle { .. } => "三角形",
        }
    }
}

fn main() {
    let shapes = [
        Shape::Circle { radius: 1.0 },
        Shape::Rect { width: 2.0, height: 3.0 },
        Shape::Triangle { base: 4.0, height: 5.0 },
    ];
    for s in &shapes {
        println!("{} 的面积是 {:.2}", s.name(), s.area());
    }
}
:::

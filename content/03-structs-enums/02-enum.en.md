---
title: Enums That Carry Data
---
C++'s `enum class` and Python's `Enum` are just sets of named constants. Rust's enums are much more powerful: **each variant can carry different data**.

```rust
enum Message {
    Quit,                          // no data
    Move { x: i32, y: i32 },       // named fields, like a struct
    Write(String),                 // data, like a tuple
    Color(u8, u8, u8),
}

let m = Message::Move { x: 3, y: -1 };
```

A `Message` value is **exactly one** of these at any time. Type theory calls this a "sum type", also known as a tagged union:

- The closest C++ equivalent is `std::variant<Quit, Move, Write, Color>` with `std::visit`
- The object-oriented way is a base class with four subclasses and virtual functions
- Rust makes it a first-class feature and pairs it with `match`

## Getting the data out with match

```rust
fn describe(m: &Message) -> String {
    match m {
        Message::Quit => "quit".to_string(),
        Message::Move { x, y } => format!("move to ({x}, {y})"),
        Message::Write(text) => format!("write {text}"),
        Message::Color(r, g, b) => format!("color #{r:02x}{g:02x}{b:02x}"),
    }
}
```

`match` has two key properties:

1. It is an **expression**: the value of the chosen arm is the value of the whole `match`
2. It must be **exhaustive**. Add a new variant to `Message` later and every `match` that doesn't handle it stops compiling — the compiler finds every place you need to update

Enums can have `impl` blocks too.

## Task

Implement two methods for `Shape`:

- `area(&self) -> f64`: a circle is `PI * r²`, a rectangle is width times height, a triangle is base times height divided by 2
- `name(&self) -> &str`: return `"circle"`, `"rectangle"` and `"triangle"` respectively

Use the standard library constant `std::f64::consts::PI` for π (already imported with `use`).

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
`name` doesn't care about the data; ignore all fields with `..`: `Shape::Circle { .. } => "circle"`
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
        println!("the area of the {} is {:.2}", s.name(), s.area());
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
        assert_eq!(Shape::Circle { radius: 1.0 }.name(), "circle");
        assert_eq!(Shape::Rect { width: 1.0, height: 1.0 }.name(), "rectangle");
        assert_eq!(Shape::Triangle { base: 1.0, height: 1.0 }.name(), "triangle");
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
            Shape::Circle { .. } => "circle",
            Shape::Rect { .. } => "rectangle",
            Shape::Triangle { .. } => "triangle",
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
        println!("the area of the {} is {:.2}", s.name(), s.area());
    }
}
:::

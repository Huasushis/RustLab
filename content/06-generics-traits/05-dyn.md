---
title: Trait 对象与动态分发
---
泛型是**静态分发**：`Vec<T>` 里所有元素必须是同一个 `T`。那如果想在一个 `Vec` 里同时放圆形和矩形呢？

一种办法是用枚举把它们包起来（第 3 章的 `Shape`）。当种类是**开放**的，比如允许库的使用者添加自己的形状时，就需要 **trait 对象**：

```rust
trait Shape {
    fn area(&self) -> f64;
}

let shapes: Vec<Box<dyn Shape>> = vec![
    Box::new(Circle { r: 1.0 }),
    Box::new(Rect { w: 2.0, h: 3.0 }),
];

for s in &shapes {
    println!("{}", s.area());      // 运行时才决定调用哪个 area
}
```

`dyn Shape` 读作「某个实现了 `Shape` 的类型，具体是哪个要到运行时才知道」。因为大小在编译期未知，它必须躲在指针后面：`Box<dyn Shape>`、`&dyn Shape`、`Rc<dyn Shape>` 都可以。`Box<T>` 是指向堆的独占指针，相当于 `std::unique_ptr<T>`，第 9 章会细讲。

## 这就是虚函数

`&dyn Shape` 是一个**胖指针**：一个指针指向数据，另一个指向**虚表**（vtable）。调用方法时通过虚表间接跳转，和 C++ 的 `virtual` 完全是一回事。

区别在于虚表指针放在哪：C++ 放在**对象里**（每个带虚函数的对象多 8 字节）；Rust 放在**指针里**。所以同一个 `Circle`，直接用时没有任何额外开销，只有被当成 `dyn Shape` 使用时才付出动态分发的代价。

## 怎么选

| | 泛型 `impl Trait` / `T: Trait` | trait 对象 `dyn Trait` |
| --- | --- | --- |
| 分发 | 静态，可内联 | 动态，查虚表 |
| 代码体积 | 每个类型生成一份 | 只有一份 |
| 一个集合里放多种类型 | 不行 | 可以 |

默认用泛型；需要异构集合，或者类型要到运行时才能确定（比如根据配置创建不同的对象）时用 `dyn`。

## 任务

`Shape` trait 以及 `Circle`、`Rect` 都已经实现好了。请完成：

1. `total_area(shapes)`：所有形状的面积之和
2. `largest_name(shapes)`：面积最大的形状的名字；没有形状时返回 `None`
3. `make_shape(kind, size)`：一个小工厂函数
   - `"circle"` → 半径为 `size` 的圆
   - `"square"` → 边长为 `size` 的 `Rect`
   - 其它 → `None`

:::hint
`total_area`：`let mut sum = 0.0; for s in shapes { sum += s.area(); } sum`。对 `Box<dyn Shape>` 调用方法和对普通值一样，用 `.` 即可。
:::

:::hint
`largest_name`：用 `let mut best: Option<&Box<dyn Shape>> = None;` 记录目前面积最大的，遍历时比较 `s.area()`；最后 `best.map(|s| s.name())`。
:::

:::hint
`make_shape`：
```rust
match kind {
    "circle" => Some(Box::new(Circle { r: size })),
    "square" => Some(Box::new(Rect { w: size, h: size })),
    _ => None,
}
```
两个分支产生了不同的具体类型，但因为返回类型写明了是 `Box<dyn Shape>`，它们都会自动转换成 trait 对象。
:::

:::exercise
use std::f64::consts::PI;

trait Shape {
    fn area(&self) -> f64;
    fn name(&self) -> String;
}

struct Circle {
    r: f64,
}

struct Rect {
    w: f64,
    h: f64,
}

impl Shape for Circle {
    fn area(&self) -> f64 {
        PI * self.r * self.r
    }
    fn name(&self) -> String {
        "圆".to_string()
    }
}

impl Shape for Rect {
    fn area(&self) -> f64 {
        self.w * self.h
    }
    fn name(&self) -> String {
        "矩形".to_string()
    }
}

fn total_area(shapes: &[Box<dyn Shape>]) -> f64 {
    todo!()
}

/// 面积最大的形状的名字
fn largest_name(shapes: &[Box<dyn Shape>]) -> Option<String> {
    todo!()
}

/// 根据名字创建形状："circle" 或 "square"
fn make_shape(kind: &str, size: f64) -> Option<Box<dyn Shape>> {
    todo!()
}

fn main() {
    let mut shapes: Vec<Box<dyn Shape>> = vec![Box::new(Circle { r: 1.0 }), Box::new(Rect { w: 2.0, h: 3.0 })];
    if let Some(s) = make_shape("square", 1.5) {
        shapes.push(s);
    }
    println!("总面积: {:.2}", total_area(&shapes));
    println!("最大的是: {:?}", largest_name(&shapes));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> Vec<Box<dyn Shape>> {
        vec![
            Box::new(Circle { r: 1.0 }),
            Box::new(Rect { w: 2.0, h: 3.0 }),
            Box::new(Rect { w: 1.0, h: 1.0 }),
        ]
    }

    #[test]
    fn total_area_works() {
        assert!((total_area(&sample()) - (PI + 7.0)).abs() < 1e-9);
        assert_eq!(total_area(&[]), 0.0);
    }

    #[test]
    fn largest_name_works() {
        assert_eq!(largest_name(&sample()), Some("矩形".to_string()));
        let shapes: Vec<Box<dyn Shape>> = vec![Box::new(Rect { w: 1.0, h: 1.0 }), Box::new(Circle { r: 5.0 })];
        assert_eq!(largest_name(&shapes), Some("圆".to_string()));
        assert_eq!(largest_name(&[]), None);
    }

    #[test]
    fn make_shape_works() {
        let c = make_shape("circle", 2.0).expect("应该能创建圆");
        assert_eq!(c.name(), "圆");
        assert!((c.area() - 4.0 * PI).abs() < 1e-9);
        let s = make_shape("square", 3.0).expect("应该能创建正方形");
        assert_eq!(s.name(), "矩形");
        assert_eq!(s.area(), 9.0);
        assert!(make_shape("hexagon", 1.0).is_none());
    }
}
:::

:::solution
use std::f64::consts::PI;

trait Shape {
    fn area(&self) -> f64;
    fn name(&self) -> String;
}

struct Circle {
    r: f64,
}

struct Rect {
    w: f64,
    h: f64,
}

impl Shape for Circle {
    fn area(&self) -> f64 {
        PI * self.r * self.r
    }
    fn name(&self) -> String {
        "圆".to_string()
    }
}

impl Shape for Rect {
    fn area(&self) -> f64 {
        self.w * self.h
    }
    fn name(&self) -> String {
        "矩形".to_string()
    }
}

fn total_area(shapes: &[Box<dyn Shape>]) -> f64 {
    let mut sum = 0.0;
    for s in shapes {
        sum += s.area();
    }
    sum
}

/// 面积最大的形状的名字
fn largest_name(shapes: &[Box<dyn Shape>]) -> Option<String> {
    let mut best: Option<&Box<dyn Shape>> = None;
    for s in shapes {
        match best {
            Some(b) if b.area() >= s.area() => {}
            _ => best = Some(s),
        }
    }
    best.map(|s| s.name())
}

/// 根据名字创建形状："circle" 或 "square"
fn make_shape(kind: &str, size: f64) -> Option<Box<dyn Shape>> {
    match kind {
        "circle" => Some(Box::new(Circle { r: size })),
        "square" => Some(Box::new(Rect { w: size, h: size })),
        _ => None,
    }
}

fn main() {
    let mut shapes: Vec<Box<dyn Shape>> = vec![Box::new(Circle { r: 1.0 }), Box::new(Rect { w: 2.0, h: 3.0 })];
    if let Some(s) = make_shape("square", 1.5) {
        shapes.push(s);
    }
    println!("总面积: {:.2}", total_area(&shapes));
    println!("最大的是: {:?}", largest_name(&shapes));
}
:::

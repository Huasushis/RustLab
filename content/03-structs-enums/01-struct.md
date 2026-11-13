---
title: 结构体与方法
---
## 定义与创建

```rust
struct User {
    name: String,
    age: u32,
}

let name = String::from("Ada");
let u = User { name, age: 36 };          // 字段名和变量名相同时可以简写
let older = User { age: 37, ..u };       // 其余字段取自 u（注意 u.name 被移动走了）
println!("{}", older.name);
```

还有两种变体：**元组结构体** `struct Rgb(u8, u8, u8);`（用 `.0 .1 .2` 访问）和**单元结构体** `struct Marker;`。

## 方法写在 impl 块里

Rust 把数据（`struct`）和行为（`impl`）分开写：

```rust
impl User {
    // 没有 self 参数的是「关联函数」，用 User::new(...) 调用，相当于静态方法
    fn new(name: &str, age: u32) -> Self {
        Self { name: name.to_string(), age }
    }

    fn greeting(&self) -> String {            // 只读借用自己
        format!("我是{}", self.name)
    }

    fn birthday(&mut self) {                  // 可变借用自己
        self.age += 1;
    }

    fn into_name(self) -> String {            // 拿走所有权，调用后原对象不能再用
        self.name
    }
}
```

`self` 的三种形式正好对应上一章的三种传参方式，而且**必须显式写出来**——和 Python 的 `self` 类似，比 C++ 隐式的 `this` 更清楚。

## 和 C++ / Python 的类对比

- **没有构造函数**。`new` 只是约定俗成的名字，本质是普通的关联函数。
- **没有继承**。代码复用靠组合和 trait（第 6 章）。
- 字段默认私有（对模块外而言，第 10 章），没有 `public:` / `private:` 区段。
- `#[derive(Debug)]` 让结构体能用 `{:?}` 打印，相当于自动生成的 `__repr__`。

## 任务

为 `Rectangle` 实现五个方法：

| 方法 | 作用 |
| --- | --- |
| `new(width, height)` | 创建矩形 |
| `square(side)` | 创建正方形 |
| `area(&self)` | 面积 |
| `can_hold(&self, other)` | 自己的宽和高是否都**严格大于** `other` |
| `scale(&mut self, factor)` | 宽高都乘以 `factor` |

:::hint
`new` 的函数体：`Self { width, height }`。`square` 可以复用它：`Self::new(side, side)`。
:::

:::hint
`can_hold`：`self.width > other.width && self.height > other.height`。`scale`：`self.width *= factor; self.height *= factor;`
:::

:::exercise
#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    fn new(width: u32, height: u32) -> Self {
        todo!()
    }

    fn square(side: u32) -> Self {
        todo!()
    }

    fn area(&self) -> u32 {
        todo!()
    }

    /// 自己是否能完全装下 other（宽和高都严格大于对方）
    fn can_hold(&self, other: &Rectangle) -> bool {
        todo!()
    }

    fn scale(&mut self, factor: u32) {
        todo!()
    }
}

fn main() {
    let mut a = Rectangle::new(30, 50);
    let b = Rectangle::square(20);
    println!("a = {a:?}，面积 {}", a.area());
    println!("a 能装下 b 吗？{}", a.can_hold(&b));
    a.scale(2);
    println!("放大后 a = {a:?}");
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn constructors() {
        let r = Rectangle::new(3, 4);
        assert_eq!((r.width, r.height), (3, 4));
        let s = Rectangle::square(5);
        assert_eq!((s.width, s.height), (5, 5));
    }

    #[test]
    fn area_works() {
        assert_eq!(Rectangle::new(3, 4).area(), 12);
        assert_eq!(Rectangle::square(5).area(), 25);
    }

    #[test]
    fn can_hold_works() {
        let big = Rectangle::new(8, 7);
        let small = Rectangle::new(5, 1);
        assert!(big.can_hold(&small));
        assert!(!small.can_hold(&big));
        assert!(!big.can_hold(&Rectangle::new(8, 1)));
    }

    #[test]
    fn scale_works() {
        let mut r = Rectangle::new(2, 3);
        r.scale(3);
        assert_eq!((r.width, r.height), (6, 9));
    }
}
:::

:::solution
#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    fn new(width: u32, height: u32) -> Self {
        Self { width, height }
    }

    fn square(side: u32) -> Self {
        Self::new(side, side)
    }

    fn area(&self) -> u32 {
        self.width * self.height
    }

    /// 自己是否能完全装下 other（宽和高都严格大于对方）
    fn can_hold(&self, other: &Rectangle) -> bool {
        self.width > other.width && self.height > other.height
    }

    fn scale(&mut self, factor: u32) {
        self.width *= factor;
        self.height *= factor;
    }
}

fn main() {
    let mut a = Rectangle::new(30, 50);
    let b = Rectangle::square(20);
    println!("a = {a:?}，面积 {}", a.area());
    println!("a 能装下 b 吗？{}", a.can_hold(&b));
    a.scale(2);
    println!("放大后 a = {a:?}");
}
:::

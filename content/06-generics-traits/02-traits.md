---
title: 定义与实现 Trait
---
**trait** 描述「一个类型能做什么」，是 Rust 里共享行为的唯一方式。

```rust
trait Summary {
    fn title(&self) -> String;                 // 必须实现的方法（只有签名）

    fn summarize(&self) -> String {            // 带默认实现的方法，可以直接继承，也可以覆盖
        format!("《{}》……（阅读全文）", self.title())
    }
}

struct Article { headline: String }

impl Summary for Article {
    fn title(&self) -> String {
        self.headline.clone()
    }
    // summarize 用默认实现
}
```

## 类比

| | |
| --- | --- |
| Java / C# | `interface`（可以带默认方法） |
| C++ | 纯虚基类，或者 C++20 的 concept |
| Python | `Protocol` / 抽象基类 |

但有两点很不一样：

**1. 实现和类型定义是分开的。** `impl Summary for Article` 不需要写在 `Article` 的定义里。这意味着你可以为**别人的类型**（甚至 `i32`、`Vec<T>`）实现你自己的 trait：

```rust
impl Summary for i32 {
    fn title(&self) -> String { format!("数字 {self}") }
}
println!("{}", 42.summarize());
```

限制只有一条（**孤儿规则**）：trait 和类型至少有一个是你自己的 crate 定义的。你不能给别人的类型实现别人的 trait。

**2. 没有继承。** 没有「基类的字段」这回事，trait 只描述行为。想复用数据就用组合。

## 调用 trait 方法

和普通方法一样用 `.` 调用。前提是这个 trait **在当前作用域里**——所以有时用标准库的方法前，需要先 `use` 对应的 trait。

## 任务

trait `Describe` 已经给出，其中 `describe` 有默认实现。

1. 为 `Dog` 实现 `Describe`：`name` 返回 `"小狗"`，`describe` 用默认实现
2. 为 `Robot` 实现 `Describe`：`name` 返回 `机器人#` 加上它的 `id`，例如 `机器人#7`；并**覆盖** `describe`，返回 `哔哔，机器人#7 报到`

:::hint
```rust
impl Describe for Dog {
    fn name(&self) -> String {
        "小狗".to_string()
    }
}
```
:::

:::hint
`Robot` 的 `name`：`format!("机器人#{}", self.id)`。覆盖 `describe` 就是在同一个 `impl` 块里再写一遍这个方法：`format!("哔哔，{} 报到", self.name())`。
:::

:::exercise
trait Describe {
    fn name(&self) -> String;

    fn describe(&self) -> String {
        format!("我是{}", self.name())
    }
}

struct Dog;

struct Robot {
    id: u32,
}

// TODO: 为 Dog 和 Robot 实现 Describe

fn main() {
    let dog = Dog;
    let robot = Robot { id: 7 };
    println!("{}", dog.describe());
    println!("{}", robot.describe());
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dog_uses_default() {
        assert_eq!(Dog.name(), "小狗");
        assert_eq!(Dog.describe(), "我是小狗");
    }

    #[test]
    fn robot_overrides() {
        let r = Robot { id: 7 };
        assert_eq!(r.name(), "机器人#7");
        assert_eq!(r.describe(), "哔哔，机器人#7 报到");
        assert_eq!(Robot { id: 42 }.describe(), "哔哔，机器人#42 报到");
    }
}
:::

:::solution
trait Describe {
    fn name(&self) -> String;

    fn describe(&self) -> String {
        format!("我是{}", self.name())
    }
}

struct Dog;

struct Robot {
    id: u32,
}

impl Describe for Dog {
    fn name(&self) -> String {
        "小狗".to_string()
    }
}

impl Describe for Robot {
    fn name(&self) -> String {
        format!("机器人#{}", self.id)
    }

    fn describe(&self) -> String {
        format!("哔哔，{} 报到", self.name())
    }
}

fn main() {
    let dog = Dog;
    let robot = Robot { id: 7 };
    println!("{}", dog.describe());
    println!("{}", robot.describe());
}
:::

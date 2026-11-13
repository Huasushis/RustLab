---
title: 标准库里的常用 Trait
---
Rust 的很多「语言特性」其实都是 trait。运算符、打印、比较、复制、哈希……想让你的类型支持它们，实现对应的 trait 就行。

## 可以 derive 的

只要所有字段都支持，就能让编译器自动生成：

| trait | 得到的能力 | 类比 |
| --- | --- | --- |
| `Debug` | `{:?}` 打印 | `__repr__` |
| `Clone` | `.clone()` | 拷贝构造函数 |
| `Copy` | 赋值即复制（要求同时有 `Clone`） | 平凡可拷贝类型 |
| `PartialEq` / `Eq` | `==` `!=` | `operator==` / `__eq__` |
| `PartialOrd` / `Ord` | `<` `>`、排序（按字段顺序逐个比较） | `operator<=>` |
| `Hash` | 能当 `HashMap` 的键、放进 `HashSet` | `std::hash` / `__hash__` |
| `Default` | `T::default()` 给出默认值 | 默认构造函数 |

```rust
#[derive(Debug, Clone, PartialEq, Default)]
struct Config {
    name: String,
    retries: u32,
}
```

`PartialEq` 和 `Eq` 的区别：`Eq` 额外承诺「自己一定等于自己」。浮点数因为 `NaN != NaN` 只有 `PartialEq`，所以含浮点字段的类型不能 derive `Eq` 和 `Hash`。

## 需要手写的

**`Display`**：给用户看的格式，没有「显然正确」的默认实现，所以必须手写（上一章的错误类型里已经写过一次）。

**运算符重载**：每个运算符对应 `std::ops` 里的一个 trait。

```rust
use std::ops::Add;

impl Add for Meters {
    type Output = Meters;                   // 关联类型：加法结果的类型
    fn add(self, other: Meters) -> Meters {
        Meters(self.0 + other.0)
    }
}
// 现在可以写 Meters(1.0) + Meters(2.0)
```

对比 C++ 的 `operator+`：Rust 只能重载这组固定的运算符，不能发明新的运算符，也不能重载赋值和 `&&`、`||`。

**`From` / `Into`**：类型转换。实现 `From<A> for B` 后，`B::from(a)` 和 `a.into()` 都能用（上一章用它转换过错误类型）。

## 任务

让二维整数向量 `Vec2` 用起来像个内置类型：

1. 加上合适的 `derive`，让它支持：`{:?}` 打印、赋值即复制、`==` 比较、放进 `HashSet`、`Vec2::default()`
2. 实现 `Add`，让两个向量可以用 `+` 相加
3. 实现 `Display`，输出形如 `(1, 2)`

:::hint
`#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Default)]`。放进 `HashSet` 同时需要 `Eq` 和 `Hash`。
:::

:::hint
```rust
impl Add for Vec2 {
    type Output = Vec2;
    fn add(self, other: Vec2) -> Vec2 {
        Vec2 { x: self.x + other.x, y: self.y + other.y }
    }
}
```
:::

:::hint
```rust
impl fmt::Display for Vec2 {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}
```
:::

:::exercise
use std::fmt;
use std::ops::Add;

// TODO: 加上需要的 derive
struct Vec2 {
    x: i32,
    y: i32,
}

// TODO: impl Add for Vec2

// TODO: impl fmt::Display for Vec2

fn main() {
    let a = Vec2 { x: 1, y: 2 };
    let b = Vec2 { x: 3, y: 4 };
    let c = a + b;
    println!("{a} + {b} = {c}");
    println!("{c:?}，是否等于 (4, 6)：{}", c == Vec2 { x: 4, y: 6 });
    println!("默认值: {}", Vec2::default());
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn add_and_eq() {
        let a = Vec2 { x: 1, y: 2 };
        let b = Vec2 { x: 3, y: 4 };
        assert_eq!(a + b, Vec2 { x: 4, y: 6 });
        // a 和 b 在相加之后还能用，说明 Vec2 是 Copy
        assert_eq!(a + a, Vec2 { x: 2, y: 4 });
        assert_ne!(a, b);
    }

    #[test]
    fn display_and_debug() {
        let v = Vec2 { x: -1, y: 20 };
        assert_eq!(format!("{v}"), "(-1, 20)");
        assert_eq!(format!("{v:?}"), "Vec2 { x: -1, y: 20 }");
    }

    #[test]
    fn default_is_origin() {
        assert_eq!(Vec2::default(), Vec2 { x: 0, y: 0 });
    }

    #[test]
    fn usable_in_hash_set() {
        let mut seen = HashSet::new();
        seen.insert(Vec2 { x: 1, y: 1 });
        seen.insert(Vec2 { x: 1, y: 1 });
        seen.insert(Vec2 { x: 2, y: 1 });
        assert_eq!(seen.len(), 2);
    }
}
:::

:::solution
use std::fmt;
use std::ops::Add;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Default)]
struct Vec2 {
    x: i32,
    y: i32,
}

impl Add for Vec2 {
    type Output = Vec2;

    fn add(self, other: Vec2) -> Vec2 {
        Vec2 { x: self.x + other.x, y: self.y + other.y }
    }
}

impl fmt::Display for Vec2 {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}

fn main() {
    let a = Vec2 { x: 1, y: 2 };
    let b = Vec2 { x: 3, y: 4 };
    let c = a + b;
    println!("{a} + {b} = {c}");
    println!("{c:?}，是否等于 (4, 6)：{}", c == Vec2 { x: 4, y: 6 });
    println!("默认值: {}", Vec2::default());
}
:::

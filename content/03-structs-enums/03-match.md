---
title: 模式匹配
---
`match` 不只能匹配枚举。它的每个分支左边是一个**模式**，模式可以相当丰富：

```rust
let n = 42;
let kind = match n {
    0 => "零",                     // 字面量
    1 | 2 | 3 => "很小",           // 多个模式用 | 连接
    4..=9 => "个位数",             // 闭区间
    x if x % 2 == 0 => "偶数",     // 绑定到变量 x，再加一个「守卫」条件
    _ => "其它",                   // _ 匹配一切，相当于 default
};
```

## 解构

模式可以把元组、结构体、枚举拆开，同时匹配其中的一部分：

```rust
let point = (0, 7);
match point {
    (0, 0) => println!("原点"),
    (0, y) => println!("在 y 轴上，y = {y}"),
    (x, 0) => println!("在 x 轴上，x = {x}"),
    (x, y) => println!("({x}, {y})"),
}
```

分支**从上到下**依次尝试，第一个匹配的生效，所以更具体的模式要写在前面。

把多个值组成元组再 `match`，是替代多层 `if / else` 的常用技巧：

```rust
match (n % 3 == 0, n % 5 == 0) {
    (true, true) => "FizzBuzz",
    (true, false) => "Fizz",
    (false, true) => "Buzz",
    (false, false) => "",
}
```

## 和 switch 的区别

- 不会「贯穿」到下一个分支，不需要 `break`
- 必须穷尽所有可能，漏了就编译失败
- 是表达式，能直接产生值

Python 3.10 的 `match` 语句和它很像，区别是 Rust 会在编译期检查穷尽性和类型。

> 返回类型里的 `&'static str` 表示「在整个程序运行期间都有效的字符串切片」。字符串字面量就是这种类型。`'static` 是一个生命周期，第 7 章会专门讲，这里先照着写。

## 任务

1. `describe(n)`：负数返回 `"负数"`，0 返回 `"零"`，1 到 9 返回 `"个位数"`，10 到 99 返回 `"两位数"`，其余返回 `"很大"`
2. `quadrant(point)`：`(0, 0)` 返回 `"原点"`；在坐标轴上返回 `"坐标轴"`；否则返回 `"第一象限"` 到 `"第四象限"`（x、y 都为正是第一象限，逆时针依次是二、三、四）

两个函数都用 `match` 实现。

:::hint
`describe`：区间可以只写一端。`i32::MIN..=-1 => "负数"`，或者用守卫 `x if x < 0 => "负数"`。接着是 `0`、`1..=9`、`10..=99`，最后 `_ => "很大"`。
:::

:::hint
`quadrant`：先写 `(0, 0)`，再写 `(0, _) | (_, 0) => "坐标轴"`，之后用守卫区分象限，例如 `(x, y) if x > 0 && y > 0 => "第一象限"`。最后一个象限可以直接用 `_` 兜底。
:::

:::exercise
fn describe(n: i32) -> &'static str {
    todo!()
}

/// 判断点所在的位置：原点 / 坐标轴 / 第一象限 ~ 第四象限
fn quadrant(point: (i32, i32)) -> &'static str {
    todo!()
}

fn main() {
    for n in [-5, 0, 7, 42, 1000] {
        println!("{n}: {}", describe(n));
    }
    for p in [(0, 0), (3, 0), (1, 1), (-1, 1), (-1, -1), (1, -1)] {
        println!("{p:?}: {}", quadrant(p));
    }
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn describe_works() {
        assert_eq!(describe(-1), "负数");
        assert_eq!(describe(i32::MIN), "负数");
        assert_eq!(describe(0), "零");
        assert_eq!(describe(1), "个位数");
        assert_eq!(describe(9), "个位数");
        assert_eq!(describe(10), "两位数");
        assert_eq!(describe(99), "两位数");
        assert_eq!(describe(100), "很大");
        assert_eq!(describe(i32::MAX), "很大");
    }

    #[test]
    fn quadrant_works() {
        assert_eq!(quadrant((0, 0)), "原点");
        assert_eq!(quadrant((0, 5)), "坐标轴");
        assert_eq!(quadrant((-2, 0)), "坐标轴");
        assert_eq!(quadrant((1, 1)), "第一象限");
        assert_eq!(quadrant((-1, 1)), "第二象限");
        assert_eq!(quadrant((-1, -1)), "第三象限");
        assert_eq!(quadrant((1, -1)), "第四象限");
    }
}
:::

:::solution
fn describe(n: i32) -> &'static str {
    match n {
        x if x < 0 => "负数",
        0 => "零",
        1..=9 => "个位数",
        10..=99 => "两位数",
        _ => "很大",
    }
}

/// 判断点所在的位置：原点 / 坐标轴 / 第一象限 ~ 第四象限
fn quadrant(point: (i32, i32)) -> &'static str {
    match point {
        (0, 0) => "原点",
        (0, _) | (_, 0) => "坐标轴",
        (x, y) if x > 0 && y > 0 => "第一象限",
        (x, y) if x < 0 && y > 0 => "第二象限",
        (x, y) if x < 0 && y < 0 => "第三象限",
        _ => "第四象限",
    }
}

fn main() {
    for n in [-5, 0, 7, 42, 1000] {
        println!("{n}: {}", describe(n));
    }
    for p in [(0, 0), (3, 0), (1, 1), (-1, 1), (-1, -1), (1, -1)] {
        println!("{p:?}: {}", quadrant(p));
    }
}
:::

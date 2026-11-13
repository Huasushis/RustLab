---
title: 泛型
---
泛型让一份代码适用于多种类型。你已经用了很久了：`Vec<T>`、`Option<T>`、`Result<T, E>` 都是泛型类型。

```rust
fn first<T>(items: &[T]) -> Option<&T> {    // <T> 声明一个类型参数
    items.first()
}

struct Pair<T> {
    a: T,
    b: T,
}

impl<T> Pair<T> {                            // impl 后面也要声明 <T>
    fn new(a: T, b: T) -> Self {
        Pair { a, b }
    }
}
```

## 和 C++ 模板的异同

**相同点**：都是编译期**单态化**（monomorphization）。编译器为每个实际用到的类型生成一份专用代码，没有任何运行时开销，这就是所谓的「零成本抽象」。

**不同点**：C++ 模板是「鸭子类型」，模板体里可以对 `T` 做任何操作，等实例化时才检查，所以报错往往又长又难懂。Rust 要求**在定义处就声明 `T` 需要具备哪些能力**，这叫 **trait bound**：

```rust
fn largest<T>(a: T, b: T) -> T {
    if a > b { a } else { b }      // ❌ 不是所有类型都能比较大小
}

fn largest<T: PartialOrd>(a: T, b: T) -> T {   // ✅ 要求 T 实现了 PartialOrd
    if a > b { a } else { b }
}
```

泛型函数的函数体只能使用 bound 承诺过的能力，所以它只要自己能通过编译，对任何满足 bound 的类型就都是对的。（C++20 的 concepts 是同一个思路。）

本关会用到的几个 bound：

| trait | 提供的能力 |
| --- | --- |
| `PartialOrd` | 用 `<` `>` 比较 |
| `Copy` | 按位复制，赋值后原值仍可用 |

多个 bound 用 `+` 连接：`T: PartialOrd + Copy`。下一关开始系统地讲 trait。

## 任务

1. `largest` 现在只能处理 `i32`，把它改成泛型，让它也能用于 `f64`、`char` 等类型
2. `Pair` 现在只能存 `i32`，把它改成泛型结构体，并保留 `swap` 方法

:::hint
`largest` 的签名改成 `fn largest<T: PartialOrd + Copy>(items: &[T]) -> Option<T>`，函数体一个字都不用改。需要 `Copy` 是因为 `*items.first()?` 和 `for &x in items` 都要把元素从切片里复制出来。
:::

:::hint
```rust
struct Pair<T> {
    a: T,
    b: T,
}

impl<T> Pair<T> {
    fn swap(self) -> Pair<T> {
        Pair { a: self.b, b: self.a }
    }
}
```
:::

:::exercise
/// 返回切片里最大的元素；空切片返回 None
fn largest(items: &[i32]) -> Option<i32> {
    let mut best = *items.first()?;
    for &x in items {
        if x > best {
            best = x;
        }
    }
    Some(best)
}

struct Pair {
    a: i32,
    b: i32,
}

impl Pair {
    /// 交换两个元素
    fn swap(self) -> Pair {
        Pair { a: self.b, b: self.a }
    }
}

fn main() {
    println!("{:?}", largest(&[3, 9, 2]));
    let p = Pair { a: 1, b: 2 }.swap();
    println!("({}, {})", p.a, p.b);
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn largest_is_generic() {
        assert_eq!(largest(&[3, 9, 2]), Some(9));
        assert_eq!(largest(&[1.5, 0.2, -3.0]), Some(1.5));
        assert_eq!(largest(&['r', 'u', 's', 't']), Some('u'));
        assert_eq!(largest::<u8>(&[]), None);
    }

    #[test]
    fn pair_is_generic() {
        let p = Pair { a: 1, b: 2 }.swap();
        assert_eq!((p.a, p.b), (2, 1));
        let q = Pair { a: "左", b: "右" }.swap();
        assert_eq!((q.a, q.b), ("右", "左"));
        let s = Pair { a: String::from("x"), b: String::from("y") }.swap();
        assert_eq!(s.a, "y");
    }
}
:::

:::solution
/// 返回切片里最大的元素；空切片返回 None
fn largest<T: PartialOrd + Copy>(items: &[T]) -> Option<T> {
    let mut best = *items.first()?;
    for &x in items {
        if x > best {
            best = x;
        }
    }
    Some(best)
}

struct Pair<T> {
    a: T,
    b: T,
}

impl<T> Pair<T> {
    /// 交换两个元素
    fn swap(self) -> Pair<T> {
        Pair { a: self.b, b: self.a }
    }
}

fn main() {
    println!("{:?}", largest(&[3, 9, 2]));
    let p = Pair { a: 1, b: 2 }.swap();
    println!("({}, {})", p.a, p.b);
}
:::

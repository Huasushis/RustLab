---
title: Hello, Ferris
---
欢迎来到 RustLab！这套关卡假设你已经会写 C++ 或 Python，所以不解释「什么是变量」，只讲 **Rust 哪里不一样**。

每一关的玩法都相同：读左边的讲解 → 改右边的代码 → 点 **运行** 看效果 → 点 **检查** 判题。

## 第一个程序

```rust
fn main() {
    println!("Hello, world!");
}
```

- `fn main()` 是程序入口，和 C++ 的 `int main()` 一样。
- `println!` 后面的 `!` 表示它是**宏**而不是函数。宏在编译期展开，所以格式串写错会直接编译失败，而不是像 `printf` 那样运行时出乱子。

## 格式化输出

```rust
let lang = "Rust";
let version = 1.0;
println!("{} {}", lang, version);    // 按位置填充，类似 Python 的 "{} {}".format(...)
println!("{lang} {version}");        // 直接捕获变量，类似 Python 的 f-string
println!("{:?}", (1, "two"));        // {:?} 是调试输出，几乎所有类型都支持
println!("{:>8.2}", 3.14159);        // 宽度 8、右对齐、保留两位小数
```

| 你熟悉的写法 | Rust |
| --- | --- |
| `print(f"{x}")` | `println!("{x}")` |
| `std::cout << x << '\n'` | `println!("{x}")` |
| `repr(x)` | `println!("{x:?}")` |

## 任务

修改 `main` 里的两行 `println!`，让程序**利用变量 `name` 和 `year`** 输出：

```text
Hello, Ferris!
Rust 1.0 发布于 2015 年
```

> Ferris 是 Rust 的吉祥物，一只橙色的小螃蟹 🦀

:::hint
把变量名直接写进花括号里：`println!("Hello, {name}!");`
:::

:::hint
第二行同理：`println!("Rust 1.0 发布于 {year} 年");`。注意输出要和期望的一字不差。
:::

:::exercise
fn main() {
    let name = "Ferris";
    let year = 2015;

    // TODO: 修改下面两行，用上 name 和 year
    println!("Hello, world!");
    println!("Rust 1.0 发布于 ???? 年");
}
:::

:::expect
Hello, Ferris!
Rust 1.0 发布于 2015 年
:::

:::solution
fn main() {
    let name = "Ferris";
    let year = 2015;

    println!("Hello, {name}!");
    println!("Rust 1.0 发布于 {year} 年");
}
:::

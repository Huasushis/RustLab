---
title: Cargo 与第一个外部库：rand
crates: rand
---
到目前为止我们只用了标准库。Rust 的标准库刻意保持精简：随机数、正则、JSON、命令行解析……这些在 Python 里「自带电池」的东西，在 Rust 里都交给社区的**库**（crate）来做。管理这些库的工具，就是 **Cargo**。

## Cargo 是什么

Cargo 同时是包管理器、构建系统和测试运行器，相当于把下面这些东西合成了一个：

| 你熟悉的 | Rust |
| --- | --- |
| `pip` / `npm` / `vcpkg` / `conan` | `cargo add`，依赖从 [crates.io](https://crates.io) 下载 |
| `requirements.txt` / `package.json` / `CMakeLists.txt` | `Cargo.toml` |
| `poetry.lock` / `package-lock.json` | `Cargo.lock` |
| `make` / `cmake --build` | `cargo build` |
| `pytest` / `ctest` | `cargo test` |
| `black` / `clang-format` | `cargo fmt` |
| `pylint` / `clang-tidy` | `cargo clippy` |
| Sphinx / Doxygen | `cargo doc --open` |

C++ 程序员最能体会这有多省事：不用写构建脚本，不用操心头文件搜索路径和链接顺序，所有 Rust 项目的构建方式都一样。

## 一个项目的日常

```bash
cargo new hello          # 创建项目：Cargo.toml + src/main.rs
cd hello
cargo add rand           # 添加依赖（自动写进 Cargo.toml）
cargo run                # 编译并运行
cargo check              # 只做类型检查，不生成可执行文件，比 build 快得多
cargo test               # 运行所有测试
cargo build --release    # 开启优化编译，正式发布或测性能时用
```

`Cargo.toml` 长这样：

```toml
[package]
name = "hello"
version = "0.1.0"
edition = "2024"

[dependencies]
rand = "0.10"                                        # 等价于 ^0.10：接受 0.10.x 的更新
serde = { version = "1", features = ["derive"] }     # features：按需开启库的可选功能
```

版本号遵循**语义化版本**（semver）。第一次构建时，Cargo 会把实际选中的精确版本记在 `Cargo.lock` 里，之后所有人构建都用同一套版本。应用程序应该把 `Cargo.lock` 提交到 Git。

## 怎么找库

- [crates.io](https://crates.io)：官方仓库，搜索、看下载量
- [docs.rs](https://docs.rs)：每个库**每个版本**的 API 文档，自动生成
- [lib.rs](https://lib.rs) 与 [blessed.rs](https://blessed.rs)：按领域整理的推荐清单，适合不知道该用哪个库的时候

## 在本站使用第三方库

在线环境里**不需要** `Cargo.toml`：官方 Playground 预装了下载量最高的几百个库，直接 `use` 就行。本地运行器预装了本章用到的 rand、serde、serde_json、regex、anyhow、thiserror、itertools、clap、chrono，版本和 Playground 一致。

## rand：随机数

```rust
use rand::RngExt;                      // 提供 random_range 等方法的 trait
use rand::seq::{IndexedRandom, SliceRandom};

let mut rng = rand::rng();             // 线程本地的随机数生成器，日常用它就够了
let dice: u8 = rng.random_range(1..=6);
let coin: bool = rng.random_bool(0.5);
let x: f64 = rng.random();             // [0, 1) 的浮点数

let mut cards = vec![1, 2, 3, 4, 5];
cards.shuffle(&mut rng);               // 原地打乱（SliceRandom）
let one = cards.choose(&mut rng);      // 随机挑一个，返回 Option<&T>（IndexedRandom）
```

**可复现的随机**：测试里经常需要「每次运行结果都一样」的随机数，这时用固定种子：

```rust
use rand::{SeedableRng, rngs::StdRng};
let mut rng = StdRng::seed_from_u64(42);   // 同一个种子，产生同一串随机数
```

所以写函数时，不要在函数里自己调用 `rand::rng()`，而是**把生成器当参数传进来**：`fn roll(rng: &mut impl RngExt)`。调用方想要真随机就传 `rand::rng()`，测试时就传一个固定种子的 `StdRng`。这就是依赖注入，在任何语言里都是让代码可测试的好办法。

> ⚠️ 第三方库的 API 会随版本变化。比如 rand 0.8 里叫 `thread_rng()` 和 `gen_range`，0.9 改成了 `rng()` 和 `random_range`，0.10 又把这些方法挪到了 `RngExt` trait 里。网上的旧教程、甚至 AI 给出的代码都可能是旧写法。**遇到「找不到方法」的报错，先去 docs.rs 查你用的那个版本的文档**，编译器的 `help:` 提示也经常会告诉你该 `use` 哪个 trait。

## 任务

1. `roll_dice(rng)`：返回 1 到 6 之间的随机整数（含两端）
2. `shuffled(items, rng)`：返回打乱顺序后的**副本**，不修改原切片
3. `random_password(len, rng)`：从 `ALPHABET` 里随机挑 `len` 个字符组成密码

:::hint
`roll_dice`：`rng.random_range(1..=6)`。`impl RngExt` 参数上就能直接调用这些方法。
:::

:::hint
`shuffled`：先 `let mut v = items.to_vec();`，然后 `v.shuffle(rng);`，最后返回 `v`。这里的 `rng` 已经是 `&mut` 引用，直接传进去即可。
:::

:::hint
`random_password`：把字母表变成字符数组，再挑 `len` 次：
```rust
let chars: Vec<char> = ALPHABET.chars().collect();
(0..len).map(|_| *chars.choose(rng).unwrap()).collect()
```
`choose` 返回 `Option<&char>`，字母表非空，所以可以放心 `unwrap`。
:::

:::exercise
use rand::RngExt;
use rand::seq::{IndexedRandom, SliceRandom};

const ALPHABET: &str = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/// 掷一次骰子：1..=6
fn roll_dice(rng: &mut impl RngExt) -> u8 {
    todo!()
}

/// 返回打乱后的副本
fn shuffled(items: &[i32], rng: &mut impl RngExt) -> Vec<i32> {
    todo!()
}

/// 从 ALPHABET 中随机挑选 len 个字符
fn random_password(len: usize, rng: &mut impl RngExt) -> String {
    todo!()
}

fn main() {
    let mut rng = rand::rng();
    let rolls: Vec<u8> = (0..10).map(|_| roll_dice(&mut rng)).collect();
    println!("掷了 10 次骰子：{rolls:?}");
    println!("洗牌：{:?}", shuffled(&[1, 2, 3, 4, 5, 6, 7, 8], &mut rng));
    println!("随机密码：{}", random_password(12, &mut rng));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;
    use rand::SeedableRng;
    use rand::rngs::StdRng;

    #[test]
    fn dice_stays_in_range_and_covers_all_faces() {
        let mut rng = StdRng::seed_from_u64(1);
        let mut seen = [false; 7];
        for _ in 0..600 {
            let d = roll_dice(&mut rng);
            assert!((1..=6).contains(&d), "掷出了 {d}");
            seen[d as usize] = true;
        }
        assert!(seen[1..].iter().all(|&s| s), "600 次里应该每个点数都出现过");
    }

    #[test]
    fn shuffled_is_a_permutation_and_keeps_original() {
        let original: Vec<i32> = (1..=20).collect();
        let mut rng = StdRng::seed_from_u64(7);
        let s = shuffled(&original, &mut rng);
        assert_ne!(s, original, "20 个元素洗完牌恰好不变的概率极低");
        let mut sorted = s.clone();
        sorted.sort();
        assert_eq!(sorted, original);
        assert_eq!(original, (1..=20).collect::<Vec<i32>>());
    }

    #[test]
    fn password_uses_alphabet_and_is_reproducible() {
        let mut a = StdRng::seed_from_u64(99);
        let mut b = StdRng::seed_from_u64(99);
        let p1 = random_password(16, &mut a);
        let p2 = random_password(16, &mut b);
        assert_eq!(p1.chars().count(), 16);
        assert!(p1.chars().all(|c| ALPHABET.contains(c)));
        assert_eq!(p1, p2, "同一个种子应该得到同样的密码");
        assert_ne!(p1, random_password(16, &mut a));
        assert_eq!(random_password(0, &mut a), "");
    }
}
:::

:::solution
use rand::RngExt;
use rand::seq::{IndexedRandom, SliceRandom};

const ALPHABET: &str = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/// 掷一次骰子：1..=6
fn roll_dice(rng: &mut impl RngExt) -> u8 {
    rng.random_range(1..=6)
}

/// 返回打乱后的副本
fn shuffled(items: &[i32], rng: &mut impl RngExt) -> Vec<i32> {
    let mut v = items.to_vec();
    v.shuffle(rng);
    v
}

/// 从 ALPHABET 中随机挑选 len 个字符
fn random_password(len: usize, rng: &mut impl RngExt) -> String {
    let chars: Vec<char> = ALPHABET.chars().collect();
    (0..len).map(|_| *chars.choose(rng).unwrap()).collect()
}

fn main() {
    let mut rng = rand::rng();
    let rolls: Vec<u8> = (0..10).map(|_| roll_dice(&mut rng)).collect();
    println!("掷了 10 次骰子：{rolls:?}");
    println!("洗牌：{:?}", shuffled(&[1, 2, 3, 4, 5, 6, 7, 8], &mut rng));
    println!("随机密码：{}", random_password(12, &mut rng));
}
:::

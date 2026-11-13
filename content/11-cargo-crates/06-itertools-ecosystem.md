---
title: itertools 与生态地图
crates: itertools
forbid: for | while | loop
---
标准库的迭代器方法已经很多了（第 8 章），`itertools` 又补充了几十个常用的。用法很简单：`use itertools::Itertools;` 之后，所有迭代器都多出了这些方法。

```rust
use itertools::Itertools;

[3, 1, 2].iter().sorted().collect_vec();            // [1, 2, 3]：排序后的迭代器，collect_vec 是 collect::<Vec<_>>() 的简写
["a", "b", "c"].iter().join(", ");                  // "a, b, c"：任何能 Display 的元素都能 join
[1, 1, 2, 3, 3].iter().dedup().collect_vec();       // [1, 2, 3]：去掉相邻重复
[1, 2, 1, 3].iter().unique().collect_vec();         // [1, 2, 3]：去掉所有重复，保持首次出现的顺序
"hello".chars().counts();                           // HashMap<char, usize>：计数
[1, 2, 3, 4].iter().tuple_windows::<(_, _)>();      // (1,2) (2,3) (3,4)：相邻的元组
(1..=3).cartesian_product('a'..='b');               // (1,'a') (1,'b') (2,'a') ...：笛卡尔积，替代两层 for
[1, 2, 3, 4, 5].iter().positions(|x| x % 2 == 1);   // 0, 2, 4：所有满足条件的下标
```

`chunk_by` 把**相邻且键相同**的元素分成一组，非常适合做「游程编码」之类的事：

```rust
let s = "aaabcc";
for (ch, group) in &s.chars().chunk_by(|c| *c) {    // 注意前面的 &
    println!("{ch} 连续出现 {} 次", group.count());
}
```

## Rust 生态地图

学完这一章，你已经见过了最常用的几个库。下面是各个领域里事实上的标准选择，开新项目时可以从这里找起：

| 需求 | 常用库 | 说明 |
| --- | --- | --- |
| 序列化 | `serde` + `serde_json` / `toml` / `serde_yaml` / `csv` | 几乎所有库都支持 serde |
| 错误处理 | `thiserror`（库）、`anyhow`（应用） | |
| 命令行 | `clap` | 再加上 `indicatif` 显示进度条 |
| 随机数 | `rand` | |
| 正则 | `regex` | |
| 日期时间 | `chrono`、`jiff` | |
| 日志 | `tracing`、`log` + `env_logger` | |
| 并行计算 | `rayon` | 把 `.iter()` 改成 `.par_iter()` 就能多核并行 |
| 异步运行时 | `tokio` | 网络服务的基础 |
| Web 服务 | `axum`、`actix-web` | |
| HTTP 客户端 | `reqwest` | |
| 数据库 | `sqlx`、`diesel`、`rusqlite` | |
| 测试 | `proptest`（性质测试）、`insta`（快照测试）、`criterion`（性能测试） | |
| 与 Python 互操作 | `pyo3`、`maturin` | 用 Rust 给 Python 写扩展 |
| 与 C/C++ 互操作 | `bindgen`、`cxx` | |

异步（`async` / `await`）是 Rust 里一个独立的大话题，适合在掌握了本教程的内容之后，配合 [Tokio 官方教程](https://tokio.rs/tokio/tutorial) 学习。

## 任务

本关禁止使用 `for`、`while`、`loop`，请用 itertools 完成：

1. `run_length(s)`：游程编码，`"aaabcc"` → `"a3b1c2"`
2. `pair_sums(v)`：相邻两个元素之和，`[1, 2, 3, 4]` → `[3, 5, 7]`
3. `top_letters(text, k)`：统计字母（`is_alphabetic`，统一转成小写）出现的次数，返回出现最多的 `k` 个，格式为 `"l:3, o:2"`；次数相同按字母顺序

:::hint
`run_length`：`s.chars().chunk_by(|c| *c).into_iter().map(|(c, g)| format!("{c}{}", g.count())).collect()`。`chunk_by` 的结果要先 `.into_iter()`（或者像讲解里那样取引用）才能迭代。
:::

:::hint
`pair_sums`：`v.iter().tuple_windows().map(|(a, b)| a + b).collect()`。元组的长度由闭包参数 `(a, b)` 推断出来。
:::

:::hint
`top_letters`：
```rust
text.chars()
    .filter(|c| c.is_alphabetic())
    .flat_map(|c| c.to_lowercase())
    .counts()
    .into_iter()
    .sorted_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)))
    .take(k)
    .map(|(c, n)| format!("{c}:{n}"))
    .join(", ")
```
:::

:::exercise
use itertools::Itertools;

/// 游程编码："aaabcc" -> "a3b1c2"
fn run_length(s: &str) -> String {
    todo!()
}

/// 相邻元素之和
fn pair_sums(v: &[i32]) -> Vec<i32> {
    todo!()
}

/// 出现最多的 k 个字母，形如 "l:3, o:2"
fn top_letters(text: &str, k: usize) -> String {
    todo!()
}

fn main() {
    println!("{}", run_length("aaabccddd"));
    println!("{:?}", pair_sums(&[1, 2, 3, 4]));
    println!("{}", top_letters("Hello, World!", 3));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn run_length_works() {
        assert_eq!(run_length("aaabcc"), "a3b1c2");
        assert_eq!(run_length("abc"), "a1b1c1");
        assert_eq!(run_length("哈哈哈嘿"), "哈3嘿1");
        assert_eq!(run_length(""), "");
    }

    #[test]
    fn pair_sums_works() {
        assert_eq!(pair_sums(&[1, 2, 3, 4]), vec![3, 5, 7]);
        assert_eq!(pair_sums(&[5]), Vec::<i32>::new());
        assert_eq!(pair_sums(&[]), Vec::<i32>::new());
    }

    #[test]
    fn top_letters_works() {
        assert_eq!(top_letters("Hello, World!", 3), "l:3, o:2, d:1");
        assert_eq!(top_letters("bbaa", 5), "a:2, b:2");
        assert_eq!(top_letters("123 !!!", 2), "");
    }
}
:::

:::solution
use itertools::Itertools;

/// 游程编码："aaabcc" -> "a3b1c2"
fn run_length(s: &str) -> String {
    s.chars()
        .chunk_by(|c| *c)
        .into_iter()
        .map(|(c, g)| format!("{c}{}", g.count()))
        .collect()
}

/// 相邻元素之和
fn pair_sums(v: &[i32]) -> Vec<i32> {
    v.iter().tuple_windows().map(|(a, b)| a + b).collect()
}

/// 出现最多的 k 个字母，形如 "l:3, o:2"
fn top_letters(text: &str, k: usize) -> String {
    text.chars()
        .filter(|c| c.is_alphabetic())
        .flat_map(|c| c.to_lowercase())
        .counts()
        .into_iter()
        .sorted_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)))
        .take(k)
        .map(|(c, n)| format!("{c}:{n}"))
        .join(", ")
}

fn main() {
    println!("{}", run_length("aaabccddd"));
    println!("{:?}", pair_sums(&[1, 2, 3, 4]));
    println!("{}", top_letters("Hello, World!", 3));
}
:::

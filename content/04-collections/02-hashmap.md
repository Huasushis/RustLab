---
title: HashMap：键值对
---
`HashMap<K, V>` 对应 Python 的 `dict` 和 C++ 的 `std::unordered_map`。它不在预导入里，需要先 `use`：

```rust
use std::collections::HashMap;

let mut scores: HashMap<String, u32> = HashMap::new();
scores.insert("Ada".to_string(), 95);        // 插入或覆盖
scores.insert("Bob".to_string(), 80);

let ada: Option<&u32> = scores.get("Ada");   // 查找返回 Option，不存在就是 None
let n = scores.get("Zed").copied().unwrap_or(0);

scores.contains_key("Bob");
scores.remove("Bob");
scores.len();
```

注意和 Python 的区别：`d["missing"]` 在 Python 里抛 `KeyError`；Rust 的 `get` 返回 `Option`，把「可能不存在」写进了类型。（`scores["Zed"]` 这种下标写法也存在，键不存在时会 panic。）

## 遍历

```rust
for (name, score) in &scores {
    println!("{name}: {score}");
}
```

遍历顺序是**不确定的**（和 Python 3.7+ 的 dict 不同）。需要有序时用 `BTreeMap`，接口几乎一样，对应 C++ 的 `std::map`。

## entry API：「没有就插入，有就更新」

这是 `HashMap` 最有 Rust 特色的地方。计数是最典型的例子：

```rust
let mut counts: HashMap<char, usize> = HashMap::new();
for c in "hello".chars() {
    *counts.entry(c).or_insert(0) += 1;
}
```

`entry(c)` 找到键对应的位置；`or_insert(0)` 在键不存在时插入 0，然后返回值的**可变引用** `&mut usize`；再用 `*` 解引用加一。整个过程只做一次哈希查找，相当于 Python 的 `counts[c] = counts.get(c, 0) + 1` 或 `defaultdict(int)`。

## 所有权

插入时，`String` 这样的键和值会被**移动**进 map，map 成为它们的新主人。

## 任务

1. `word_count(text)`：按空白切分文本，统计每个单词出现的次数。`text.split_whitespace()` 会依次给出每个单词（`&str`）
2. `top_scorer(scores)`：返回分数最高的人的名字；map 为空时返回 `None`。测试数据里不会出现并列第一

:::hint
`word_count`：
```rust
let mut counts = HashMap::new();
for word in text.split_whitespace() {
    *counts.entry(word.to_string()).or_insert(0) += 1;
}
counts
```
键的类型是 `String`，所以要用 `to_string()` 把 `&str` 变成拥有所有权的字符串。
:::

:::hint
`top_scorer`：用一个 `Option<(&String, u32)>` 记录目前的最佳者，遍历 `for (name, &score) in scores`，分数更高就更新。最后需要把 `&String` 变成 `String` 再返回，例如 `best.map(|(name, _)| name.clone())`，或者用 `match`。
:::

:::exercise
use std::collections::HashMap;

/// 统计每个单词出现的次数
fn word_count(text: &str) -> HashMap<String, usize> {
    todo!()
}

/// 分数最高者的名字
fn top_scorer(scores: &HashMap<String, u32>) -> Option<String> {
    todo!()
}

fn main() {
    let counts = word_count("the quick brown fox jumps over the lazy dog the end");
    println!("the 出现了 {:?} 次", counts.get("the"));

    let mut scores = HashMap::new();
    scores.insert("Ada".to_string(), 95);
    scores.insert("Bob".to_string(), 80);
    println!("最高分: {:?}", top_scorer(&scores));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn word_count_works() {
        let c = word_count("a b a  c\tb a\n");
        assert_eq!(c.len(), 3);
        assert_eq!(c.get("a"), Some(&3));
        assert_eq!(c.get("b"), Some(&2));
        assert_eq!(c.get("c"), Some(&1));
        assert_eq!(c.get("d"), None);
    }

    #[test]
    fn word_count_empty() {
        assert!(word_count("   ").is_empty());
    }

    #[test]
    fn top_scorer_works() {
        let mut scores = HashMap::new();
        assert_eq!(top_scorer(&scores), None);
        scores.insert("Ada".to_string(), 95);
        scores.insert("Bob".to_string(), 80);
        scores.insert("Cy".to_string(), 99);
        assert_eq!(top_scorer(&scores), Some("Cy".to_string()));
    }
}
:::

:::solution
use std::collections::HashMap;

/// 统计每个单词出现的次数
fn word_count(text: &str) -> HashMap<String, usize> {
    let mut counts = HashMap::new();
    for word in text.split_whitespace() {
        *counts.entry(word.to_string()).or_insert(0) += 1;
    }
    counts
}

/// 分数最高者的名字
fn top_scorer(scores: &HashMap<String, u32>) -> Option<String> {
    let mut best: Option<(&String, u32)> = None;
    for (name, &score) in scores {
        match best {
            Some((_, top)) if top >= score => {}
            _ => best = Some((name, score)),
        }
    }
    best.map(|(name, _)| name.clone())
}

fn main() {
    let counts = word_count("the quick brown fox jumps over the lazy dog the end");
    println!("the 出现了 {:?} 次", counts.get("the"));

    let mut scores = HashMap::new();
    scores.insert("Ada".to_string(), 95);
    scores.insert("Bob".to_string(), 80);
    println!("最高分: {:?}", top_scorer(&scores));
}
:::

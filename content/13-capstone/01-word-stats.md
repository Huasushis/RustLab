---
title: 词频统计
---
第一个综合挑战：统计一段英文里出现最多的单词。这关会用到 `HashMap`、字符串处理、迭代器和排序。

## 新工具：自定义排序

```rust
let mut v = vec![("b", 2), ("a", 2), ("c", 5)];

// sort_by 接收一个比较函数，返回 Ordering（Less / Equal / Greater）
v.sort_by(|x, y| y.1.cmp(&x.1));                       // 按次数降序

// then / then_with 用来串联多个排序条件
v.sort_by(|x, y| y.1.cmp(&x.1).then(x.0.cmp(y.0)));    // 次数降序，次数相同时按单词升序
// 结果：[("c", 5), ("a", 2), ("b", 2)]

v.sort_by_key(|x| x.1);                                // 只按一个键升序时更简洁
```

对比：C++ 的 `std::sort` 传一个返回 `bool` 的比较器（「a 是否排在 b 前面」）；Python 的 `sorted(key=...)`。Rust 的 `cmp` 返回三态的 `Ordering`，串联多个条件更自然。

`sort` 和 `sort_by` 都是**稳定**排序。

## 规则

`top_words(text, k)` 返回出现次数最多的前 `k` 个单词及其次数：

1. **单词**：由连续的 ASCII 字母和撇号 `'` 组成，其它任何字符都是分隔符。例如 `"don't stop—believing!"` 里有 `don't`、`stop`、`believing` 三个单词
2. 统计时**不区分大小写**，统一转成小写
3. 按次数**降序**排列；次数相同的，按单词的字典序**升序**排列
4. 不同的单词不足 `k` 个时，有多少返回多少

:::hint
切分单词：`text.split(|c: char| !(c.is_ascii_alphabetic() || c == '\''))` 会在每个「不是字母也不是撇号」的字符处切开。切出来的空串要过滤掉：`.filter(|w| !w.is_empty())`。
:::

:::hint
计数：`*counts.entry(w.to_lowercase()).or_insert(0) += 1;`，其中 `counts` 是 `HashMap<String, usize>`。
:::

:::hint
排序和截取：
```rust
let mut v: Vec<(String, usize)> = counts.into_iter().collect();
v.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
v.truncate(k);
v
```
:::

:::exercise
use std::collections::HashMap;

/// 出现次数最多的前 k 个单词（小写）及其次数
fn top_words(text: &str, k: usize) -> Vec<(String, usize)> {
    todo!()
}

fn main() {
    let text = "It was the best of times, it was the worst of times, \
                it was the age of wisdom, it was the age of foolishness...";
    for (word, n) in top_words(text, 5) {
        println!("{word:>8} {n}");
    }
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    fn owned(v: &[(&str, usize)]) -> Vec<(String, usize)> {
        v.iter().map(|(w, n)| (w.to_string(), *n)).collect()
    }

    #[test]
    fn counts_and_orders() {
        let text = "It was the best of times, it was the worst of times, \
                    it was the age of wisdom, it was the age of foolishness...";
        assert_eq!(top_words(text, 3), owned(&[("it", 4), ("of", 4), ("the", 4)]));
        assert_eq!(top_words(text, 5), owned(&[("it", 4), ("of", 4), ("the", 4), ("was", 4), ("age", 2)]));
    }

    #[test]
    fn case_insensitive_and_apostrophes() {
        let text = "Don't stop—believing! DON'T. don't; Stop";
        assert_eq!(top_words(text, 10), owned(&[("don't", 3), ("stop", 2), ("believing", 1)]));
    }

    #[test]
    fn edge_cases() {
        assert_eq!(top_words("", 3), vec![]);
        assert_eq!(top_words("... 123 !!!", 3), vec![]);
        assert_eq!(top_words("a b c", 0), vec![]);
        assert_eq!(top_words("b a", 5), owned(&[("a", 1), ("b", 1)]));
    }
}
:::

:::solution
use std::collections::HashMap;

/// 出现次数最多的前 k 个单词（小写）及其次数
fn top_words(text: &str, k: usize) -> Vec<(String, usize)> {
    let mut counts: HashMap<String, usize> = HashMap::new();
    for w in text.split(|c: char| !(c.is_ascii_alphabetic() || c == '\'')).filter(|w| !w.is_empty()) {
        *counts.entry(w.to_lowercase()).or_insert(0) += 1;
    }
    let mut v: Vec<(String, usize)> = counts.into_iter().collect();
    v.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
    v.truncate(k);
    v
}

fn main() {
    let text = "It was the best of times, it was the worst of times, \
                it was the age of wisdom, it was the age of foolishness...";
    for (word, n) in top_words(text, 5) {
        println!("{word:>8} {n}");
    }
}
:::

---
title: 结构体里的引用
---
到目前为止，结构体的字段都是 `String`、`Vec` 这样**拥有**数据的类型。字段也可以是引用，但这时必须标注生命周期：

```rust
struct Excerpt<'a> {
    text: &'a str,
}
```

意思是：一个 `Excerpt` 实例**不能比它引用的那段文本活得更久**。

```rust
let novel = String::from("很久很久以前。有一座山。");
let first = Excerpt { text: novel.split('。').next().unwrap() };
// 只要 first 还在用，novel 就不能被释放或修改
```

## impl 块的写法

```rust
impl<'a> Excerpt<'a> {
    fn len(&self) -> usize {
        self.text.len()
    }

    fn text(&self) -> &'a str {     // 返回的引用和原始文本一样长寿，而不是和 self 一样
        self.text
    }
}
```

注意最后一个方法。如果写成 `fn text(&self) -> &str`，按省略规则，返回值的生命周期会绑定到 `&self` 上，也就是说 `Excerpt` 实例一销毁，返回的切片就不能用了。但实际上它指向的是原始文本，和 `Excerpt` 实例本身无关。写成 `&'a str` 把这层更宽松、也更准确的关系告诉了编译器。

## 'static

`'static` 表示「在整个程序运行期间都有效」。字符串字面量都是 `&'static str`，因为它们直接存在可执行文件里。

## 什么时候该用引用字段

- 结构体只是数据的一个临时「视图」：解析器、迭代器、切片的包装 → 用引用，零拷贝
- 结构体要长期保存数据、到处传递 → 直接拥有（`String`），省去许多麻烦

初学时如果被生命周期搞得焦头烂额，先把字段改成拥有所有权的类型，往往是更好的设计。

## 任务

实现一个零拷贝的单词扫描器 `Words`，它持有一个字符串切片，每次调用 `next_word` 返回下一个单词：

1. 给 `Words` 加上生命周期参数，让它通过编译
2. 实现 `new`
3. 实现 `next_word`：跳过开头的空格，返回下一个由空格分隔的单词；没有更多单词时返回 `None`

返回的单词必须和**原始文本**一样长寿：测试会在 `Words` 实例销毁之后继续使用它返回的单词。

:::hint
结构体：`struct Words<'a> { rest: &'a str }`。impl 块：`impl<'a> Words<'a> { ... }`，`new` 的签名是 `fn new(text: &'a str) -> Self`。
:::

:::hint
`next_word` 的签名要写成 `fn next_word(&mut self) -> Option<&'a str>`，这样返回值的生命周期才是原始文本的，而不是 `self` 的。
:::

:::hint
函数体：
```rust
let trimmed = self.rest.trim_start();
if trimmed.is_empty() {
    return None;
}
let end = trimmed.find(' ').unwrap_or(trimmed.len());
let (word, rest) = trimmed.split_at(end);
self.rest = rest;
Some(word)
```
:::

:::exercise
/// 逐个取出文本里以空格分隔的单词，不复制任何数据
struct Words {
    rest: &str,
}

impl Words {
    fn new(text: &str) -> Self {
        todo!()
    }

    /// 返回下一个单词；没有了就返回 None
    fn next_word(&mut self) -> Option<&str> {
        todo!()
    }
}

fn main() {
    let text = String::from("  hello big   world ");
    let mut words = Words::new(&text);
    while let Some(w) = words.next_word() {
        println!("[{w}]");
    }
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn yields_words_in_order() {
        let mut w = Words::new("  hello big   world ");
        assert_eq!(w.next_word(), Some("hello"));
        assert_eq!(w.next_word(), Some("big"));
        assert_eq!(w.next_word(), Some("world"));
        assert_eq!(w.next_word(), None);
        assert_eq!(w.next_word(), None);
    }

    #[test]
    fn empty_text() {
        assert_eq!(Words::new("").next_word(), None);
        assert_eq!(Words::new("    ").next_word(), None);
    }

    #[test]
    fn words_outlive_the_scanner() {
        let text = String::from("alpha beta");
        let first;
        let second;
        {
            let mut w = Words::new(&text);
            first = w.next_word();
            second = w.next_word();
        } // 扫描器在这里被销毁，但单词指向的是 text，仍然有效
        assert_eq!(first, Some("alpha"));
        assert_eq!(second, Some("beta"));
    }
}
:::

:::solution
/// 逐个取出文本里以空格分隔的单词，不复制任何数据
struct Words<'a> {
    rest: &'a str,
}

impl<'a> Words<'a> {
    fn new(text: &'a str) -> Self {
        Words { rest: text }
    }

    /// 返回下一个单词；没有了就返回 None
    fn next_word(&mut self) -> Option<&'a str> {
        let trimmed = self.rest.trim_start();
        if trimmed.is_empty() {
            return None;
        }
        let end = trimmed.find(' ').unwrap_or(trimmed.len());
        let (word, rest) = trimmed.split_at(end);
        self.rest = rest;
        Some(word)
    }
}

fn main() {
    let text = String::from("  hello big   world ");
    let mut words = Words::new(&text);
    while let Some(w) = words.next_word() {
        println!("[{w}]");
    }
}
:::

---
title: 函数里的生命周期
---
借用检查器要保证**引用不会比它指向的数据活得更久**。大多数时候它能自己推断，但有些情况信息不够：

```rust
fn longest(a: &str, b: &str) -> &str {      // ❌ missing lifetime specifier
    if a.len() >= b.len() { a } else { b }
}
```

返回的引用是从 `a` 来的还是从 `b` 来的？编译器只看签名、不看函数体（否则改一下函数体就可能让远处的调用方编译失败）。所以需要你在签名里说清楚。

## 生命周期标注

```rust
fn longest<'a>(a: &'a str, b: &'a str) -> &'a str {
    if a.len() >= b.len() { a } else { b }
}
```

`'a` 是一个**生命周期参数**，和泛型参数一样先在 `<>` 里声明。这个签名的意思是：

> 返回的引用，只在 `a` 和 `b` **都还有效**的那段范围内有效。

最重要的一点：**标注不会改变任何东西活多久**。它只是在描述引用之间的关系，好让编译器去检查调用方有没有违反。

```rust
let result;
let s1 = String::from("long string");
{
    let s2 = String::from("short");
    result = longest(&s1, &s2);
}                          // s2 在这里被释放
println!("{result}");      // ❌ result 可能指向 s2，编译器拒绝
```

C++ 没有这个机制：同样的代码能编译，然后在运行时读到已经释放的内存。

## 不是所有参数都要同一个生命周期

如果返回值只可能来自其中一个参数，就只把那个参数和返回值关联起来：

```rust
fn first_part<'a>(text: &'a str, sep: &str) -> &'a str {
    text.split(sep).next().unwrap_or(text)
}
```

这样写的话，`sep` 活多久都不影响返回值的有效范围，调用方受到的限制最少。

## 为什么之前不用写

因为有**省略规则**。编译器在以下情况会自动补全：

1. 只有一个引用参数 → 返回值的生命周期和它相同
2. 有 `&self` 或 `&mut self` → 返回值的生命周期和 `self` 相同

`fn first_word(s: &str) -> &str` 符合规则 1，所以第 2 章没提这回事。

## 任务

1. 给 `longest` 加上生命周期标注，让它通过编译
2. 给 `skip_prefix` 加上标注。它的返回值**只会来自 `line`**。测试会在 `prefix` 已经被释放之后继续使用返回值，如果你把两个参数标成同一个生命周期，测试将无法通过编译——想想为什么

:::hint
`fn longest<'a>(a: &'a str, b: &'a str) -> &'a str`
:::

:::hint
`fn skip_prefix<'a>(line: &'a str, prefix: &str) -> &'a str`。`prefix` 不参与返回值，不需要标 `'a`。如果也标成 `'a`，就等于告诉编译器「返回值可能指向 prefix」，于是 `prefix` 被释放后返回值就不让用了。
:::

:::exercise
/// 返回较长的那个；一样长时返回 a
fn longest(a: &str, b: &str) -> &str {
    if a.len() >= b.len() { a } else { b }
}

/// 如果 line 以 prefix 开头，返回去掉前缀后的部分；否则原样返回 line
fn skip_prefix(line: &str, prefix: &str) -> &str {
    if line.starts_with(prefix) {
        &line[prefix.len()..]
    } else {
        line
    }
}

fn main() {
    println!("{}", longest("hello", "hi"));
    println!("{}", skip_prefix("log: started", "log: "));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn longest_works() {
        assert_eq!(longest("hello", "hi"), "hello");
        assert_eq!(longest("a", "bcd"), "bcd");
        assert_eq!(longest("same", "size"), "same");
        let owned = String::from("owned string");
        assert_eq!(longest(&owned, "x"), "owned string");
    }

    #[test]
    fn skip_prefix_works() {
        assert_eq!(skip_prefix("log: started", "log: "), "started");
        assert_eq!(skip_prefix("started", "log: "), "started");
        assert_eq!(skip_prefix("", "x"), "");
    }

    #[test]
    fn result_only_borrows_from_line() {
        let line = String::from("log: started");
        let rest;
        {
            let prefix = String::from("log: ");
            rest = skip_prefix(&line, &prefix);
        } // prefix 在这里被释放
        assert_eq!(rest, "started");
    }
}
:::

:::solution
/// 返回较长的那个；一样长时返回 a
fn longest<'a>(a: &'a str, b: &'a str) -> &'a str {
    if a.len() >= b.len() { a } else { b }
}

/// 如果 line 以 prefix 开头，返回去掉前缀后的部分；否则原样返回 line
fn skip_prefix<'a>(line: &'a str, prefix: &str) -> &'a str {
    if line.starts_with(prefix) {
        &line[prefix.len()..]
    } else {
        line
    }
}

fn main() {
    println!("{}", longest("hello", "hi"));
    println!("{}", skip_prefix("log: started", "log: "));
}
:::

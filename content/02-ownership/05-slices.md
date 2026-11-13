---
title: 切片
---
**切片**是对一段连续数据的引用，由「指针 + 长度」组成，不拥有数据。

| Rust | 含义 | C++ 里最像的东西 |
| --- | --- | --- |
| `&[T]` | 一段连续的 `T` | `std::span<const T>` |
| `&str` | 一段 UTF-8 文本 | `std::string_view` |

区别在于：Rust 的切片受借用检查保护，不可能指向已经释放的内存。

## 创建切片

```rust
let v = vec![10, 20, 30, 40, 50];
let a = &v[1..3];     // [20, 30]，左闭右开，和 Python 的 v[1:3] 一样
let b = &v[..2];      // [10, 20]
let c = &v[2..];      // [30, 40, 50]
let all = &v[..];     // 整个 Vec 的切片

let s = String::from("hello world");
let hello = &s[0..5];   // "hello"，类型是 &str
```

范围越界会 panic。字符串切片的下标是**字节**位置，而且必须落在字符边界上（下一关细说）。

## 函数参数优先用切片

```rust
fn sum(nums: &[i32]) -> i32 { ... }    // 比 &Vec<i32> 更通用
fn shout(s: &str) -> String { ... }    // 比 &String 更通用
```

`&Vec<T>` 能自动转换成 `&[T]`，`&String` 能自动转换成 `&str`，反过来却不行。所以参数写成切片类型，调用方传 `Vec`、数组、字面量或者其中一部分都可以。上一关的 `&String` 参数，地道的写法其实是 `&str`。

顺带一提：字符串字面量 `"hello"` 的类型就是 `&str`，它指向编译进程序里的只读数据。

## 任务

1. `first_word(s)`：返回第一个空格之前的部分；没有空格就返回整个字符串。`s.find(' ')` 返回 `Option<usize>`（找不到时是 `None`），本关可以用 `match` 处理，写法见提示
2. `sum_slice(nums)`：求和
3. `middle(nums)`：去掉首尾各一个元素后的切片；长度不足 2 时返回空切片 `&[]`

:::hint
```rust
match s.find(' ') {
    Some(i) => &s[..i],
    None => s,
}
```
`Option` 和 `match` 会在下一章正式介绍，这里先照着用。
:::

:::hint
`sum_slice`：`let mut total = 0; for x in nums { total += x; } total`。遍历 `&[i32]` 得到的 `x` 是 `&i32`，`+=` 可以直接加引用。
:::

:::hint
`middle`：`if nums.len() < 2 { &[] } else { &nums[1..nums.len() - 1] }`
:::

:::exercise
/// 第一个空格之前的部分；没有空格则返回整个字符串
fn first_word(s: &str) -> &str {
    todo!()
}

fn sum_slice(nums: &[i32]) -> i32 {
    todo!()
}

/// 去掉首尾元素；长度不足 2 时返回空切片
fn middle(nums: &[i32]) -> &[i32] {
    todo!()
}

fn main() {
    let text = String::from("hello wonderful world");
    println!("第一个单词: {}", first_word(&text));

    let v = vec![1, 2, 3, 4, 5];
    println!("全部求和: {}", sum_slice(&v));
    println!("前三个求和: {}", sum_slice(&v[..3]));
    println!("中间部分: {:?}", middle(&v));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn first_word_works() {
        assert_eq!(first_word("hello world"), "hello");
        assert_eq!(first_word("rust"), "rust");
        assert_eq!(first_word(""), "");
        assert_eq!(first_word(" leading"), "");
        let owned = String::from("a b c");
        assert_eq!(first_word(&owned), "a");
    }

    #[test]
    fn sum_slice_works() {
        assert_eq!(sum_slice(&[1, 2, 3]), 6);
        assert_eq!(sum_slice(&[]), 0);
        let v = vec![10, 20, 30, 40];
        assert_eq!(sum_slice(&v[1..3]), 50);
    }

    #[test]
    fn middle_works() {
        assert_eq!(middle(&[1, 2, 3, 4]), &[2, 3]);
        assert_eq!(middle(&[1, 2]), &[] as &[i32]);
        assert_eq!(middle(&[1]), &[] as &[i32]);
        assert_eq!(middle(&[]), &[] as &[i32]);
    }
}
:::

:::solution
/// 第一个空格之前的部分；没有空格则返回整个字符串
fn first_word(s: &str) -> &str {
    match s.find(' ') {
        Some(i) => &s[..i],
        None => s,
    }
}

fn sum_slice(nums: &[i32]) -> i32 {
    let mut total = 0;
    for x in nums {
        total += x;
    }
    total
}

/// 去掉首尾元素；长度不足 2 时返回空切片
fn middle(nums: &[i32]) -> &[i32] {
    if nums.len() < 2 {
        &[]
    } else {
        &nums[1..nums.len() - 1]
    }
}

fn main() {
    let text = String::from("hello wonderful world");
    println!("第一个单词: {}", first_word(&text));

    let v = vec![1, 2, 3, 4, 5];
    println!("全部求和: {}", sum_slice(&v));
    println!("前三个求和: {}", sum_slice(&v[..3]));
    println!("中间部分: {:?}", middle(&v));
}
:::

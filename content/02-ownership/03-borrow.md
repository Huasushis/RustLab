---
title: 借用：共享引用
forbid: .clone()
---
把所有权传进去再传回来（第 1 关）太啰嗦，每次都 `clone`（第 2 关）又太浪费。大多数时候，函数只是想**看一眼**数据。这就是**借用**（borrowing）：

```rust
fn len_of(s: &String) -> usize {   // 参数是「对 String 的引用」
    s.len()
}

let s = String::from("hello");
let n = len_of(&s);       // &s 创建一个引用，所有权仍在 s 手里
println!("{s} 的长度是 {n}");   // ✅ s 还能用
```

`&T` 读作「T 的共享引用」，它借用值但不拥有值，引用离开作用域时什么都不会被释放。

## 和 C++ 引用 / 指针的区别

- 创建引用要**显式写 `&`**（C++ 的引用在调用处看不出来）。调用 `foo(&x)` 时，读代码的人立刻知道 `x` 只是被借用。
- 引用**永远有效**：编译器保证引用不会比它指向的数据活得更久，不存在悬垂引用，也没有空引用。
- `&T` 默认**只读**，相当于 `const T&`。想修改要用 `&mut T`（下一关）。

## 自动解引用

通过引用调用方法或访问字段时不用写 `*` 或 `->`，统一用 `.`：

```rust
let r = &s;
r.len();        // 不用写 (*r).len()
```

只有要拿到引用背后的**值本身**时才需要 `*`，例如 `let n: i32 = *r + 1;`。

## 任务

`total_len` 目前会拿走两个字符串的所有权，导致 `main` 里后面没法再用它们。

1. 把 `total_len` 改成**借用**参数，并修改 `main` 里的调用
2. 实现 `is_longer(a, b)`：`a` 比 `b` 长时返回 `true`

本关禁止使用 `.clone()`。

:::hint
签名改成 `fn total_len(a: &String, b: &String) -> usize`，函数体不用动。
:::

:::hint
调用处要传引用：`total_len(&a, &b)`。`is_longer` 的函数体就是 `a.len() > b.len()`。
:::

:::exercise
/// 两个字符串的总长度（字节数）
fn total_len(a: String, b: String) -> usize {
    a.len() + b.len()
}

/// a 是否比 b 长
fn is_longer(a: &String, b: &String) -> bool {
    todo!()
}

fn main() {
    let a = String::from("hello");
    let b = String::from("rust");
    let n = total_len(a, b);
    println!("{a} 和 {b} 一共 {n} 个字节");
    println!("{a} 比 {b} 长吗？{}", is_longer(&a, &b));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn total_len_borrows() {
        let a = String::from("ab");
        let b = String::from("cde");
        assert_eq!(total_len(&a, &b), 5);
        // 借用之后原来的变量仍然可用
        assert_eq!(a, "ab");
        assert_eq!(b, "cde");
    }

    #[test]
    fn is_longer_works() {
        let a = String::from("hello");
        let b = String::from("rust");
        assert!(is_longer(&a, &b));
        assert!(!is_longer(&b, &a));
        assert!(!is_longer(&a, &a));
    }
}
:::

:::solution
/// 两个字符串的总长度（字节数）
fn total_len(a: &String, b: &String) -> usize {
    a.len() + b.len()
}

/// a 是否比 b 长
fn is_longer(a: &String, b: &String) -> bool {
    a.len() > b.len()
}

fn main() {
    let a = String::from("hello");
    let b = String::from("rust");
    let n = total_len(&a, &b);
    println!("{a} 和 {b} 一共 {n} 个字节");
    println!("{a} 比 {b} 长吗？{}", is_longer(&a, &b));
}
:::

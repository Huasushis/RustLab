---
title: 可变借用与借用规则
---
## &mut：可变引用

```rust
fn shout(s: &mut String) {
    s.push_str("!!!");
}

let mut s = String::from("hey");   // 1. 变量本身要是 mut
shout(&mut s);                     // 2. 借用时写 &mut
println!("{s}");                   // hey!!!
```

三处都要写明「可变」：变量声明、创建引用、函数签名。读代码时，哪里可能修改数据一目了然。

## 借用规则

在任意时刻，对同一份数据，**要么**有任意多个共享引用 `&T`，**要么**只有一个可变引用 `&mut T`，二者不能同时存在。

口诀：**共享不可变，可变不共享**。

```rust
let mut v = vec![1, 2, 3];
let first = &v[0];      // 共享借用 v
v.push(4);              // ❌ 这里需要可变借用 v，但 first 还活着
println!("{first}");
```

为什么要这么严格？`push` 可能让 `Vec` 重新分配内存，`first` 就成了悬垂引用。在 C++ 里这叫**迭代器失效**，是经典的未定义行为；Rust 直接在编译期拒绝。同一条规则还杜绝了多线程下的数据竞争（第 12 章）。

## 借用的范围到「最后一次使用」为止

```rust
let mut v = vec![1, 2, 3];
let first = &v[0];
println!("{first}");    // first 最后一次使用，借用到此结束
v.push(4);              // ✅ 现在可以可变借用了
```

所以修复借用冲突最常见的办法是**调整代码顺序**，让上一个借用先用完；或者**不持有引用，直接把值复制出来**（对 `Copy` 类型而言）。

## 通过 &mut 修改值

```rust
fn reset(x: &mut i32) {
    *x = 0;             // 用 * 解引用，才能给引用背后的值赋值
}
```

## 任务

1. 修好 `append_exclaim` 和它在 `main` 里的调用
2. 实现 `double_all`：把 `Vec` 里的每个数翻倍。`for x in v.iter_mut()` 会依次给出每个元素的 `&mut i32`
3. 修好 `main` 里 `first` 和 `push` 的借用冲突，让程序输出 `first = 1`

:::hint
`append_exclaim` 的参数改成 `s: &mut String`；`main` 里对应地改成 `let mut s = ...` 和 `append_exclaim(&mut s)`。
:::

:::hint
`double_all` 的函数体：`for x in v.iter_mut() { *x *= 2; }`
:::

:::hint
借用冲突有两种改法：把 `println!("first = {first}")` 挪到 `v.push(4)` 前面；或者把 `let first = &v[0];` 改成 `let first = v[0];`（`i32` 是 `Copy`，直接复制出来就不存在借用了）。
:::

:::exercise
/// 在字符串末尾加一个感叹号
fn append_exclaim(s: &String) {
    s.push('!');
}

/// 把每个元素翻倍
fn double_all(v: &mut Vec<i32>) {
    todo!()
}

fn main() {
    let s = String::from("hi");
    append_exclaim(&s);
    println!("{s}");

    let mut v = vec![1, 2, 3];
    let first = &v[0];
    v.push(4);
    println!("first = {first}");

    double_all(&mut v);
    println!("{v:?}");
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn append_exclaim_works() {
        let mut s = String::from("hi");
        append_exclaim(&mut s);
        append_exclaim(&mut s);
        assert_eq!(s, "hi!!");
    }

    #[test]
    fn double_all_works() {
        let mut v = vec![1, -2, 30];
        double_all(&mut v);
        assert_eq!(v, vec![2, -4, 60]);
        let mut empty: Vec<i32> = Vec::new();
        double_all(&mut empty);
        assert!(empty.is_empty());
    }
}
:::

:::solution
/// 在字符串末尾加一个感叹号
fn append_exclaim(s: &mut String) {
    s.push('!');
}

/// 把每个元素翻倍
fn double_all(v: &mut Vec<i32>) {
    for x in v.iter_mut() {
        *x *= 2;
    }
}

fn main() {
    let mut s = String::from("hi");
    append_exclaim(&mut s);
    println!("{s}");

    let mut v = vec![1, 2, 3];
    let first = v[0];
    v.push(4);
    println!("first = {first}");

    double_all(&mut v);
    println!("{v:?}");
}
:::

---
title: 迭代器：map、filter、collect
forbid: for | while | loop
---
`for` 循环背后是 `Iterator` trait，它的核心只有一个方法：

```rust
trait Iterator {
    type Item;
    fn next(&mut self) -> Option<Self::Item>;   // 有下一个就返回 Some，没有了返回 None
}
```

## 从集合得到迭代器

和第 4 章的三种 `for` 一一对应：

```rust
let v = vec![1, 2, 3];
v.iter();         // 产出 &T      借用
v.iter_mut();     // 产出 &mut T  可变借用
v.into_iter();    // 产出 T       拿走所有权
```

## 适配器：把一个迭代器变成另一个

```rust
let v = vec![1, 2, 3, 4, 5, 6];
let it = v.iter()
    .filter(|x| **x % 2 == 0)      // 只留偶数
    .map(|x| x * x);               // 再平方
```

迭代器是**惰性**的：上面这段代码什么都没算，只是搭好了一条流水线。和 Python 的生成器表达式、C++20 的 ranges 是同一个思路。

## 消费者：真正驱动迭代

```rust
let squares: Vec<i32> = it.collect();          // 收集成集合，目标类型靠标注决定
let total: i32 = v.iter().sum();
let n = v.iter().count();
let biggest = v.iter().max();                  // Option<&i32>
```

`collect` 能收集成 `Vec`、`String`、`HashMap`、`HashSet` 等许多类型，所以**必须告诉它目标类型**：标注变量类型，或者用涡轮鱼 `.collect::<Vec<_>>()`。

## 关于那些 * 和 &

`v.iter()` 产出的是 `&i32`；`filter` 的闭包拿到的又是「对元素的引用」，于是成了 `&&i32`，要写 `**x`。嫌乱的话有两个办法：

```rust
v.iter().copied().filter(|x| x % 2 == 0)     // copied() 把 &i32 变成 i32
v.iter().filter(|&&x| x % 2 == 0)            // 在参数位置用模式把引用拆掉
```

## 零成本

链式调用会被编译成和手写循环一样的机器码，没有中间的临时集合，也没有虚函数调用。在 Rust 里用迭代器不是「为了优雅牺牲性能」，放心用。

## 任务

本关禁止使用 `for`、`while`、`loop`，请用迭代器链完成：

1. `squares_of_evens(nums)`：取出偶数，返回它们的平方
2. `total_len(words)`：所有字符串的长度之和
3. `to_upper_all(words)`：把每个字符串转成大写

:::hint
`squares_of_evens`：`nums.iter().copied().filter(|x| x % 2 == 0).map(|x| x * x).collect()`
:::

:::hint
`total_len`：`words.iter().map(|w| w.len()).sum()`

`to_upper_all`：`words.iter().map(|w| w.to_uppercase()).collect()`
:::

:::exercise
fn squares_of_evens(nums: &[i32]) -> Vec<i32> {
    todo!()
}

fn total_len(words: &[&str]) -> usize {
    todo!()
}

fn to_upper_all(words: &[&str]) -> Vec<String> {
    todo!()
}

fn main() {
    println!("{:?}", squares_of_evens(&[1, 2, 3, 4, 5, 6]));
    println!("{}", total_len(&["fearless", "concurrency"]));
    println!("{:?}", to_upper_all(&["zero", "cost"]));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn squares_of_evens_works() {
        assert_eq!(squares_of_evens(&[1, 2, 3, 4, 5, 6]), vec![4, 16, 36]);
        assert_eq!(squares_of_evens(&[-2, 7, 0]), vec![4, 0]);
        assert_eq!(squares_of_evens(&[1, 3]), Vec::<i32>::new());
    }

    #[test]
    fn total_len_works() {
        assert_eq!(total_len(&["fearless", "concurrency"]), 19);
        assert_eq!(total_len(&[]), 0);
        assert_eq!(total_len(&["", "a"]), 1);
    }

    #[test]
    fn to_upper_all_works() {
        assert_eq!(to_upper_all(&["zero", "Cost"]), vec!["ZERO", "COST"]);
        assert_eq!(to_upper_all(&[]), Vec::<String>::new());
    }
}
:::

:::solution
fn squares_of_evens(nums: &[i32]) -> Vec<i32> {
    nums.iter().copied().filter(|x| x % 2 == 0).map(|x| x * x).collect()
}

fn total_len(words: &[&str]) -> usize {
    words.iter().map(|w| w.len()).sum()
}

fn to_upper_all(words: &[&str]) -> Vec<String> {
    words.iter().map(|w| w.to_uppercase()).collect()
}

fn main() {
    println!("{:?}", squares_of_evens(&[1, 2, 3, 4, 5, 6]));
    println!("{}", total_len(&["fearless", "concurrency"]));
    println!("{:?}", to_upper_all(&["zero", "cost"]));
}
:::

---
title: Vec：动态数组
---
`Vec<T>` 是最常用的集合，对应 C++ 的 `std::vector<T>` 和 Python 的 `list`（但元素类型必须相同）。

```rust
let mut v: Vec<i32> = Vec::new();
v.push(1);
v.push(2);
let v2 = vec![10, 20, 30];        // vec! 宏直接初始化
let zeros = vec![0; 5];           // [0, 0, 0, 0, 0]

let last: Option<i32> = v.pop();  // 弹出末尾元素；空的时候返回 None
v.len();
v.is_empty();
```

## 读取元素：两种方式

```rust
let third = v2[2];              // 越界会 panic
let maybe = v2.get(7);          // 返回 Option<&i32>，越界得到 None
```

确定下标一定有效时用 `[]`，下标来自外部输入时用 `get`。

## 三种遍历方式

这是所有权在集合上的体现，值得记牢：

```rust
for x in &v { }        // x: &i32      只读借用，循环后 v 还在
for x in &mut v { }    // x: &mut i32  可以用 *x 修改元素
for x in v { }         // x: i32       拿走所有权，循环后 v 不能再用
```

## 常用方法

```rust
v.contains(&3);                 // 是否包含
v.sort();                       // 原地排序
v.retain(|x| *x > 0);           // 只保留满足条件的元素；|x| ... 是闭包，第 8 章细讲
v.insert(0, 99);                // 在指定位置插入，O(n)
v.remove(0);                    // 删除并返回指定位置的元素，O(n)
v.extend([7, 8, 9]);            // 追加多个元素
v.first(); v.last();            // 首尾元素，返回 Option<&T>
```

## 任务

1. `evens_below(n)`：返回所有小于 `n` 的非负偶数，从小到大
2. `remove_negatives(v)`：原地删除所有负数
3. `max_of(v)`：返回最大值；空切片返回 `None`（请自己写循环来实现）

:::hint
`evens_below`：创建空的 `Vec`，`for i in 0..n { if i % 2 == 0 { v.push(i); } }`，最后返回它。也可以写成 `(0..n).step_by(2).collect()`。
:::

:::hint
`remove_negatives`：`v.retain(|x| *x >= 0);`
:::

:::hint
`max_of`：先用 `let mut best = *v.first()?;` 取出第一个元素（空的时候 `?` 会直接返回 `None`），再遍历 `for &x in v`，遇到更大的就更新 `best`，最后返回 `Some(best)`。
:::

:::exercise
/// 所有小于 n 的非负偶数
fn evens_below(n: u32) -> Vec<u32> {
    todo!()
}

/// 原地删除所有负数
fn remove_negatives(v: &mut Vec<i32>) {
    todo!()
}

/// 最大值；空切片返回 None
fn max_of(v: &[i32]) -> Option<i32> {
    todo!()
}

fn main() {
    println!("{:?}", evens_below(10));
    let mut v = vec![3, -1, 4, -1, 5, -9, 2, 6];
    remove_negatives(&mut v);
    println!("{v:?}");
    println!("最大值: {:?}", max_of(&v));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn evens_below_works() {
        assert_eq!(evens_below(10), vec![0, 2, 4, 6, 8]);
        assert_eq!(evens_below(1), vec![0]);
        assert_eq!(evens_below(0), Vec::<u32>::new());
    }

    #[test]
    fn remove_negatives_works() {
        let mut v = vec![3, -1, 4, -1, 5, -9, 0];
        remove_negatives(&mut v);
        assert_eq!(v, vec![3, 4, 5, 0]);
    }

    #[test]
    fn max_of_works() {
        assert_eq!(max_of(&[3, 9, 2]), Some(9));
        assert_eq!(max_of(&[-5, -2, -8]), Some(-2));
        assert_eq!(max_of(&[7]), Some(7));
        assert_eq!(max_of(&[]), None);
    }
}
:::

:::solution
/// 所有小于 n 的非负偶数
fn evens_below(n: u32) -> Vec<u32> {
    let mut v = Vec::new();
    for i in 0..n {
        if i % 2 == 0 {
            v.push(i);
        }
    }
    v
}

/// 原地删除所有负数
fn remove_negatives(v: &mut Vec<i32>) {
    v.retain(|x| *x >= 0);
}

/// 最大值；空切片返回 None
fn max_of(v: &[i32]) -> Option<i32> {
    let mut best = *v.first()?;
    for &x in v {
        if x > best {
            best = x;
        }
    }
    Some(best)
}

fn main() {
    println!("{:?}", evens_below(10));
    let mut v = vec![3, -1, 4, -1, 5, -9, 2, 6];
    remove_negatives(&mut v);
    println!("{v:?}");
    println!("最大值: {:?}", max_of(&v));
}
:::

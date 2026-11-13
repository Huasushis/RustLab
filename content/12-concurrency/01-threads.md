---
title: 线程
---
```rust
use std::thread;

let handle = thread::spawn(|| {
    // 在新线程里运行
    42
});
let answer = handle.join().unwrap();   // 等待线程结束，拿到闭包的返回值
```

`thread::spawn` 创建一个操作系统线程（和 C++ 的 `std::thread` 一样）。它返回一个 `JoinHandle`，`join()` 会阻塞直到线程结束，并带回闭包的返回值——比 C++ 方便，那边要通过共享变量或 `std::future` 才能拿到结果。如果线程 panic 了，`join()` 返回 `Err`。

和 Python 不同，Rust 没有 GIL，多个线程能真正并行地跑在多个 CPU 核上。

## move：把数据交给线程

```rust
let name = String::from("worker");
let h = thread::spawn(move || {
    println!("我是 {name}");      // name 被移进了线程
});
```

如果去掉 `move`，编译器会报错：新线程可能比当前函数活得更久，借用局部变量不安全。在 C++ 里，lambda 按引用捕获一个即将销毁的局部变量再交给线程，是一个能编译、偶尔崩溃的经典 bug；Rust 直接拒绝编译。

## 作用域线程：可以借用的线程

如果能保证线程在函数返回前全部结束，借用就是安全的。`thread::scope` 正是提供这个保证：

```rust
let data = vec![1, 2, 3, 4];
let (left, right) = data.split_at(2);
let total = thread::scope(|s| {
    let a = s.spawn(|| left.iter().sum::<i32>());     // 直接借用 left，不需要 move 或复制
    let b = s.spawn(|| right.iter().sum::<i32>());
    a.join().unwrap() + b.join().unwrap()
});   // scope 结束时，里面创建的所有线程都保证已经结束
```

## 任务

1. `spawn_squares(n)`：为 `0..n` 里的每个 `i` 启动一个线程计算 `i * i`，按 `i` 的顺序返回所有结果。先把所有 `JoinHandle` 收集到一个 `Vec` 里，再依次 `join`
2. `parallel_sum(data, parts)`：用 `thread::scope` 把切片切成最多 `parts` 块，每块由一个线程求和，最后把各块的结果加起来。`data.chunks(size)` 可以按固定大小切块

:::hint
`spawn_squares`：
```rust
let handles: Vec<_> = (0..n).map(|i| thread::spawn(move || i * i)).collect();
handles.into_iter().map(|h| h.join().unwrap()).collect()
```
`move` 让每个线程拿到自己的那份 `i`。
:::

:::hint
`parallel_sum` 先算出每块的大小（向上取整，并且至少为 1）：`let size = data.len().div_ceil(parts.max(1)).max(1);`
:::

:::hint
```rust
thread::scope(|s| {
    let handles: Vec<_> = data.chunks(size).map(|chunk| s.spawn(move || chunk.iter().sum::<i64>())).collect();
    handles.into_iter().map(|h| h.join().unwrap()).sum()
})
```
:::

:::exercise
use std::thread;

/// 每个 i 一个线程，计算 i*i，按顺序返回
fn spawn_squares(n: u64) -> Vec<u64> {
    todo!()
}

/// 把 data 切成最多 parts 块，并行求和
fn parallel_sum(data: &[i64], parts: usize) -> i64 {
    todo!()
}

fn main() {
    println!("{:?}", spawn_squares(6));
    let data: Vec<i64> = (1..=1000).collect();
    println!("{}", parallel_sum(&data, 4));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn squares_in_order() {
        assert_eq!(spawn_squares(6), vec![0, 1, 4, 9, 16, 25]);
        assert_eq!(spawn_squares(0), Vec::<u64>::new());
    }

    #[test]
    fn parallel_sum_matches_serial() {
        let data: Vec<i64> = (1..=1000).collect();
        for parts in [1, 2, 3, 4, 7, 1000, 5000] {
            assert_eq!(parallel_sum(&data, parts), 500500, "parts = {parts}");
        }
        assert_eq!(parallel_sum(&[], 4), 0);
        assert_eq!(parallel_sum(&[5, -5, 10], 0), 10);
    }
}
:::

:::solution
use std::thread;

/// 每个 i 一个线程，计算 i*i，按顺序返回
fn spawn_squares(n: u64) -> Vec<u64> {
    let handles: Vec<_> = (0..n).map(|i| thread::spawn(move || i * i)).collect();
    handles.into_iter().map(|h| h.join().unwrap()).collect()
}

/// 把 data 切成最多 parts 块，并行求和
fn parallel_sum(data: &[i64], parts: usize) -> i64 {
    let size = data.len().div_ceil(parts.max(1)).max(1);
    thread::scope(|s| {
        let handles: Vec<_> = data.chunks(size).map(|chunk| s.spawn(move || chunk.iter().sum::<i64>())).collect();
        handles.into_iter().map(|h| h.join().unwrap()).sum()
    })
}

fn main() {
    println!("{:?}", spawn_squares(6));
    let data: Vec<i64> = (1..=1000).collect();
    println!("{}", parallel_sum(&data, 4));
}
:::

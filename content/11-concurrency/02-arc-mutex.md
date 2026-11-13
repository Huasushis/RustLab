---
title: Arc 与 Mutex：共享状态
---
多个线程要修改同一份数据时，需要两样东西：

1. **多个所有者**：每个线程都要持有这份数据
2. **互斥访问**：同一时刻只能有一个线程在修改

在单线程里，这对应第 9 章的 `Rc<RefCell<T>>`。多线程版本是 `Arc<Mutex<T>>`：

| 单线程 | 多线程 | 区别 |
| --- | --- | --- |
| `Rc<T>` | `Arc<T>` | Atomic RC：计数用原子操作更新 |
| `RefCell<T>` | `Mutex<T>` | 冲突时不 panic，而是阻塞等待 |

```rust
use std::sync::{Arc, Mutex};
use std::thread;

let counter = Arc::new(Mutex::new(0));
let mut handles = vec![];
for _ in 0..4 {
    let counter = Arc::clone(&counter);         // 每个线程一份 Arc
    handles.push(thread::spawn(move || {
        let mut n = counter.lock().unwrap();    // 加锁，得到一个「锁守卫」
        *n += 1;
    }));                                        // 守卫离开作用域时自动解锁
}
for h in handles { h.join().unwrap(); }
println!("{}", *counter.lock().unwrap());       // 4
```

## Mutex 包着数据，而不是在数据旁边

在 C++ 里，`std::mutex` 和它保护的数据是两个独立的变量，「访问数据之前先加锁」只是一个约定，忘了加锁照样能编译。

Rust 的 `Mutex<T>` **把数据包在里面**：不调用 `lock()` 就根本拿不到 `T`。而 `lock()` 返回的守卫一被丢弃就自动解锁（RAII），也不会忘记解锁。

## Send 和 Sync：编译器怎么知道 Rc 不能跨线程

- `Send`：这个类型的值可以**移动**到另一个线程
- `Sync`：这个类型的值可以被多个线程**同时引用**

这两个 trait 由编译器自动推导。`Rc` 的计数不是原子的，所以它既不是 `Send` 也不是 `Sync`；`RefCell` 的借用标记也不是线程安全的，所以它不是 `Sync`。`thread::spawn` 要求闭包是 `Send`，于是把 `Rc` 交给线程会**编译失败**。

这就是 Rust「无畏并发」的含义：数据竞争不是在运行时偶尔出现的诡异 bug，而是编译错误。

## 任务

右边的代码用单线程的 `Rc<RefCell<…>>` 写成，编译不过。读一读编译器的报错，然后：

1. 把 `Rc` 换成 `Arc`、`RefCell` 换成 `Mutex`，修好 `concurrent_count`
2. 用同样的方法实现 `collect_ids`：启动 `n` 个线程，第 `i` 个线程把 `i` 推进一个共享的 `Vec`，最后返回**排好序**的结果（线程的执行顺序是不确定的）

:::hint
`use std::sync::{Arc, Mutex};`，然后把 `Rc::new(RefCell::new(0))` 换成 `Arc::new(Mutex::new(0))`，`Rc::clone` 换成 `Arc::clone`，`borrow_mut()` 换成 `lock().unwrap()`。
:::

:::hint
函数结束时，所有线程都已经 join 了，只剩下一个 `Arc`。可以用 `*counter.lock().unwrap()` 读出最终的值（`u64` 是 `Copy`，会被复制出来）。
:::

:::hint
`collect_ids`：结构和 `concurrent_count` 一样，线程里写 `ids.lock().unwrap().push(i);`。结束后 `let mut v = ids.lock().unwrap().clone(); v.sort(); v`。
:::

:::exercise
use std::cell::RefCell;
use std::rc::Rc;
use std::thread;

/// threads 个线程，每个把计数器加 per_thread 次
fn concurrent_count(threads: usize, per_thread: u64) -> u64 {
    let counter = Rc::new(RefCell::new(0u64));
    let mut handles = Vec::new();
    for _ in 0..threads {
        let counter = Rc::clone(&counter);
        handles.push(thread::spawn(move || {
            for _ in 0..per_thread {
                *counter.borrow_mut() += 1;
            }
        }));
    }
    for h in handles {
        h.join().unwrap();
    }
    *counter.borrow()
}

/// n 个线程各自把自己的编号 i 推进共享的 Vec，返回排好序的结果
fn collect_ids(n: usize) -> Vec<usize> {
    todo!()
}

fn main() {
    println!("{}", concurrent_count(8, 1000));
    println!("{:?}", collect_ids(5));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn count_is_exact() {
        assert_eq!(concurrent_count(8, 1000), 8000);
        assert_eq!(concurrent_count(1, 5), 5);
        assert_eq!(concurrent_count(0, 5), 0);
    }

    #[test]
    fn collect_ids_works() {
        assert_eq!(collect_ids(5), vec![0, 1, 2, 3, 4]);
        assert_eq!(collect_ids(0), Vec::<usize>::new());
        assert_eq!(collect_ids(64), (0..64).collect::<Vec<_>>());
    }
}
:::

:::solution
use std::sync::{Arc, Mutex};
use std::thread;

/// threads 个线程，每个把计数器加 per_thread 次
fn concurrent_count(threads: usize, per_thread: u64) -> u64 {
    let counter = Arc::new(Mutex::new(0u64));
    let mut handles = Vec::new();
    for _ in 0..threads {
        let counter = Arc::clone(&counter);
        handles.push(thread::spawn(move || {
            for _ in 0..per_thread {
                *counter.lock().unwrap() += 1;
            }
        }));
    }
    for h in handles {
        h.join().unwrap();
    }
    *counter.lock().unwrap()
}

/// n 个线程各自把自己的编号 i 推进共享的 Vec，返回排好序的结果
fn collect_ids(n: usize) -> Vec<usize> {
    let ids = Arc::new(Mutex::new(Vec::new()));
    let mut handles = Vec::new();
    for i in 0..n {
        let ids = Arc::clone(&ids);
        handles.push(thread::spawn(move || {
            ids.lock().unwrap().push(i);
        }));
    }
    for h in handles {
        h.join().unwrap();
    }
    let mut v = ids.lock().unwrap().clone();
    v.sort();
    v
}

fn main() {
    println!("{}", concurrent_count(8, 1000));
    println!("{:?}", collect_ids(5));
}
:::

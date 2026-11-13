---
title: 通道：用消息传递通信
---
> 不要通过共享内存来通信，而要通过通信来共享内存。——Go 语言的格言，Rust 同样推崇

**通道**（channel）是线程之间的管道：一端发送，另一端接收。数据的所有权随消息一起转移，发送之后发送方就不能再碰它了，所以根本不存在「共享」。

```rust
use std::sync::mpsc;      // multi-producer, single-consumer：多个发送端，一个接收端
use std::thread;

let (tx, rx) = mpsc::channel();

thread::spawn(move || {
    tx.send(String::from("你好")).unwrap();
    // 这里不能再使用那个 String 了：它已经被发送走了
});

let msg = rx.recv().unwrap();     // 阻塞等待一条消息
println!("{msg}");
```

类比：Python 的 `queue.Queue`、Go 的 channel。C++ 标准库里没有现成的，通常要自己用 `mutex` 加 `condition_variable` 拼一个。

## 多个生产者

`tx.clone()` 可以得到更多发送端，交给不同的线程：

```rust
for id in 0..3 {
    let tx = tx.clone();
    thread::spawn(move || {
        tx.send(id * 10).unwrap();
    });
}
drop(tx);                   // 关键：丢掉最初的那个发送端

for value in rx {           // 接收端可以直接当迭代器用
    println!("{value}");
}                           // 所有发送端都被丢弃后，循环自动结束
```

**为什么要 `drop(tx)`？** 只要还有一个发送端活着，接收端就认为「可能还有消息要来」，`for value in rx` 就会一直等下去。原始的 `tx` 留在主线程里没有被使用，如果不手动丢掉，程序会永远卡住。

## 任务

实现一个简单的「工作者池」：`parallel_map(inputs, workers)`

1. 把 `inputs` 平均分给 `workers` 个线程（第 `w` 个线程负责下标满足 `i % workers == w` 的元素）
2. 每个线程对自己负责的元素计算 `x * x`，把 `(下标, 结果)` 通过通道发回主线程
3. 主线程收集所有结果，**按原始顺序**返回

`workers` 为 0 时按 1 处理。

:::hint
先准备好数据：`let workers = workers.max(1); let inputs = Arc::new(inputs);` 用 `Arc` 共享输入，每个线程都能读，又不用复制整个 `Vec`。
:::

:::hint
```rust
let (tx, rx) = mpsc::channel();
for w in 0..workers {
    let tx = tx.clone();
    let inputs = Arc::clone(&inputs);
    thread::spawn(move || {
        for i in (w..inputs.len()).step_by(workers) {
            tx.send((i, inputs[i] * inputs[i])).unwrap();
        }
    });
}
drop(tx);
```
:::

:::hint
接收端：先建一个结果数组 `let mut out = vec![0; inputs.len()];`，然后 `for (i, v) in rx { out[i] = v; }`，最后返回 `out`。
:::

:::exercise
use std::sync::mpsc;
use std::sync::Arc;
use std::thread;

/// 用 workers 个线程并行计算每个元素的平方，按原顺序返回
fn parallel_map(inputs: Vec<i64>, workers: usize) -> Vec<i64> {
    todo!()
}

fn main() {
    let inputs: Vec<i64> = (1..=10).collect();
    println!("{:?}", parallel_map(inputs, 3));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_order() {
        let inputs: Vec<i64> = (1..=10).collect();
        let expected: Vec<i64> = inputs.iter().map(|x| x * x).collect();
        for workers in [0, 1, 2, 3, 4, 10, 32] {
            assert_eq!(parallel_map(inputs.clone(), workers), expected, "workers = {workers}");
        }
    }

    #[test]
    fn empty_input() {
        assert_eq!(parallel_map(vec![], 4), Vec::<i64>::new());
    }

    #[test]
    fn negative_numbers() {
        assert_eq!(parallel_map(vec![-3, 0, 3], 2), vec![9, 0, 9]);
    }
}
:::

:::solution
use std::sync::mpsc;
use std::sync::Arc;
use std::thread;

/// 用 workers 个线程并行计算每个元素的平方，按原顺序返回
fn parallel_map(inputs: Vec<i64>, workers: usize) -> Vec<i64> {
    let workers = workers.max(1);
    let inputs = Arc::new(inputs);
    let (tx, rx) = mpsc::channel();
    for w in 0..workers {
        let tx = tx.clone();
        let inputs = Arc::clone(&inputs);
        thread::spawn(move || {
            for i in (w..inputs.len()).step_by(workers) {
                tx.send((i, inputs[i] * inputs[i])).unwrap();
            }
        });
    }
    drop(tx);

    let mut out = vec![0; inputs.len()];
    for (i, v) in rx {
        out[i] = v;
    }
    out
}

fn main() {
    let inputs: Vec<i64> = (1..=10).collect();
    println!("{:?}", parallel_map(inputs, 3));
}
:::

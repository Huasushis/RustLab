---
title: 实现自己的迭代器
---
让自己的类型成为迭代器，只需要实现**一个方法**：

```rust
struct Countdown {
    n: u32,
}

impl Iterator for Countdown {
    type Item = u32;                         // 关联类型：这个迭代器产出什么

    fn next(&mut self) -> Option<u32> {
        if self.n == 0 {
            None                             // 返回 None 表示结束
        } else {
            self.n -= 1;
            Some(self.n + 1)
        }
    }
}
```

然后上两关的**所有**方法就都免费得到了，也能直接用在 `for` 循环里：

```rust
for i in Countdown { n: 3 } { println!("{i}"); }               // 3 2 1
let total: u32 = Countdown { n: 4 }.map(|x| x * x).sum();      // 30
```

这就是 trait 默认方法的威力：`map`、`filter`、`sum`…… 全都是基于 `next` 写好的默认实现。

对比一下工作量：C++ 里写一个符合标准的迭代器，要定义五个类型别名，再实现 `operator*`、`operator++`、`operator==`；Python 要实现 `__iter__` 和 `__next__`，或者写一个生成器函数。

## 无限迭代器

迭代器是惰性的，所以 `next` **永远不返回 `None`** 也没关系，由使用者决定取多少：

```rust
let first_ten: Vec<u32> = (1..).take(10).collect();      // 1.. 是没有上界的区间
let big = (1..).map(|x| x * x).find(|x| *x > 500);       // Some(529)
```

## 任务

1. 为 `Countdown` 实现 `Iterator`：从 `n` 数到 1。比如 `Countdown { n: 3 }` 产出 3、2、1
2. 为 `Fib` 实现 `Iterator`：产出斐波那契数列 0、1、1、2、3、5、8……（`Item` 用 `u64`），它是无限的
3. 实现 `Fib::new()`

`Fib` 的两个字段该存什么，由你决定。

:::hint
`Countdown` 可以直接照搬讲解里的写法。
:::

:::hint
让 `Fib` 保存「当前项」和「下一项」：`struct Fib { a: u64, b: u64 }`，`new` 返回 `Fib { a: 0, b: 1 }`。
:::

:::hint
`Fib` 的 `next`：
```rust
let current = self.a;
self.a = self.b;
self.b += current;
Some(current)
```
:::

:::exercise
struct Countdown {
    n: u32,
}

// TODO: impl Iterator for Countdown

struct Fib {
    // TODO: 需要哪些字段？
}

impl Fib {
    fn new() -> Self {
        todo!()
    }
}

// TODO: impl Iterator for Fib

fn main() {
    let v: Vec<u32> = Countdown { n: 5 }.collect();
    println!("{v:?}");
    let fibs: Vec<u64> = Fib::new().take(10).collect();
    println!("{fibs:?}");
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn countdown_works() {
        assert_eq!(Countdown { n: 3 }.collect::<Vec<u32>>(), vec![3, 2, 1]);
        assert_eq!(Countdown { n: 0 }.count(), 0);
        assert_eq!(Countdown { n: 4 }.map(|x| x * x).sum::<u32>(), 30);
    }

    #[test]
    fn fib_sequence() {
        let first: Vec<u64> = Fib::new().take(10).collect();
        assert_eq!(first, vec![0, 1, 1, 2, 3, 5, 8, 13, 21, 34]);
    }

    #[test]
    fn fib_with_adapters() {
        // 100 以内的偶数斐波那契数之和：0 + 2 + 8 + 34
        let sum: u64 = Fib::new().take_while(|&x| x < 100).filter(|x| x % 2 == 0).sum();
        assert_eq!(sum, 44);
        assert_eq!(Fib::new().find(|&x| x > 1000), Some(1597));
        assert_eq!(Fib::new().nth(50), Some(12586269025));
    }
}
:::

:::solution
struct Countdown {
    n: u32,
}

impl Iterator for Countdown {
    type Item = u32;

    fn next(&mut self) -> Option<u32> {
        if self.n == 0 {
            None
        } else {
            self.n -= 1;
            Some(self.n + 1)
        }
    }
}

struct Fib {
    a: u64,
    b: u64,
}

impl Fib {
    fn new() -> Self {
        Fib { a: 0, b: 1 }
    }
}

impl Iterator for Fib {
    type Item = u64;

    fn next(&mut self) -> Option<u64> {
        let current = self.a;
        self.a = self.b;
        self.b += current;
        Some(current)
    }
}

fn main() {
    let v: Vec<u32> = Countdown { n: 5 }.collect();
    println!("{v:?}");
    let fibs: Vec<u64> = Fib::new().take(10).collect();
    println!("{fibs:?}");
}
:::

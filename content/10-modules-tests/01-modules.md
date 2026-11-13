---
title: 模块与可见性
---
随着代码变多，需要把它分组。Rust 用 **模块**（module）组织代码，用 `pub` 控制可见性。

```rust
mod geometry {                     // 定义一个模块，类似 C++ 的 namespace
    pub fn area(w: f64, h: f64) -> f64 {
        w * h
    }

    fn helper() {}                 // 没有 pub：只有 geometry 模块内部能用

    pub mod shapes {               // 模块可以嵌套
        pub struct Square {
            pub side: f64,         // 结构体的每个字段要单独标 pub
            id: u32,               // 私有字段：外部无法直接读写，也无法直接构造
        }
    }
}

fn main() {
    let a = geometry::area(2.0, 3.0);        // 用 :: 访问路径
    // geometry::helper();                   // ❌ function `helper` is private
}
```

## 默认私有

模块里的一切**默认对外部私有**，要显式 `pub` 才能被外部看见。

- 和 C++ 的 `namespace` 不同：namespace 只管名字，不管访问权限
- 和 Python 的「约定俗成用 `_` 开头表示私有」不同：Rust 是编译器强制执行的
- 可见性的边界是**模块**而不是类型：同一个模块里的代码能访问彼此的私有字段

结构体是 `pub` 的但字段私有，是 Rust 里**封装**的标准做法：外部只能通过你提供的 `pub fn` 构造和修改它，从而保证不变量（比如「余额永远不为负」）。

## use：把路径引入作用域

```rust
use geometry::shapes::Square;          // 之后可以直接写 Square
use std::collections::{HashMap, HashSet};   // 一次引入多个
use std::fmt::Result as FmtResult;     // 重命名，避免冲突
```

模块内部用 `super::` 访问父模块，用 `crate::` 从根开始写绝对路径。你在测试里已经见过很多次 `use super::*;` 了——测试模块就是一个普通的子模块。

## 拆分成文件

真实项目里，`mod geometry;`（注意是分号而不是花括号）会让编译器去读 `geometry.rs` 或 `geometry/mod.rs`。机制和本关的内联模块完全一样，只是换了个存放位置。在线环境只有一个文件，所以这里都写在一起。

## 任务

`bank` 模块里有一个 `Account` 类型。现在 `main` 和测试都编译不过，因为需要用的东西全是私有的。

1. 给需要对外公开的项加上 `pub`：`Account` 类型、`new`、`deposit`、`withdraw`、`balance` 方法
2. **不要**把 `balance` 字段公开：余额只能通过方法修改，这样才能保证 `withdraw` 不会透支
3. 在 `main` 上方加一行 `use`，让 `main` 里可以直接写 `Account`
4. 实现 `withdraw`：余额足够时扣款并返回 `true`，不够时什么都不做并返回 `false`

:::hint
需要加 `pub` 的位置：`pub struct Account`、`pub fn new`、`pub fn deposit`、`pub fn withdraw`、`pub fn balance`。字段 `balance: u64` 保持原样。
:::

:::hint
在 `fn main` 之前加 `use bank::Account;`
:::

:::hint
`withdraw`：
```rust
if amount > self.balance {
    return false;
}
self.balance -= amount;
true
```
:::

:::exercise
mod bank {
    struct Account {
        owner: String,
        balance: u64,
    }

    impl Account {
        fn new(owner: &str) -> Self {
            Account { owner: owner.to_string(), balance: 0 }
        }

        fn deposit(&mut self, amount: u64) {
            self.balance += amount;
        }

        /// 余额足够则扣款并返回 true，否则不做任何事并返回 false
        fn withdraw(&mut self, amount: u64) -> bool {
            todo!()
        }

        fn balance(&self) -> u64 {
            self.balance
        }

        fn owner(&self) -> &str {
            &self.owner
        }
    }
}

fn main() {
    let mut acc = Account::new("Ada");
    acc.deposit(100);
    println!("取 30：{}", acc.withdraw(30));
    println!("取 500：{}", acc.withdraw(500));
    println!("余额：{}", acc.balance());
}
:::

:::tests
#[cfg(test)]
mod rustlab_checks {
    use super::bank::Account;

    #[test]
    fn deposit_and_withdraw() {
        let mut acc = Account::new("Ada");
        acc.deposit(100);
        assert!(acc.withdraw(30));
        assert_eq!(acc.balance(), 70);
        assert!(!acc.withdraw(71));
        assert_eq!(acc.balance(), 70);
        assert!(acc.withdraw(70));
        assert_eq!(acc.balance(), 0);
    }
}
:::

:::solution
mod bank {
    pub struct Account {
        owner: String,
        balance: u64,
    }

    impl Account {
        pub fn new(owner: &str) -> Self {
            Account { owner: owner.to_string(), balance: 0 }
        }

        pub fn deposit(&mut self, amount: u64) {
            self.balance += amount;
        }

        /// 余额足够则扣款并返回 true，否则不做任何事并返回 false
        pub fn withdraw(&mut self, amount: u64) -> bool {
            if amount > self.balance {
                return false;
            }
            self.balance -= amount;
            true
        }

        pub fn balance(&self) -> u64 {
            self.balance
        }

        #[allow(dead_code)]
        fn owner(&self) -> &str {
            &self.owner
        }
    }
}

use bank::Account;

fn main() {
    let mut acc = Account::new("Ada");
    acc.deposit(100);
    println!("取 30：{}", acc.withdraw(30));
    println!("取 500：{}", acc.withdraw(500));
    println!("余额：{}", acc.balance());
}
:::

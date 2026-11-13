---
title: Modules and Visibility
---
As code grows, it needs grouping. Rust organizes code into **modules** and controls visibility with `pub`.

```rust
mod geometry {                     // define a module, similar to a C++ namespace
    pub fn area(w: f64, h: f64) -> f64 {
        w * h
    }

    fn helper() {}                 // no pub: only usable inside geometry

    pub mod shapes {               // modules can nest
        pub struct Square {
            pub side: f64,         // every struct field is made pub individually
            id: u32,               // private field: outside code can't read, write or construct it directly
        }
    }
}

fn main() {
    let a = geometry::area(2.0, 3.0);        // paths use ::
    // geometry::helper();                   // ❌ function `helper` is private
}
```

## Private by default

Everything in a module is **private to the outside by default**; it has to be made `pub` explicitly.

- Unlike a C++ `namespace`: a namespace only scopes names, it doesn't control access
- Unlike Python's "leading `_` means private" convention: Rust's privacy is enforced by the compiler
- The privacy boundary is the **module**, not the type: code in the same module can access each other's private fields

A `pub` struct with private fields is the standard way to do **encapsulation** in Rust: outside code can only construct and modify it through the `pub fn`s you provide, which lets you guarantee invariants (e.g. "the balance is never negative").

## use: bring paths into scope

```rust
use geometry::shapes::Square;               // then just write Square
use std::collections::{HashMap, HashSet};   // several at once
use std::fmt::Result as FmtResult;          // rename to avoid clashes
```

Inside a module, `super::` refers to the parent module and `crate::` starts an absolute path from the root. You've already seen `use super::*;` many times in tests — a test module is an ordinary child module.

## Splitting into files

In real projects, `mod geometry;` (note: a semicolon instead of braces) makes the compiler read `geometry.rs` or `geometry/mod.rs`. It works exactly like the inline modules in this level, just stored elsewhere. The online environment has only one file, so everything is written together here.

## Task

The `bank` module contains an `Account` type. Right now neither `main` nor the tests compile, because everything they need is private.

1. Add `pub` to what needs to be public: the `Account` type and the `new`, `deposit`, `withdraw` and `balance` methods
2. Do **not** make the `balance` field public: the balance may only change through methods, which is how `withdraw` guarantees no overdraft
3. Add a `use` line above `main` so that `main` can write just `Account`
4. Implement `withdraw`: if the balance is sufficient, deduct and return `true`; otherwise do nothing and return `false`

:::hint
Where `pub` goes: `pub struct Account`, `pub fn new`, `pub fn deposit`, `pub fn withdraw`, `pub fn balance`. Leave the field `balance: u64` as it is.
:::

:::hint
Add `use bank::Account;` before `fn main`.
:::

:::hint
`withdraw`:
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

        /// If the balance is sufficient, deduct and return true; otherwise do nothing and return false
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
    println!("withdraw 30: {}", acc.withdraw(30));
    println!("withdraw 500: {}", acc.withdraw(500));
    println!("balance: {}", acc.balance());
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

        /// If the balance is sufficient, deduct and return true; otherwise do nothing and return false
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
    println!("withdraw 30: {}", acc.withdraw(30));
    println!("withdraw 500: {}", acc.withdraw(500));
    println!("balance: {}", acc.balance());
}
:::

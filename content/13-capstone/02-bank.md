---
title: 迷你银行
---
用结构体、枚举、`HashMap`、`Result` 和自定义错误，搭一个小型的账户系统。这类「带有业务规则的状态」正是 Rust 类型系统最能发挥作用的地方：**让非法状态无法表示，让每一种失败都写在类型里**。

## 需求

`Bank` 管理多个账户，每个账户有一个唯一的名字和一个 `u64` 余额（单位：分），新开户余额为 0。

| 方法 | 成功 | 失败 |
| --- | --- | --- |
| `open(name)` | 开户 | 名字已存在 → `DuplicateAccount` |
| `deposit(name, amount)` | 存款 | 账户不存在 → `NoSuchAccount`；金额为 0 → `InvalidAmount` |
| `withdraw(name, amount)` | 取款 | 账户不存在、金额为 0，或余额不足 → `InsufficientFunds { needed, available }` |
| `transfer(from, to, amount)` | 转账 | 以上任何一种；另外 `from == to` → `SameAccount` |
| `balance(name)` | `Some(余额)` | 账户不存在 → `None` |

**原子性**：任何操作失败时，**所有账户的余额都不能改变**。转账尤其要小心：不能出现「已经从 A 扣了钱，才发现 B 不存在」的情况。

`BankError` 枚举和 `Display` 实现已经给好了。

## 提示：借用检查器和 HashMap

```rust
let a = self.accounts.get_mut(from);
let b = self.accounts.get_mut(to);     // ❌ 同时持有两个对 accounts 的可变借用
```

编译器无法证明 `from` 和 `to` 是不同的键，所以不允许同时拿两个可变引用。常见的解法是：**先做完所有检查（只用不可变借用），再依次修改**，每次只持有一个可变借用。这样恰好也满足了原子性的要求。

:::hint
`open`：`if self.accounts.contains_key(name) { return Err(BankError::DuplicateAccount(name.to_string())); }`，然后 `insert(name.to_string(), 0)`。
:::

:::hint
`withdraw` 的顺序：先检查金额，再用 `let balance = self.accounts.get_mut(name).ok_or_else(|| BankError::NoSuchAccount(name.to_string()))?;` 拿到余额的可变引用，然后检查余额是否足够，最后 `*balance -= amount;`。
:::

:::hint
`transfer`：先检查 `from == to` 和金额；再用 `self.balance(to)` 确认收款方存在；然后调用 `self.withdraw(from, amount)?`（它会检查付款方是否存在、余额是否充足，失败时什么都不改）；最后 `self.deposit(to, amount)` —— 此时它一定会成功。
:::

:::exercise
use std::collections::HashMap;
use std::fmt;

#[derive(Debug, PartialEq)]
enum BankError {
    DuplicateAccount(String),
    NoSuchAccount(String),
    InvalidAmount,
    InsufficientFunds { needed: u64, available: u64 },
    SameAccount,
}

impl fmt::Display for BankError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            BankError::DuplicateAccount(n) => write!(f, "账户 {n} 已存在"),
            BankError::NoSuchAccount(n) => write!(f, "账户 {n} 不存在"),
            BankError::InvalidAmount => write!(f, "金额必须大于 0"),
            BankError::InsufficientFunds { needed, available } => {
                write!(f, "余额不足：需要 {needed}，可用 {available}")
            }
            BankError::SameAccount => write!(f, "不能给自己转账"),
        }
    }
}

struct Bank {
    accounts: HashMap<String, u64>,
}

impl Bank {
    fn new() -> Self {
        Bank { accounts: HashMap::new() }
    }

    fn open(&mut self, name: &str) -> Result<(), BankError> {
        todo!()
    }

    fn deposit(&mut self, name: &str, amount: u64) -> Result<(), BankError> {
        todo!()
    }

    fn withdraw(&mut self, name: &str, amount: u64) -> Result<(), BankError> {
        todo!()
    }

    fn transfer(&mut self, from: &str, to: &str, amount: u64) -> Result<(), BankError> {
        todo!()
    }

    fn balance(&self, name: &str) -> Option<u64> {
        todo!()
    }
}

fn main() {
    let mut bank = Bank::new();
    bank.open("ada").unwrap();
    bank.open("bob").unwrap();
    bank.deposit("ada", 1000).unwrap();
    if let Err(e) = bank.transfer("ada", "bob", 1500) {
        println!("转账失败：{e}");
    }
    bank.transfer("ada", "bob", 300).unwrap();
    println!("ada: {:?}, bob: {:?}", bank.balance("ada"), bank.balance("bob"));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    fn setup() -> Bank {
        let mut bank = Bank::new();
        bank.open("ada").unwrap();
        bank.open("bob").unwrap();
        bank.deposit("ada", 1000).unwrap();
        bank
    }

    #[test]
    fn open_and_balance() {
        let mut bank = Bank::new();
        assert_eq!(bank.balance("ada"), None);
        assert_eq!(bank.open("ada"), Ok(()));
        assert_eq!(bank.balance("ada"), Some(0));
        assert_eq!(bank.open("ada"), Err(BankError::DuplicateAccount("ada".to_string())));
    }

    #[test]
    fn deposit_rules() {
        let mut bank = setup();
        assert_eq!(bank.deposit("ada", 50), Ok(()));
        assert_eq!(bank.balance("ada"), Some(1050));
        assert_eq!(bank.deposit("ada", 0), Err(BankError::InvalidAmount));
        assert_eq!(bank.deposit("zed", 5), Err(BankError::NoSuchAccount("zed".to_string())));
    }

    #[test]
    fn withdraw_rules() {
        let mut bank = setup();
        assert_eq!(bank.withdraw("ada", 400), Ok(()));
        assert_eq!(bank.balance("ada"), Some(600));
        assert_eq!(
            bank.withdraw("ada", 601),
            Err(BankError::InsufficientFunds { needed: 601, available: 600 })
        );
        assert_eq!(bank.balance("ada"), Some(600));
        assert_eq!(bank.withdraw("ada", 0), Err(BankError::InvalidAmount));
        assert_eq!(bank.withdraw("zed", 1), Err(BankError::NoSuchAccount("zed".to_string())));
        assert_eq!(bank.withdraw("ada", 600), Ok(()));
        assert_eq!(bank.balance("ada"), Some(0));
    }

    #[test]
    fn transfer_success() {
        let mut bank = setup();
        assert_eq!(bank.transfer("ada", "bob", 300), Ok(()));
        assert_eq!(bank.balance("ada"), Some(700));
        assert_eq!(bank.balance("bob"), Some(300));
    }

    #[test]
    fn transfer_failures_are_atomic() {
        let mut bank = setup();
        assert_eq!(bank.transfer("ada", "zed", 100), Err(BankError::NoSuchAccount("zed".to_string())));
        assert_eq!(bank.transfer("zed", "ada", 100), Err(BankError::NoSuchAccount("zed".to_string())));
        assert_eq!(
            bank.transfer("ada", "bob", 5000),
            Err(BankError::InsufficientFunds { needed: 5000, available: 1000 })
        );
        assert_eq!(bank.transfer("ada", "ada", 10), Err(BankError::SameAccount));
        assert_eq!(bank.transfer("ada", "bob", 0), Err(BankError::InvalidAmount));
        assert_eq!(bank.balance("ada"), Some(1000));
        assert_eq!(bank.balance("bob"), Some(0));
    }

    #[test]
    fn error_messages() {
        assert_eq!(
            BankError::InsufficientFunds { needed: 5, available: 3 }.to_string(),
            "余额不足：需要 5，可用 3"
        );
    }
}
:::

:::solution
use std::collections::HashMap;
use std::fmt;

#[derive(Debug, PartialEq)]
enum BankError {
    DuplicateAccount(String),
    NoSuchAccount(String),
    InvalidAmount,
    InsufficientFunds { needed: u64, available: u64 },
    SameAccount,
}

impl fmt::Display for BankError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            BankError::DuplicateAccount(n) => write!(f, "账户 {n} 已存在"),
            BankError::NoSuchAccount(n) => write!(f, "账户 {n} 不存在"),
            BankError::InvalidAmount => write!(f, "金额必须大于 0"),
            BankError::InsufficientFunds { needed, available } => {
                write!(f, "余额不足：需要 {needed}，可用 {available}")
            }
            BankError::SameAccount => write!(f, "不能给自己转账"),
        }
    }
}

struct Bank {
    accounts: HashMap<String, u64>,
}

impl Bank {
    fn new() -> Self {
        Bank { accounts: HashMap::new() }
    }

    fn open(&mut self, name: &str) -> Result<(), BankError> {
        if self.accounts.contains_key(name) {
            return Err(BankError::DuplicateAccount(name.to_string()));
        }
        self.accounts.insert(name.to_string(), 0);
        Ok(())
    }

    fn deposit(&mut self, name: &str, amount: u64) -> Result<(), BankError> {
        if amount == 0 {
            return Err(BankError::InvalidAmount);
        }
        let balance = self.accounts.get_mut(name).ok_or_else(|| BankError::NoSuchAccount(name.to_string()))?;
        *balance += amount;
        Ok(())
    }

    fn withdraw(&mut self, name: &str, amount: u64) -> Result<(), BankError> {
        if amount == 0 {
            return Err(BankError::InvalidAmount);
        }
        let balance = self.accounts.get_mut(name).ok_or_else(|| BankError::NoSuchAccount(name.to_string()))?;
        if *balance < amount {
            return Err(BankError::InsufficientFunds { needed: amount, available: *balance });
        }
        *balance -= amount;
        Ok(())
    }

    fn transfer(&mut self, from: &str, to: &str, amount: u64) -> Result<(), BankError> {
        if from == to {
            return Err(BankError::SameAccount);
        }
        if amount == 0 {
            return Err(BankError::InvalidAmount);
        }
        if self.balance(to).is_none() {
            return Err(BankError::NoSuchAccount(to.to_string()));
        }
        self.withdraw(from, amount)?;
        self.deposit(to, amount)
    }

    fn balance(&self, name: &str) -> Option<u64> {
        self.accounts.get(name).copied()
    }
}

fn main() {
    let mut bank = Bank::new();
    bank.open("ada").unwrap();
    bank.open("bob").unwrap();
    bank.deposit("ada", 1000).unwrap();
    if let Err(e) = bank.transfer("ada", "bob", 1500) {
        println!("转账失败：{e}");
    }
    bank.transfer("ada", "bob", 300).unwrap();
    println!("ada: {:?}, bob: {:?}", bank.balance("ada"), bank.balance("bob"));
}
:::

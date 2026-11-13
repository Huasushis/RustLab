---
title: A Mini Bank
---
Build a small account system with structs, enums, `HashMap`, `Result` and a custom error type. This kind of "state with business rules" is where Rust's type system shines: **make illegal states unrepresentable, and put every failure into the types**.

## Requirements

`Bank` manages several accounts. Every account has a unique name and a `u64` balance (in cents); a new account starts at 0.

| Method | Success | Failure |
| --- | --- | --- |
| `open(name)` | opens the account | name already taken → `DuplicateAccount` |
| `deposit(name, amount)` | deposits | no such account → `NoSuchAccount`; amount is 0 → `InvalidAmount` |
| `withdraw(name, amount)` | withdraws | no such account, amount 0, or not enough money → `InsufficientFunds { needed, available }` |
| `transfer(from, to, amount)` | transfers | any of the above; plus `from == to` → `SameAccount` |
| `balance(name)` | `Some(balance)` | no such account → `None` |

**Atomicity**: when any operation fails, **no balance may change**. Transfers need special care: you must never "take the money from A, then discover B doesn't exist".

The `BankError` enum and its `Display` implementation are provided.

## Tip: the borrow checker and HashMap

```rust
let a = self.accounts.get_mut(from);
let b = self.accounts.get_mut(to);     // ❌ two mutable borrows of accounts at once
```

The compiler can't prove `from` and `to` are different keys, so it won't let you hold two mutable references. The usual fix: **do all the checks first (with shared borrows only), then make the changes one at a time**, holding a single mutable borrow each time. Conveniently, that's exactly what atomicity requires too.

:::hint
`open`: `if self.accounts.contains_key(name) { return Err(BankError::DuplicateAccount(name.to_string())); }`, then `insert(name.to_string(), 0)`.
:::

:::hint
The order in `withdraw`: check the amount first, then get a mutable reference to the balance with `let balance = self.accounts.get_mut(name).ok_or_else(|| BankError::NoSuchAccount(name.to_string()))?;`, check that it's enough, and finally `*balance -= amount;`.
:::

:::hint
`transfer`: check `from == to` and the amount first; then confirm the receiver exists with `self.balance(to)`; then call `self.withdraw(from, amount)?` (it checks that the payer exists and has enough money, and changes nothing on failure); finally `self.deposit(to, amount)` — which can't fail at that point.
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
            BankError::DuplicateAccount(n) => write!(f, "account {n} already exists"),
            BankError::NoSuchAccount(n) => write!(f, "account {n} does not exist"),
            BankError::InvalidAmount => write!(f, "the amount must be greater than 0"),
            BankError::InsufficientFunds { needed, available } => {
                write!(f, "insufficient funds: need {needed}, have {available}")
            }
            BankError::SameAccount => write!(f, "cannot transfer to the same account"),
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
        println!("transfer failed: {e}");
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
            "insufficient funds: need 5, have 3"
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
            BankError::DuplicateAccount(n) => write!(f, "account {n} already exists"),
            BankError::NoSuchAccount(n) => write!(f, "account {n} does not exist"),
            BankError::InvalidAmount => write!(f, "the amount must be greater than 0"),
            BankError::InsufficientFunds { needed, available } => {
                write!(f, "insufficient funds: need {needed}, have {available}")
            }
            BankError::SameAccount => write!(f, "cannot transfer to the same account"),
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
        println!("transfer failed: {e}");
    }
    bank.transfer("ada", "bob", 300).unwrap();
    println!("ada: {:?}, bob: {:?}", bank.balance("ada"), bank.balance("bob"));
}
:::

---
title: Rc and RefCell
---
The ownership rules say "every value has exactly one owner". But some data naturally has **several owners**: a graph node that many edges point to, or a configuration or logger shared by several components.

## Rc: reference counting

`Rc<T>` (Reference Counted) lets several owners share the same heap data; it's freed when the last owner goes away. It's C++'s `std::shared_ptr<T>`, and also how **every object** works by default in Python.

```rust
use std::rc::Rc;

let a = Rc::new(String::from("shared data"));
let b = Rc::clone(&a);               // just increments the count; the string isn't copied
println!("{}", Rc::strong_count(&a));   // 2
println!("{a} {b}");
```

By convention we write `Rc::clone(&a)` rather than `a.clone()`, so readers can see at a glance this is a cheap count increment and not a deep copy.

Note: `Rc`'s count isn't updated atomically, so it **can only be used on a single thread**; trying to send it to another thread is a compile error. The multi-threaded version is `Arc` (chapter 12).

## The catch: data inside an Rc is read-only

With several owners, nobody can get a `&mut T` (that would break "mutable means exclusive"). So how do you modify shared data?

## RefCell: move the borrow check to run time

`RefCell<T>` provides **interior mutability**: you can change the value inside even if you only have a `&RefCell<T>`.

```rust
use std::cell::RefCell;

let cell = RefCell::new(vec![1, 2]);
cell.borrow_mut().push(3);              // take a "mutable borrow" at run time
println!("{}", cell.borrow().len());    // take a "shared borrow" at run time
```

The borrowing rules **still apply**, they're just checked at run time instead of compile time: calling `borrow()` or `borrow_mut()` while a `borrow_mut()` is still alive makes the program **panic**. `RefCell` is an escape hatch; use it sparingly.

## Combined: Rc<RefCell<T>>

"Several owners, all able to modify" is the two nested together. That's roughly an ordinary mutable object in Python, or a `shared_ptr<T>` in C++ — the difference being that Rust makes you **explicitly opt in** to this flexibility and writes it plainly in the type.

```rust
let shared = Rc::new(RefCell::new(0));
let other = Rc::clone(&shared);
*other.borrow_mut() += 10;
println!("{}", shared.borrow());   // 10
```

> Reference cycles (A points to B and B points back to A) keep the counts from ever reaching zero and leak memory. The fix is to make one direction a weak reference, `Weak<T>`, the counterpart of C++'s `std::weak_ptr`.

## Task

Several `Service`s share one `Logger`.

1. `Logger::log` takes `&self` but needs to append to `lines`, so it doesn't compile. Change `lines` to `RefCell<Vec<String>>` and update `new`, `log` and `count` accordingly
2. Implement `Service::new`: store the name and **share** (not copy) the logger passed in
3. Implement `Service::run`: write the line `{name} is running` to the logger

:::hint
The field becomes `lines: RefCell<Vec<String>>`; in `new` it's `RefCell::new(Vec::new())`; in `log` it's `self.lines.borrow_mut().push(msg.to_string());`; in `count` it's `self.lines.borrow().len()`.
:::

:::hint
`Service::new`: `Service { name: name.to_string(), logger: Rc::clone(logger) }`
:::

:::hint
`Service::run`: `self.logger.log(&format!("{} is running", self.name));`
:::

:::exercise
use std::cell::RefCell;
use std::rc::Rc;

struct Logger {
    lines: Vec<String>,
}

impl Logger {
    fn new() -> Self {
        Logger { lines: Vec::new() }
    }

    fn log(&self, msg: &str) {
        self.lines.push(msg.to_string());
    }

    fn count(&self) -> usize {
        self.lines.len()
    }
}

struct Service {
    name: String,
    logger: Rc<Logger>,
}

impl Service {
    fn new(name: &str, logger: &Rc<Logger>) -> Self {
        todo!()
    }

    /// Write the line "{name} is running" to the logger
    fn run(&self) {
        todo!()
    }
}

fn main() {
    let logger = Rc::new(Logger::new());
    let web = Service::new("web", &logger);
    let db = Service::new("db", &logger);
    web.run();
    db.run();
    web.run();
    println!("{} log lines, the logger has {} owners", logger.count(), Rc::strong_count(&logger));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn logger_records_through_shared_reference() {
        let logger = Logger::new();
        logger.log("a");
        logger.log("b");
        assert_eq!(logger.count(), 2);
        assert_eq!(*logger.lines.borrow(), vec!["a".to_string(), "b".to_string()]);
    }

    #[test]
    fn services_share_one_logger() {
        let logger = Rc::new(Logger::new());
        let web = Service::new("web", &logger);
        let db = Service::new("db", &logger);
        assert_eq!(Rc::strong_count(&logger), 3);
        web.run();
        db.run();
        web.run();
        assert_eq!(logger.count(), 3);
        assert_eq!(logger.lines.borrow()[1], "db is running");
        drop(web);
        assert_eq!(Rc::strong_count(&logger), 2);
    }
}
:::

:::solution
use std::cell::RefCell;
use std::rc::Rc;

struct Logger {
    lines: RefCell<Vec<String>>,
}

impl Logger {
    fn new() -> Self {
        Logger { lines: RefCell::new(Vec::new()) }
    }

    fn log(&self, msg: &str) {
        self.lines.borrow_mut().push(msg.to_string());
    }

    fn count(&self) -> usize {
        self.lines.borrow().len()
    }
}

struct Service {
    name: String,
    logger: Rc<Logger>,
}

impl Service {
    fn new(name: &str, logger: &Rc<Logger>) -> Self {
        Service { name: name.to_string(), logger: Rc::clone(logger) }
    }

    /// Write the line "{name} is running" to the logger
    fn run(&self) {
        self.logger.log(&format!("{} is running", self.name));
    }
}

fn main() {
    let logger = Rc::new(Logger::new());
    let web = Service::new("web", &logger);
    let db = Service::new("db", &logger);
    web.run();
    db.run();
    web.run();
    println!("{} log lines, the logger has {} owners", logger.count(), Rc::strong_count(&logger));
}
:::

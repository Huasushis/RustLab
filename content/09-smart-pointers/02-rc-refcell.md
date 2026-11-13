---
title: Rc 与 RefCell
---
所有权规则说「每个值只有一个所有者」。但有些数据天然需要**多个所有者**：图里被多条边指向的节点、被多个组件共用的配置或日志器。

## Rc：引用计数

`Rc<T>`（Reference Counted）允许多个所有者共享同一份堆数据，最后一个所有者消失时才释放。对应 C++ 的 `std::shared_ptr<T>`，也是 Python 里**每个对象**默认的工作方式。

```rust
use std::rc::Rc;

let a = Rc::new(String::from("共享的数据"));
let b = Rc::clone(&a);               // 只是计数加一，不复制字符串
println!("{}", Rc::strong_count(&a));   // 2
println!("{a} {b}");
```

习惯上写 `Rc::clone(&a)` 而不是 `a.clone()`，好让读者一眼看出这是便宜的「加计数」，而不是深拷贝。

注意：`Rc` 的计数不是原子操作，**只能在单线程里用**，试图把它送到别的线程会编译失败。多线程版本叫 `Arc`（第 12 章）。

## 问题：Rc 里的数据是只读的

既然有多个所有者，谁也拿不到 `&mut T`（否则就违反了「可变不共享」）。想修改共享数据怎么办？

## RefCell：把借用检查挪到运行时

`RefCell<T>` 提供**内部可变性**：即使只有 `&RefCell<T>`，也能改里面的值。

```rust
use std::cell::RefCell;

let cell = RefCell::new(vec![1, 2]);
cell.borrow_mut().push(3);              // 运行时获取「可变借用」
println!("{}", cell.borrow().len());    // 运行时获取「共享借用」
```

借用规则**仍然存在**，只是从编译期检查变成了运行时检查：如果在一个 `borrow_mut()` 还活着的时候再次 `borrow()` 或 `borrow_mut()`，程序会 **panic**。所以 `RefCell` 是一个逃生舱口，应该有节制地用。

## 组合：Rc<RefCell<T>>

「多个所有者 + 都能修改」就是把两者套起来。这大致等于 Python 里一个普通的可变对象，或者 C++ 里的 `shared_ptr<T>`——区别是 Rust 让你**显式地选择**了这种灵活性，并且在类型里写得明明白白。

```rust
let shared = Rc::new(RefCell::new(0));
let other = Rc::clone(&shared);
*other.borrow_mut() += 10;
println!("{}", shared.borrow());   // 10
```

> 循环引用（A 指向 B，B 又指向 A）会让计数永远不归零，造成内存泄漏。解法是把其中一个方向换成弱引用 `Weak<T>`，对应 C++ 的 `std::weak_ptr`。

## 任务

多个 `Service` 共用同一个 `Logger`。

1. `Logger::log` 接收的是 `&self`，却要往 `lines` 里追加内容，目前编译不过。把 `lines` 改成 `RefCell<Vec<String>>`，并相应修改 `new`、`log` 和 `count`
2. 实现 `Service::new`：保存名字，并**共享**（而不是复制）传入的日志器
3. 实现 `Service::run`：向日志器写入一行 `{name} 运行中`

:::hint
字段改成 `lines: RefCell<Vec<String>>`；`new` 里是 `RefCell::new(Vec::new())`；`log` 里是 `self.lines.borrow_mut().push(msg.to_string());`；`count` 里是 `self.lines.borrow().len()`。
:::

:::hint
`Service::new`：`Service { name: name.to_string(), logger: Rc::clone(logger) }`
:::

:::hint
`Service::run`：`self.logger.log(&format!("{} 运行中", self.name));`
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

    /// 向日志器写入一行 "{name} 运行中"
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
    println!("共 {} 条日志，日志器有 {} 个所有者", logger.count(), Rc::strong_count(&logger));
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
        assert_eq!(logger.lines.borrow()[1], "db 运行中");
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

    /// 向日志器写入一行 "{name} 运行中"
    fn run(&self) {
        self.logger.log(&format!("{} 运行中", self.name));
    }
}

fn main() {
    let logger = Rc::new(Logger::new());
    let web = Service::new("web", &logger);
    let db = Service::new("db", &logger);
    web.run();
    db.run();
    web.run();
    println!("共 {} 条日志，日志器有 {} 个所有者", logger.count(), Rc::strong_count(&logger));
}
:::

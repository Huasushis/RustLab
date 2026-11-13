---
title: 闭包
---
闭包是可以**捕获周围变量**的匿名函数，对应 C++ 的 lambda 和 Python 的 `lambda`（但 Rust 的闭包可以有多条语句）。

```rust
let add_one = |x| x + 1;                 // 参数写在 | | 之间，类型通常能推断出来
let add = |a: i32, b: i32| -> i32 {      // 也可以写全类型，函数体用花括号
    a + b
};

let factor = 3;
let scale = |x| x * factor;              // 捕获了外面的 factor
println!("{}", scale(5));                // 15
```

## 捕获方式

C++ 要你在 `[=]`、`[&]` 里手动指定按值还是按引用捕获，选错了就是悬垂引用。Rust 的编译器会根据闭包体**自动选择限制最少的方式**，并由借用检查器保证安全：

```rust
let name = String::from("Ferris");
let greet = || println!("你好 {name}");      // 只读 -> 按共享引用捕获

let mut count = 0;
let mut inc = || count += 1;                 // 要修改 -> 按可变引用捕获（闭包变量本身也要 mut）
inc();

let consume = move || drop(name);            // move 关键字：强制把用到的变量移进闭包
```

`move` 最常见的两个用途：把闭包**返回**出函数，或者交给**另一个线程**（第 12 章）。这两种情况下，闭包会活得比当前函数的局部变量更久，所以必须自己拥有数据。

## 三个闭包 trait

每个闭包都有一个独一无二的匿名类型，无法写出名字。函数要接收或返回闭包时，用 trait 来描述它：

| trait | 能调用几次 | 闭包对捕获变量做了什么 |
| --- | --- | --- |
| `Fn` | 任意多次 | 只读 |
| `FnMut` | 任意多次 | 会修改 |
| `FnOnce` | 只能一次 | 会消耗（移走）捕获的值 |

```rust
fn apply(f: impl Fn(i32) -> i32, x: i32) -> i32 {     // 接收闭包
    f(x)
}

fn make_multiplier(k: i32) -> impl Fn(i32) -> i32 {   // 返回闭包
    move |x| x * k                                    // k 是局部变量，必须 move 进闭包
}
```

普通函数也实现了这些 trait，所以 `apply(i32::abs, -3)` 也是可以的。

## 任务

1. `apply_twice(f, x)`：返回 `f(f(x))`
2. `make_adder(n)`：返回一个闭包，它把参数加上 `n`
3. `make_counter()`：返回一个闭包，第一次调用返回 1，第二次返回 2，依此类推。每个计数器互相独立

:::hint
`apply_twice` 的函数体：`f(f(x))`
:::

:::hint
`make_adder`：`move |x| x + n`
:::

:::hint
`make_counter`：在函数里声明 `let mut count = 0;`，然后返回 `move || { count += 1; count }`。闭包会修改自己捕获的状态，所以返回类型是 `impl FnMut() -> u32`。
:::

:::exercise
fn apply_twice(f: impl Fn(i32) -> i32, x: i32) -> i32 {
    todo!()
}

fn make_adder(n: i32) -> impl Fn(i32) -> i32 {
    todo!();
    |x| x // 占位：让初始代码能通过类型检查，实现时请替换掉这两行
}

fn make_counter() -> impl FnMut() -> u32 {
    todo!();
    || 0 // 占位：实现时请替换掉这两行
}

fn main() {
    println!("{}", apply_twice(|x| x * 3, 2));
    let add5 = make_adder(5);
    println!("{}", add5(10));
    let mut next = make_counter();
    println!("{} {} {}", next(), next(), next());
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn apply_twice_works() {
        assert_eq!(apply_twice(|x| x * 3, 2), 18);
        assert_eq!(apply_twice(|x| x - 1, 0), -2);
        assert_eq!(apply_twice(i32::abs, -4), 4);
        let offset = 10;
        assert_eq!(apply_twice(|x| x + offset, 1), 21);
    }

    #[test]
    fn make_adder_works() {
        let add5 = make_adder(5);
        let sub2 = make_adder(-2);
        assert_eq!(add5(10), 15);
        assert_eq!(add5(0), 5);
        assert_eq!(sub2(10), 8);
    }

    #[test]
    fn make_counter_works() {
        let mut a = make_counter();
        let mut b = make_counter();
        assert_eq!(a(), 1);
        assert_eq!(a(), 2);
        assert_eq!(b(), 1);
        assert_eq!(a(), 3);
        assert_eq!(b(), 2);
    }
}
:::

:::solution
fn apply_twice(f: impl Fn(i32) -> i32, x: i32) -> i32 {
    f(f(x))
}

fn make_adder(n: i32) -> impl Fn(i32) -> i32 {
    move |x| x + n
}

fn make_counter() -> impl FnMut() -> u32 {
    let mut count = 0;
    move || {
        count += 1;
        count
    }
}

fn main() {
    println!("{}", apply_twice(|x| x * 3, 2));
    let add5 = make_adder(5);
    println!("{}", add5(10));
    let mut next = make_counter();
    println!("{} {} {}", next(), next(), next());
}
:::

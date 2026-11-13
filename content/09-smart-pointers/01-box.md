---
title: Box 与递归类型
---
`Box<T>` 是最简单的智能指针：把一个 `T` 放到**堆**上，栈上只留一个指针。它独占所指向的数据，`Box` 离开作用域时，堆上的数据随之释放。对应 C++ 的 `std::unique_ptr<T>`。

```rust
let b: Box<i32> = Box::new(5);
println!("{}", *b + 1);      // 用 * 解引用；调用方法时会自动解引用
```

Rust 没有 `new` / `delete`，也没有裸的 `malloc`。堆分配总是通过某个拥有它的类型来进行（`Box`、`Vec`、`String`……），释放完全自动。

## 什么时候需要 Box

1. **trait 对象**：`Box<dyn Trait>`（第 6 章见过）
2. **数据很大**，想移动所有权时只拷贝一个指针
3. **递归类型**——本关的主题

## 递归类型

```rust
enum Expr {
    Num(f64),
    Add(Expr, Expr),      // ❌ recursive type `Expr` has infinite size
}
```

Rust 需要在编译期知道每个类型占多少字节。`Expr` 里直接包含两个 `Expr`，每个里面又包含两个……大小算不出来。C++ 也有同样的限制：结构体不能包含自身类型的成员，只能包含指向自身的指针。

解法也一样，加一层间接：

```rust
enum Expr {
    Num(f64),
    Add(Box<Expr>, Box<Expr>),    // ✅ Box 的大小是固定的（一个指针）
}

let e = Expr::Add(Box::new(Expr::Num(1.0)), Box::new(Expr::Num(2.0)));
```

递归的数据结构配上 `match`，写解释器和编译器一类的程序非常顺手：

```rust
fn eval(e: &Expr) -> f64 {
    match e {
        Expr::Num(n) => *n,
        Expr::Add(a, b) => eval(a) + eval(b),    // &Box<Expr> 会自动解引用成 &Expr
    }
}
```

## Drop：自定义析构

值离开作用域时，Rust 自动调用它的 `drop`，然后递归地释放所有字段。上面那棵表达式树，只要根节点离开作用域，整棵树就被释放，不需要手写析构函数。需要自定义清理逻辑时，可以实现 `Drop` trait，相当于 C++ 的析构函数。

## 任务

右边是一个算术表达式的语法树。

1. 修好 `Expr` 的定义，让它通过编译
2. 实现 `eval`：计算表达式的值。`Neg` 表示取负

:::hint
把 `Add`、`Mul`、`Neg` 里的 `Expr` 都换成 `Box<Expr>`：`Add(Box<Expr>, Box<Expr>)`、`Neg(Box<Expr>)`。
:::

:::hint
```rust
match e {
    Expr::Num(n) => *n,
    Expr::Add(a, b) => eval(a) + eval(b),
    Expr::Mul(a, b) => eval(a) * eval(b),
    Expr::Neg(a) => -eval(a),
}
```
:::

:::exercise
enum Expr {
    Num(f64),
    Add(Expr, Expr),
    Mul(Expr, Expr),
    Neg(Expr),
}

fn eval(e: &Expr) -> f64 {
    todo!()
}

fn main() {
    // (1 + 2) * -4
    let e = Expr::Mul(
        Box::new(Expr::Add(Box::new(Expr::Num(1.0)), Box::new(Expr::Num(2.0)))),
        Box::new(Expr::Neg(Box::new(Expr::Num(4.0)))),
    );
    println!("(1 + 2) * -4 = {}", eval(&e));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    fn num(n: f64) -> Box<Expr> {
        Box::new(Expr::Num(n))
    }

    #[test]
    fn leaf() {
        assert_eq!(eval(&Expr::Num(7.5)), 7.5);
    }

    #[test]
    fn simple_ops() {
        assert_eq!(eval(&Expr::Add(num(1.0), num(2.0))), 3.0);
        assert_eq!(eval(&Expr::Mul(num(3.0), num(4.0))), 12.0);
        assert_eq!(eval(&Expr::Neg(num(5.0))), -5.0);
    }

    #[test]
    fn nested() {
        // (1 + 2) * -4
        let e = Expr::Mul(Box::new(Expr::Add(num(1.0), num(2.0))), Box::new(Expr::Neg(num(4.0))));
        assert_eq!(eval(&e), -12.0);
        // -(-(2 * 3) + 1)
        let inner = Expr::Add(Box::new(Expr::Neg(Box::new(Expr::Mul(num(2.0), num(3.0))))), num(1.0));
        assert_eq!(eval(&Expr::Neg(Box::new(inner))), 5.0);
    }
}
:::

:::solution
enum Expr {
    Num(f64),
    Add(Box<Expr>, Box<Expr>),
    Mul(Box<Expr>, Box<Expr>),
    Neg(Box<Expr>),
}

fn eval(e: &Expr) -> f64 {
    match e {
        Expr::Num(n) => *n,
        Expr::Add(a, b) => eval(a) + eval(b),
        Expr::Mul(a, b) => eval(a) * eval(b),
        Expr::Neg(a) => -eval(a),
    }
}

fn main() {
    // (1 + 2) * -4
    let e = Expr::Mul(
        Box::new(Expr::Add(Box::new(Expr::Num(1.0)), Box::new(Expr::Num(2.0)))),
        Box::new(Expr::Neg(Box::new(Expr::Num(4.0)))),
    );
    println!("(1 + 2) * -4 = {}", eval(&e));
}
:::

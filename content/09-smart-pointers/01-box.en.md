---
title: Box and Recursive Types
---
`Box<T>` is the simplest smart pointer: it puts a `T` on the **heap** and leaves just a pointer on the stack. It owns the data exclusively, and when the `Box` goes out of scope the heap data is freed with it. The equivalent of C++'s `std::unique_ptr<T>`.

```rust
let b: Box<i32> = Box::new(5);
println!("{}", *b + 1);      // dereference with *; method calls dereference automatically
```

Rust has no `new` / `delete` and no raw `malloc`. Heap allocation always happens through some owning type (`Box`, `Vec`, `String`…), and freeing is fully automatic.

## When you need Box

1. **Trait objects**: `Box<dyn Trait>` (seen in chapter 6)
2. **Big data** where moving ownership should copy only a pointer
3. **Recursive types** — the topic of this level

## Recursive types

```rust
enum Expr {
    Num(f64),
    Add(Expr, Expr),      // ❌ recursive type `Expr` has infinite size
}
```

Rust needs to know at compile time how many bytes every type takes. `Expr` directly contains two `Expr`s, each of which contains two more… the size can't be computed. C++ has the same limitation: a struct can't contain a member of its own type, only a pointer to one.

The fix is the same too — add a level of indirection:

```rust
enum Expr {
    Num(f64),
    Add(Box<Expr>, Box<Expr>),    // ✅ a Box has a fixed size (one pointer)
}

let e = Expr::Add(Box::new(Expr::Num(1.0)), Box::new(Expr::Num(2.0)));
```

Recursive data structures plus `match` make interpreters and compilers very pleasant to write:

```rust
fn eval(e: &Expr) -> f64 {
    match e {
        Expr::Num(n) => *n,
        Expr::Add(a, b) => eval(a) + eval(b),    // &Box<Expr> auto-derefs to &Expr
    }
}
```

## Drop: custom destructors

When a value goes out of scope, Rust automatically calls its `drop` and then recursively frees all of its fields. For the expression tree above, once the root goes out of scope the whole tree is freed — no destructor to write. When you need custom cleanup, implement the `Drop` trait, the equivalent of a C++ destructor.

## Task

The code on the right is the syntax tree of an arithmetic expression.

1. Fix the definition of `Expr` so it compiles
2. Implement `eval`: compute the value of the expression. `Neg` means negation

:::hint
Replace every `Expr` inside `Add`, `Mul` and `Neg` with `Box<Expr>`: `Add(Box<Expr>, Box<Expr>)`, `Neg(Box<Expr>)`.
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

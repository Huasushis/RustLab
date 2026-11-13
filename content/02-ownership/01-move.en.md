---
title: Ownership and Moves
forbid: .clone() | &
---
This is the most distinctive chapter of Rust. Let's start with the big picture:

| Language | Who manages memory | The cost |
| --- | --- | --- |
| C / C++ | The programmer (`delete`, RAII, smart pointers) | Dangling pointers, double frees, leaks |
| Python / Java | The garbage collector | Runtime overhead, pauses |
| **Rust** | **The compiler**, following the ownership rules | You have to convince the compiler your code is safe |

## Three rules

1. Every value has exactly one **owner**
2. There can only be one owner at a time
3. When the owner goes out of scope, the value is freed (dropped)

Rule 3 is C++'s RAII. What's really new is the **move semantics** that follow from rule 2:

```rust
let s1 = String::from("hello");   // s1 owns "hello" on the heap
let s2 = s1;                      // ownership "moves" to s2
println!("{s1}");                 // ❌ borrow of moved value: `s1`
```

A `String` is "pointer + length + capacity". Assignment copies just those three fields (cheap), and then **the old variable is immediately invalid**. So the heap data always has exactly one owner and can never be freed twice.

Compare:

- **C++**: `auto s2 = s1;` makes a deep copy; after `std::move(s1)`, `s1` can still be used (in a "valid but unspecified" state) and the compiler won't stop you. In Rust, moving is the default, and using a moved-from variable is a **compile error**.
- **Python**: `s2 = s1` just adds another reference to the same object; reference counting and the GC clean it up.

## Passing and returning also move

```rust
fn consume(s: String) { /* s is freed when the function ends */ }

let s = String::from("hi");
consume(s);          // ownership moved into the function
// s can't be used here any more

fn give() -> String { String::from("new") }   // returning moves ownership to the caller
```

## Task

The program on the right doesn't compile: `s` is moved into `print_len`, and then `main` uses it again.

Solve it **with ownership transfer only**: have `print_len` **give ownership back** when it's done. To keep the focus on moves, this level forbids `.clone()` and `&` (borrowing comes two levels later, and you'll see how much more convenient it is).

Expected output:

```text
length: 5
content: hello
```

:::hint
Change the signature to `fn print_len(s: String) -> String`, and make the last line of the body `s` (no semicolon) to hand ownership back to the caller.
:::

:::hint
`main` has to catch the return value: `let s = print_len(s);`. That's shadowing from the previous chapter: the new `s` owns the string again.
:::

:::exercise
fn print_len(s: String) {
    println!("length: {}", s.len());
}

fn main() {
    let s = String::from("hello");
    print_len(s);
    println!("content: {s}");
}
:::

:::expect
length: 5
content: hello
:::

:::solution
fn print_len(s: String) -> String {
    println!("length: {}", s.len());
    s
}

fn main() {
    let s = String::from("hello");
    let s = print_len(s);
    println!("content: {s}");
}
:::

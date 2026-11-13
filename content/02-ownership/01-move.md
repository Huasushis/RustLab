---
title: 所有权与移动
forbid: .clone() | &
---
这是 Rust 最独特的一章。先建立直觉：

| 语言 | 内存谁来管 | 代价 |
| --- | --- | --- |
| C / C++ | 程序员（`delete`、RAII、智能指针） | 悬垂指针、重复释放、内存泄漏 |
| Python / Java | 垃圾回收器 | 运行时开销、停顿 |
| **Rust** | **编译器**，依据所有权规则 | 你得让编译器相信代码是安全的 |

## 三条规则

1. 每个值都有且只有一个**所有者**（owner）
2. 同一时刻只能有一个所有者
3. 所有者离开作用域时，值被自动释放（drop）

第 3 条就是 C++ 的 RAII。真正新鲜的是第 2 条带来的**移动语义**：

```rust
let s1 = String::from("hello");   // s1 拥有堆上的 "hello"
let s2 = s1;                      // 所有权「移动」给 s2
println!("{s1}");                 // ❌ borrow of moved value: `s1`
```

`String` 内部是「指针 + 长度 + 容量」。赋值只复制这三个字段（很便宜），然后**旧变量立刻失效**。于是堆上的数据始终只有一个主人，不会被释放两次。

对比一下：

- **C++**：`auto s2 = s1;` 是深拷贝；`std::move(s1)` 之后 `s1` 还能用（处于「有效但未指定」的状态），用错了编译器不管。Rust 的移动是默认行为，而且移动后再用会**编译失败**。
- **Python**：`s2 = s1` 只是多了一个指向同一对象的引用，靠引用计数和 GC 回收。

## 传参和返回也是移动

```rust
fn consume(s: String) { /* s 在函数结束时被释放 */ }

let s = String::from("hi");
consume(s);          // 所有权移进了函数
// 这里不能再用 s

fn give() -> String { String::from("new") }   // 返回值把所有权移给调用者
```

## 任务

右边的程序编译不过：`s` 被移进 `print_len` 之后，`main` 又用了它。

本关**只用所有权转移**来解决：让 `print_len` 用完之后把所有权**还回来**。为了让你专注在「移动」上，本关禁止使用 `.clone()` 和 `&`（借用是下下关的内容，到时候你会发现它方便得多）。

期望输出：

```text
长度: 5
内容: hello
```

:::hint
把函数签名改成 `fn print_len(s: String) -> String`，并在函数体最后一行写 `s`（不带分号），把所有权交还给调用者。
:::

:::hint
`main` 里要接住返回值：`let s = print_len(s);`。这里用到了上一章的遮蔽：新的 `s` 重新拥有了那个字符串。
:::

:::exercise
fn print_len(s: String) {
    println!("长度: {}", s.len());
}

fn main() {
    let s = String::from("hello");
    print_len(s);
    println!("内容: {s}");
}
:::

:::expect
长度: 5
内容: hello
:::

:::solution
fn print_len(s: String) -> String {
    println!("长度: {}", s.len());
    s
}

fn main() {
    let s = String::from("hello");
    let s = print_len(s);
    println!("内容: {s}");
}
:::

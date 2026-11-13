---
title: Hello, Ferris
---
Welcome to RustLab! These levels assume you already write C++ or Python, so they don't explain what a variable is — they focus on **where Rust is different**.

Every level works the same way: read the lesson on the left → edit the code on the right → click **Run** to try it → click **Check** to have it graded.

## Your first program

```rust
fn main() {
    println!("Hello, world!");
}
```

- `fn main()` is the entry point, just like `int main()` in C++.
- The `!` in `println!` means it is a **macro**, not a function. Macros are expanded at compile time, so a broken format string is a compile error instead of garbage at run time like with `printf`.

## Formatted output

```rust
let lang = "Rust";
let version = 1.0;
println!("{} {}", lang, version);    // positional, like Python's "{} {}".format(...)
println!("{lang} {version}");        // capture variables directly, like a Python f-string
println!("{:?}", (1, "two"));        // {:?} is debug output; almost every type supports it
println!("{:>8.2}", 3.14159);        // width 8, right-aligned, two decimal places
```

| What you know | Rust |
| --- | --- |
| `print(f"{x}")` | `println!("{x}")` |
| `std::cout << x << '\n'` | `println!("{x}")` |
| `repr(x)` | `println!("{x:?}")` |

## Task

Change the two `println!` lines in `main` so that the program **uses the variables `name` and `year`** to print:

```text
Hello, Ferris!
Rust 1.0 was released in 2015
```

> Ferris is Rust's mascot, a little orange crab 🦀

:::hint
Put the variable name straight into the braces: `println!("Hello, {name}!");`
:::

:::hint
Same for the second line: `println!("Rust 1.0 was released in {year}");`. The output must match exactly.
:::

:::exercise
fn main() {
    let name = "Ferris";
    let year = 2015;

    // TODO: change the two lines below to use name and year
    println!("Hello, world!");
    println!("Rust 1.0 was released in ????");
}
:::

:::expect
Hello, Ferris!
Rust 1.0 was released in 2015
:::

:::solution
fn main() {
    let name = "Ferris";
    let year = 2015;

    println!("Hello, {name}!");
    println!("Rust 1.0 was released in {year}");
}
:::

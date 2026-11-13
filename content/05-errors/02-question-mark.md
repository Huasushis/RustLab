---
title: ? 运算符
forbid: .unwrap() | .expect(
---
如果每个可能失败的调用都写一个 `match`，代码很快会被错误处理淹没：

```rust
fn sum_strs(a: &str, b: &str) -> Result<i32, ParseIntError> {
    let x = match a.parse::<i32>() {
        Ok(v) => v,
        Err(e) => return Err(e),
    };
    let y = match b.parse::<i32>() {
        Ok(v) => v,
        Err(e) => return Err(e),
    };
    Ok(x + y)
}
```

「成功就取出值，失败就把错误原样返回给调用者」这个套路太常见了，Rust 给了它一个专门的运算符 `?`：

```rust
fn sum_strs(a: &str, b: &str) -> Result<i32, ParseIntError> {
    let x = a.parse::<i32>()?;
    let y = b.parse::<i32>()?;
    Ok(x + y)
}
```

这样你同时得到了异常的简洁（正常流程一目了然）和返回值的明确（每个可能提前返回的地方都有一个 `?` 标着）。

## 使用条件

`?` 只能用在返回 `Result`（或 `Option`）的函数里，并且错误类型要对得上。`main` 也可以返回 `Result`：

```rust
fn main() -> Result<(), String> {
    let n = parse_something("42")?;
    println!("{n}");
    Ok(())
}
```

## 错误类型不一致时

`parse::<i32>()` 的错误类型是 `ParseIntError`。如果你的函数返回 `Result<_, String>`，需要先转换一下：

```rust
let n = s.parse::<i32>().map_err(|e| e.to_string())?;   // 把错误映射成 String
let n = s.parse::<i32>().map_err(|_| "不是整数".to_string())?;   // 或者换成自己的说明
```

`Option` 可以用 `ok_or` 变成 `Result`：

```rust
let (key, value) = line.split_once('=').ok_or("缺少等号".to_string())?;
```

（下一关会介绍用 `From` trait 让 `?` **自动**完成这种转换。）

## 任务

本关禁止使用 `.unwrap()` 和 `.expect(`。

1. `sum_strs(a, b)`：把两个字符串解析成 `i32` 并相加，用 `?` 传播错误
2. `parse_point(s)`：把 `"3,4"` 这样的字符串解析成 `(3, 4)`
   - 没有逗号 → `Err("缺少逗号".to_string())`
   - 逗号两边（去掉空白后）任何一个不是整数 → `Err("坐标不是整数".to_string())`

:::hint
`sum_strs` 的函数体只有三行：两次 `let x = a.parse::<i32>()?;`，然后 `Ok(x + y)`。
:::

:::hint
`parse_point`：
```rust
let (x, y) = s.split_once(',').ok_or("缺少逗号".to_string())?;
let x = x.trim().parse::<i32>().map_err(|_| "坐标不是整数".to_string())?;
```
`y` 同理，最后 `Ok((x, y))`。
:::

:::exercise
use std::num::ParseIntError;

/// 把两个字符串解析成整数并相加
fn sum_strs(a: &str, b: &str) -> Result<i32, ParseIntError> {
    todo!()
}

/// 解析 "x,y" 形式的坐标
fn parse_point(s: &str) -> Result<(i32, i32), String> {
    todo!()
}

fn main() {
    println!("{:?}", sum_strs("40", "2"));
    println!("{:?}", sum_strs("40", "two"));
    println!("{:?}", parse_point("3, 4"));
    println!("{:?}", parse_point("34"));
    println!("{:?}", parse_point("3,four"));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sum_strs_works() {
        assert_eq!(sum_strs("40", "2"), Ok(42));
        assert_eq!(sum_strs("-5", "5"), Ok(0));
        assert!(sum_strs("40", "two").is_err());
        assert!(sum_strs("", "1").is_err());
    }

    #[test]
    fn parse_point_ok() {
        assert_eq!(parse_point("3,4"), Ok((3, 4)));
        assert_eq!(parse_point(" -1 , 20 "), Ok((-1, 20)));
    }

    #[test]
    fn parse_point_err() {
        assert_eq!(parse_point("34"), Err("缺少逗号".to_string()));
        assert_eq!(parse_point("3,four"), Err("坐标不是整数".to_string()));
        assert_eq!(parse_point("x,4"), Err("坐标不是整数".to_string()));
        assert_eq!(parse_point(","), Err("坐标不是整数".to_string()));
    }
}
:::

:::solution
use std::num::ParseIntError;

/// 把两个字符串解析成整数并相加
fn sum_strs(a: &str, b: &str) -> Result<i32, ParseIntError> {
    let x = a.parse::<i32>()?;
    let y = b.parse::<i32>()?;
    Ok(x + y)
}

/// 解析 "x,y" 形式的坐标
fn parse_point(s: &str) -> Result<(i32, i32), String> {
    let (x, y) = s.split_once(',').ok_or("缺少逗号".to_string())?;
    let x = x.trim().parse::<i32>().map_err(|_| "坐标不是整数".to_string())?;
    let y = y.trim().parse::<i32>().map_err(|_| "坐标不是整数".to_string())?;
    Ok((x, y))
}

fn main() {
    println!("{:?}", sum_strs("40", "2"));
    println!("{:?}", sum_strs("40", "two"));
    println!("{:?}", parse_point("3, 4"));
    println!("{:?}", parse_point("34"));
    println!("{:?}", parse_point("3,four"));
}
:::

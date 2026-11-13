---
title: Result：可恢复的错误
---
Rust **没有异常**。错误分成两类：

| | 含义 | 机制 |
| --- | --- | --- |
| 不可恢复 | 程序有 bug，状态已经不可信 | `panic!`：打印信息并终止当前线程 |
| 可恢复 | 意料之中的失败：文件不存在、输入不合法…… | 返回 `Result<T, E>` |

`Result` 和 `Option` 一样，只是个普通枚举：

```rust
enum Result<T, E> {
    Ok(T),     // 成功，带着结果
    Err(E),    // 失败，带着错误信息
}
```

## 为什么不用异常

在 C++ / Python 里，光看函数签名看不出它会不会抛异常、抛什么；调用方忘了 `try` 也没人提醒。Rust 把「可能失败」写进返回类型：

```rust
fn parse_port(s: &str) -> Result<u16, String> { ... }
```

调用者**必须**对 `Result` 做点什么才能拿到里面的值。完全忽略一个 `Result`，编译器会给出警告。

## 处理 Result

```rust
match "8080".parse::<u16>() {
    Ok(port) => println!("端口 {port}"),
    Err(e) => println!("解析失败: {e}"),
}

let port = "8080".parse::<u16>().unwrap_or(80);       // 失败时用默认值
let port = "8080".parse::<u16>().expect("端口应该是数字");  // 失败时 panic，并附带这段说明
```

`unwrap` / `expect` 表示「我断言这里不会失败，失败了就是 bug」。在示例、测试和原型里很常见；在要长期维护的代码里，应该把错误交还给调用者。

## 产生错误

```rust
fn checked_sqrt(x: f64) -> Result<f64, String> {
    if x < 0.0 {
        return Err(format!("不能对负数 {x} 开平方"));
    }
    Ok(x.sqrt())
}
```

这里先用 `String` 当错误类型，简单直接。更正规的做法是自定义错误类型，本章第 3 关再讲。

## 任务

1. `divide(a, b)`：`b` 为 `0.0` 时返回 `Err("除数不能为零".to_string())`，否则返回商
2. `parse_age(s)`：把字符串解析成年龄
   - 去掉首尾空白后，无法解析成 `u8` → `Err(format!("不是有效的数字: {s}"))`
   - 解析成功但大于 150 → `Err("年龄不合理".to_string())`
   - 否则 `Ok(age)`

:::hint
`divide`：`if b == 0.0 { Err("除数不能为零".to_string()) } else { Ok(a / b) }`
:::

:::hint
`parse_age`：
```rust
match s.trim().parse::<u8>() {
    Ok(age) if age > 150 => Err("年龄不合理".to_string()),
    Ok(age) => Ok(age),
    Err(_) => Err(format!("不是有效的数字: {s}")),
}
```
:::

:::exercise
fn divide(a: f64, b: f64) -> Result<f64, String> {
    todo!()
}

fn parse_age(s: &str) -> Result<u8, String> {
    todo!()
}

fn main() {
    println!("{:?}", divide(1.0, 4.0));
    println!("{:?}", divide(1.0, 0.0));
    for input in ["36", " 7 ", "abc", "200", "-1"] {
        match parse_age(input) {
            Ok(age) => println!("{input:?} -> {age} 岁"),
            Err(e) => println!("{input:?} -> 错误: {e}"),
        }
    }
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn divide_works() {
        assert_eq!(divide(1.0, 4.0), Ok(0.25));
        assert_eq!(divide(-6.0, 3.0), Ok(-2.0));
        assert_eq!(divide(1.0, 0.0), Err("除数不能为零".to_string()));
    }

    #[test]
    fn parse_age_ok() {
        assert_eq!(parse_age("36"), Ok(36));
        assert_eq!(parse_age(" 7 "), Ok(7));
        assert_eq!(parse_age("150"), Ok(150));
    }

    #[test]
    fn parse_age_err() {
        assert_eq!(parse_age("abc"), Err("不是有效的数字: abc".to_string()));
        assert_eq!(parse_age("200"), Err("年龄不合理".to_string()));
        assert!(parse_age("-1").is_err());
        assert!(parse_age("").is_err());
        assert!(parse_age("999").is_err());
    }
}
:::

:::solution
fn divide(a: f64, b: f64) -> Result<f64, String> {
    if b == 0.0 {
        Err("除数不能为零".to_string())
    } else {
        Ok(a / b)
    }
}

fn parse_age(s: &str) -> Result<u8, String> {
    match s.trim().parse::<u8>() {
        Ok(age) if age > 150 => Err("年龄不合理".to_string()),
        Ok(age) => Ok(age),
        Err(_) => Err(format!("不是有效的数字: {s}")),
    }
}

fn main() {
    println!("{:?}", divide(1.0, 4.0));
    println!("{:?}", divide(1.0, 0.0));
    for input in ["36", " 7 ", "abc", "200", "-1"] {
        match parse_age(input) {
            Ok(age) => println!("{input:?} -> {age} 岁"),
            Err(e) => println!("{input:?} -> 错误: {e}"),
        }
    }
}
:::

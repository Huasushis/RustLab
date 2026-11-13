---
title: thiserror 与 anyhow：省掉错误处理的样板代码
crates: thiserror, anyhow
---
第 5 章里，我们为自定义错误类型手写了 `Display`、`Error` 和 `From`，足足三个 `impl`。实际项目里几乎没人手写这些，而是用两个库：

| 库 | 用在哪里 | 做什么 |
| --- | --- | --- |
| **thiserror** | **库**（给别人调用的代码） | 用 derive 生成精确的错误枚举，调用方可以 `match` 每一种错误 |
| **anyhow** | **应用程序**（main、命令行工具、服务） | 一个能装下任何错误的 `anyhow::Error`，再给错误层层加上上下文 |

## thiserror：derive 出来的错误类型

```rust
use std::num::ParseIntError;

#[derive(Debug, thiserror::Error)]
enum ConfigError {
    #[error("缺少配置项 {0}")]                     // 生成 Display，{0} 是第一个字段
    Missing(String),
    #[error("端口 {port} 超出范围")]                // 具名字段直接写名字
    PortOutOfRange { port: u32 },
    #[error("不是数字")]
    BadNumber(#[from] ParseIntError),              // #[from] 生成 From<ParseIntError>，? 会自动转换
}
```

第 5 章的三个 `impl` 变成了几行属性。生成的代码和手写的完全一样，没有任何运行时开销。

## anyhow：应用里的「万能错误」

写应用时，往往不需要区分错误的具体种类，只想要：出错了就层层往上抛，最后打印一条**说清来龙去脉**的信息。

```rust
use anyhow::{Context, Result, bail};    // anyhow::Result<T> 就是 Result<T, anyhow::Error>

fn load_port(text: &str) -> Result<u16> {
    let line = text.lines().find(|l| l.starts_with("port=")).context("配置里没有 port")?;   // Option 也能加 context
    let port: u16 = line[5..].trim().parse().with_context(|| format!("port 的值 {line:?} 不合法"))?;
    if port < 1024 {
        bail!("端口 {port} 需要管理员权限");     // 直接返回一个错误，相当于 return Err(anyhow!(...))
    }
    Ok(port)
}
```

- 任何实现了 `std::error::Error` 的错误都能用 `?` 转换成 `anyhow::Error`
- `.context("...")` 在错误外面再包一层说明，就像 Python 的 `raise NewError(...) from err` 形成的异常链
- 打印时用 `{}` 只显示最外层；用 `{:#}` 显示整条链：`port 的值 "port=abc" 不合法: invalid digit found in string`
- `main` 可以直接返回 `anyhow::Result<()>`，出错时会把整条链打印出来

## 任务

右边是一个读取 `key=value` 配置的小程序。

1. 用 thiserror 完成 `ConfigError`：三个变体分别显示为 `缺少配置项 {名字}`、`端口 {port} 超出范围`、`不是数字`，并让 `BadNumber` 能从 `ParseIntError` 自动转换
2. `parse_port(config)`：从 `HashMap` 里取出 `"port"`（没有就报 `Missing`），解析成 `u32`（失败时用 `?` 自动变成 `BadNumber`），必须在 1 到 65535 之间（否则报 `PortOutOfRange`），返回 `u16`
3. `load(text)`：把形如 `"host=a\nport=80"` 的文本解析成 `HashMap`（忽略不含 `=` 的行），调用 `parse_port`，并用 anyhow 给错误加上上下文 `读取端口失败`

:::hint
```rust
#[derive(Debug, thiserror::Error)]
enum ConfigError {
    #[error("缺少配置项 {0}")]
    Missing(String),
    #[error("端口 {port} 超出范围")]
    PortOutOfRange { port: u32 },
    #[error("不是数字")]
    BadNumber(#[from] ParseIntError),
}
```
:::

:::hint
`parse_port`：
```rust
let raw = config.get("port").ok_or_else(|| ConfigError::Missing("port".to_string()))?;
let port: u32 = raw.trim().parse()?;
if !(1..=65535).contains(&port) {
    return Err(ConfigError::PortOutOfRange { port });
}
Ok(port as u16)
```
:::

:::hint
`load`：
```rust
let map: HashMap<String, String> = text
    .lines()
    .filter_map(|l| l.split_once('='))
    .map(|(k, v)| (k.trim().to_string(), v.trim().to_string()))
    .collect();
let port = parse_port(&map).context("读取端口失败")?;
Ok(port)
```
别忘了 `use anyhow::Context;`，`.context` 方法来自这个 trait。
:::

:::exercise
use std::collections::HashMap;
use std::num::ParseIntError;

// TODO: 用 thiserror 实现
#[derive(Debug)]
enum ConfigError {
    Missing(String),
    PortOutOfRange { port: u32 },
    BadNumber(ParseIntError),
}

fn parse_port(config: &HashMap<String, String>) -> Result<u16, ConfigError> {
    todo!()
}

fn load(text: &str) -> anyhow::Result<u16> {
    todo!()
}

fn main() {
    for text in ["host=localhost\nport=8080", "host=localhost", "port=http", "port=70000"] {
        match load(text) {
            Ok(port) => println!("端口：{port}"),
            Err(e) => println!("错误：{e:#}"),
        }
    }
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    fn map(pairs: &[(&str, &str)]) -> HashMap<String, String> {
        pairs.iter().map(|(k, v)| (k.to_string(), v.to_string())).collect()
    }

    #[test]
    fn parse_port_ok() {
        assert_eq!(parse_port(&map(&[("port", "8080")])).unwrap(), 8080);
        assert_eq!(parse_port(&map(&[("port", " 1 ")])).unwrap(), 1);
    }

    #[test]
    fn parse_port_errors() {
        assert!(matches!(parse_port(&map(&[])), Err(ConfigError::Missing(k)) if k == "port"));
        assert!(matches!(parse_port(&map(&[("port", "abc")])), Err(ConfigError::BadNumber(_))));
        assert!(matches!(
            parse_port(&map(&[("port", "70000")])),
            Err(ConfigError::PortOutOfRange { port: 70000 })
        ));
        assert!(matches!(parse_port(&map(&[("port", "0")])), Err(ConfigError::PortOutOfRange { port: 0 })));
    }

    #[test]
    fn messages() {
        assert_eq!(ConfigError::Missing("port".to_string()).to_string(), "缺少配置项 port");
        assert_eq!(ConfigError::PortOutOfRange { port: 9 }.to_string(), "端口 9 超出范围");
        let e: ConfigError = "x".parse::<u32>().unwrap_err().into();
        assert_eq!(e.to_string(), "不是数字");
    }

    #[test]
    fn load_with_context() {
        assert_eq!(load("host=a\nport=80\n").unwrap(), 80);
        assert_eq!(load("garbage line\nport = 443").unwrap(), 443);
        let err = load("host=a").unwrap_err();
        assert_eq!(err.to_string(), "读取端口失败");
        assert_eq!(format!("{err:#}"), "读取端口失败: 缺少配置项 port");
        assert!(err.downcast_ref::<ConfigError>().is_some());
        assert_eq!(format!("{:#}", load("port=70000").unwrap_err()), "读取端口失败: 端口 70000 超出范围");
    }
}
:::

:::solution
use anyhow::Context;
use std::collections::HashMap;
use std::num::ParseIntError;

#[derive(Debug, thiserror::Error)]
enum ConfigError {
    #[error("缺少配置项 {0}")]
    Missing(String),
    #[error("端口 {port} 超出范围")]
    PortOutOfRange { port: u32 },
    #[error("不是数字")]
    BadNumber(#[from] ParseIntError),
}

fn parse_port(config: &HashMap<String, String>) -> Result<u16, ConfigError> {
    let raw = config.get("port").ok_or_else(|| ConfigError::Missing("port".to_string()))?;
    let port: u32 = raw.trim().parse()?;
    if !(1..=65535).contains(&port) {
        return Err(ConfigError::PortOutOfRange { port });
    }
    Ok(port as u16)
}

fn load(text: &str) -> anyhow::Result<u16> {
    let map: HashMap<String, String> = text
        .lines()
        .filter_map(|l| l.split_once('='))
        .map(|(k, v)| (k.trim().to_string(), v.trim().to_string()))
        .collect();
    let port = parse_port(&map).context("读取端口失败")?;
    Ok(port)
}

fn main() {
    for text in ["host=localhost\nport=8080", "host=localhost", "port=http", "port=70000"] {
        match load(text) {
            Ok(port) => println!("端口：{port}"),
            Err(e) => println!("错误：{e:#}"),
        }
    }
}
:::

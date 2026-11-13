---
title: serde：序列化与 JSON
crates: serde, serde_json
---
**serde**（SERialize / DEserialize）是 Rust 生态里最重要的库之一：它定义了「如何把一个类型变成数据 / 从数据变回类型」，而具体的格式由别的库负责：`serde_json`（JSON）、`toml`、`serde_yaml`、`csv`、`bincode`……写一次 derive，所有格式通用。

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct User {
    name: String,
    age: u32,
    emails: Vec<String>,
}

let json = r#"{ "name": "Ada", "age": 36, "emails": ["ada@example.com"] }"#;
let user: User = serde_json::from_str(json)?;        // JSON -> 结构体
let back: String = serde_json::to_string(&user)?;     // 结构体 -> JSON（紧凑）
let pretty = serde_json::to_string_pretty(&user)?;    // 带缩进
```

`r#"..."#` 是**原始字符串**：里面的 `"` 和 `\` 不需要转义，写 JSON 和正则时很方便。

## 和 Python / C++ 对比

- Python 的 `json.loads` 返回一个 `dict`，字段写错了要到运行时访问时才发现。serde 在解析时就**按类型校验**：缺字段、类型不对都会返回 `Err`，解析成功之后就是普通的强类型结构体
- C++ 通常用 nlohmann/json 之类的库手写转换函数。serde 的 `derive` 在编译期生成这些代码，没有反射，也没有运行时开销

## 用属性微调

```rust
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]          // Rust 里写 snake_case，JSON 里是 camelCase
struct Server {
    host_name: String,                      // JSON 中是 "hostName"
    #[serde(default)]                       // JSON 里没有这个字段时用 Default（false）
    use_tls: bool,
    #[serde(rename = "max-conn")]           // 单独改一个字段的名字
    max_connections: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    comment: Option<String>,                // Option 字段缺失时自动是 None
}
```

## 不知道结构的 JSON：serde_json::Value

```rust
let v: serde_json::Value = serde_json::from_str(json)?;
let port = v["server"]["port"].as_u64();    // 不存在的键不会 panic，而是得到 Value::Null，as_u64 返回 None
let v2 = serde_json::json!({ "ok": true, "items": [1, 2, 3] });   // 用宏直接构造 JSON
```

## 任务

1. 给 `Config` 加上 derive，让它能序列化和反序列化。JSON 中的键是 camelCase（`maxUsers`），`debug` 字段缺失时默认为 `false`
2. `parse_config(json)`：把 JSON 字符串解析成 `Config`
3. `to_json(config)`：把 `Config` 序列化成**紧凑**的 JSON 字符串
4. `nested_port(json)`：从任意 JSON 里取出 `server.port`，取不到（或不是数字、或 JSON 本身不合法）时返回 `None`

:::hint
```rust
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Config {
    name: String,
    max_users: u32,
    #[serde(default)]
    debug: bool,
    tags: Vec<String>,
}
```
:::

:::hint
`parse_config`：`serde_json::from_str(json)`，返回类型已经写明是 `Result<Config, serde_json::Error>`，类型推断会帮你选对目标类型。`to_json`：`serde_json::to_string(config).unwrap()`（序列化一个普通结构体不会失败）。
:::

:::hint
`nested_port`：
```rust
let v: serde_json::Value = serde_json::from_str(json).ok()?;
v["server"]["port"].as_u64()
```
:::

:::exercise
use serde::{Deserialize, Serialize};

// TODO: 加上 derive 和 serde 属性
#[derive(Debug, PartialEq)]
struct Config {
    name: String,
    max_users: u32,
    debug: bool,
    tags: Vec<String>,
}

fn parse_config(json: &str) -> Result<Config, serde_json::Error> {
    todo!()
}

fn to_json(config: &Config) -> String {
    todo!()
}

/// 读取 server.port；取不到就返回 None
fn nested_port(json: &str) -> Option<u64> {
    todo!()
}

fn main() {
    let text = r#"{ "name": "rustlab", "maxUsers": 100, "tags": ["web", "edu"] }"#;
    match parse_config(text) {
        Ok(cfg) => {
            println!("{cfg:?}");
            println!("{}", to_json(&cfg));
        }
        Err(e) => println!("解析失败：{e}"),
    }
    println!("{:?}", nested_port(r#"{ "server": { "host": "0.0.0.0", "port": 8080 } }"#));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_camel_case_and_default() {
        let cfg = parse_config(r#"{ "name": "a", "maxUsers": 5, "tags": ["x"] }"#).unwrap();
        assert_eq!(
            cfg,
            Config { name: "a".to_string(), max_users: 5, debug: false, tags: vec!["x".to_string()] }
        );
        let cfg = parse_config(r#"{ "name": "b", "maxUsers": 1, "debug": true, "tags": [] }"#).unwrap();
        assert!(cfg.debug);
    }

    #[test]
    fn rejects_bad_input() {
        assert!(parse_config(r#"{ "name": "a", "tags": [] }"#).is_err(), "缺少 maxUsers 应该报错");
        assert!(parse_config(r#"{ "name": "a", "maxUsers": "many", "tags": [] }"#).is_err());
        assert!(parse_config("not json").is_err());
    }

    #[test]
    fn serializes_compactly() {
        let cfg = Config { name: "n".to_string(), max_users: 2, debug: true, tags: vec!["t".to_string()] };
        assert_eq!(to_json(&cfg), r#"{"name":"n","maxUsers":2,"debug":true,"tags":["t"]}"#);
        assert_eq!(parse_config(&to_json(&cfg)).unwrap(), cfg);
    }

    #[test]
    fn reads_nested_port() {
        assert_eq!(nested_port(r#"{ "server": { "port": 8080 } }"#), Some(8080));
        assert_eq!(nested_port(r#"{ "server": { "port": "8080" } }"#), None);
        assert_eq!(nested_port(r#"{ "client": {} }"#), None);
        assert_eq!(nested_port("{ broken"), None);
    }
}
:::

:::solution
use serde::{Deserialize, Serialize};

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Config {
    name: String,
    max_users: u32,
    #[serde(default)]
    debug: bool,
    tags: Vec<String>,
}

fn parse_config(json: &str) -> Result<Config, serde_json::Error> {
    serde_json::from_str(json)
}

fn to_json(config: &Config) -> String {
    serde_json::to_string(config).unwrap()
}

/// 读取 server.port；取不到就返回 None
fn nested_port(json: &str) -> Option<u64> {
    let v: serde_json::Value = serde_json::from_str(json).ok()?;
    v["server"]["port"].as_u64()
}

fn main() {
    let text = r#"{ "name": "rustlab", "maxUsers": 100, "tags": ["web", "edu"] }"#;
    match parse_config(text) {
        Ok(cfg) => {
            println!("{cfg:?}");
            println!("{}", to_json(&cfg));
        }
        Err(e) => println!("解析失败：{e}"),
    }
    println!("{:?}", nested_port(r#"{ "server": { "host": "0.0.0.0", "port": 8080 } }"#));
}
:::

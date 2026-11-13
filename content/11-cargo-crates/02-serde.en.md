---
title: serde — Serialization and JSON
---
**serde** (SERialize / DEserialize) is one of the most important crates in the Rust ecosystem. It defines *how a type turns into data and back*, while separate crates handle the concrete formats: `serde_json` (JSON), `toml`, `serde_yaml`, `csv`, `bincode`… Write the derive once and every format works.

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct User {
    name: String,
    age: u32,
    emails: Vec<String>,
}

let json = r#"{ "name": "Ada", "age": 36, "emails": ["ada@example.com"] }"#;
let user: User = serde_json::from_str(json)?;        // JSON -> struct
let back: String = serde_json::to_string(&user)?;     // struct -> JSON (compact)
let pretty = serde_json::to_string_pretty(&user)?;    // indented
```

`r#"..."#` is a **raw string**: `"` and `\` inside don't need escaping, which is handy for JSON and regexes.

## Compared with Python / C++

- Python's `json.loads` returns a `dict`; a misspelled field only shows up when you access it at run time. serde **validates against the type** while parsing: a missing field or the wrong type is an `Err`, and after a successful parse you have an ordinary strongly-typed struct
- In C++ you usually hand-write conversion functions for a library like nlohmann/json. serde's `derive` generates that code at compile time — no reflection, no runtime overhead

## Fine-tuning with attributes

```rust
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]          // snake_case in Rust, camelCase in JSON
struct Server {
    host_name: String,                      // "hostName" in JSON
    #[serde(default)]                       // use Default (false) when the JSON lacks this field
    use_tls: bool,
    #[serde(rename = "max-conn")]           // rename a single field
    max_connections: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    comment: Option<String>,                // a missing Option field is simply None
}
```

## JSON of unknown shape: serde_json::Value

```rust
let v: serde_json::Value = serde_json::from_str(json)?;
let port = v["server"]["port"].as_u64();    // a missing key doesn't panic: you get Value::Null, and as_u64 returns None
let v2 = serde_json::json!({ "ok": true, "items": [1, 2, 3] });   // build JSON directly with a macro
```

## Task

1. Add derives to `Config` so it can be serialized and deserialized. The JSON keys are camelCase (`maxUsers`), and `debug` defaults to `false` when missing
2. `parse_config(json)`: parse a JSON string into a `Config`
3. `to_json(config)`: serialize a `Config` into a **compact** JSON string
4. `nested_port(json)`: get `server.port` out of arbitrary JSON; return `None` if it isn't there (or isn't a number, or the JSON itself is invalid)

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
`parse_config`: `serde_json::from_str(json)` — the return type already says `Result<Config, serde_json::Error>`, so inference picks the right target type. `to_json`: `serde_json::to_string(config).unwrap()` (serializing a plain struct can't fail).
:::

:::hint
`nested_port`:
```rust
let v: serde_json::Value = serde_json::from_str(json).ok()?;
v["server"]["port"].as_u64()
```
:::

:::exercise
use serde::{Deserialize, Serialize};

// TODO: add the derives and serde attributes
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

/// Read server.port; None if it can't be found
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
        Err(e) => println!("parse failed: {e}"),
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
        assert!(parse_config(r#"{ "name": "a", "tags": [] }"#).is_err(), "a missing maxUsers should be an error");
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

/// Read server.port; None if it can't be found
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
        Err(e) => println!("parse failed: {e}"),
    }
    println!("{:?}", nested_port(r#"{ "server": { "host": "0.0.0.0", "port": 8080 } }"#));
}
:::

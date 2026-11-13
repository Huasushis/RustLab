---
title: thiserror and anyhow — No More Error Boilerplate
---
In chapter 5 we hand-wrote `Display`, `Error` and `From` for a custom error type — three whole `impl`s. Almost nobody writes those by hand in real projects; they use two crates instead:

| Crate | Where | What it does |
| --- | --- | --- |
| **thiserror** | **libraries** (code other people call) | derive precise error enums that callers can `match` on |
| **anyhow** | **applications** (main, CLI tools, services) | one `anyhow::Error` that holds any error, plus layers of context |

## thiserror: derived error types

```rust
use std::num::ParseIntError;

#[derive(Debug, thiserror::Error)]
enum ConfigError {
    #[error("missing config key {0}")]           // generates Display; {0} is the first field
    Missing(String),
    #[error("port {port} is out of range")]      // named fields by name
    PortOutOfRange { port: u32 },
    #[error("not a number")]
    BadNumber(#[from] ParseIntError),            // #[from] generates From<ParseIntError>, so ? converts automatically
}
```

Chapter 5's three `impl`s become a few attributes. The generated code is exactly what you'd write by hand, with zero runtime overhead.

## anyhow: the "any error" for applications

In an application you often don't need to tell error kinds apart; you just want errors to bubble up and, at the end, a message that **explains how we got there**.

```rust
use anyhow::{Context, Result, bail};    // anyhow::Result<T> is Result<T, anyhow::Error>

fn load_port(text: &str) -> Result<u16> {
    let line = text.lines().find(|l| l.starts_with("port=")).context("no port in config")?;   // works on Option too
    let port: u16 = line[5..].trim().parse().with_context(|| format!("invalid port value {line:?}"))?;
    if port < 1024 {
        bail!("port {port} requires administrator privileges");   // return an error right away, i.e. return Err(anyhow!(...))
    }
    Ok(port)
}
```

- Any error implementing `std::error::Error` converts into `anyhow::Error` with `?`
- `.context("...")` wraps the error in one more layer of explanation, like the exception chain from Python's `raise NewError(...) from err`
- `{}` prints only the outermost layer; `{:#}` prints the whole chain: `invalid port value "port=abc": invalid digit found in string`
- `main` can return `anyhow::Result<()>`, and the whole chain is printed on error

## Task

The code on the right is a small program that reads `key=value` configuration.

1. Complete `ConfigError` with thiserror: the three variants display as `missing config key {name}`, `port {port} is out of range` and `not a number`, and `BadNumber` converts automatically from `ParseIntError`
2. `parse_port(config)`: get `"port"` out of the `HashMap` (report `Missing` if absent), parse it as a `u32` (on failure `?` turns it into `BadNumber` automatically), require it to be between 1 and 65535 (otherwise `PortOutOfRange`), and return a `u16`
3. `load(text)`: parse text like `"host=a\nport=80"` into a `HashMap` (ignoring lines without `=`), call `parse_port`, and add the context `failed to read the port` with anyhow

:::hint
```rust
#[derive(Debug, thiserror::Error)]
enum ConfigError {
    #[error("missing config key {0}")]
    Missing(String),
    #[error("port {port} is out of range")]
    PortOutOfRange { port: u32 },
    #[error("not a number")]
    BadNumber(#[from] ParseIntError),
}
```
:::

:::hint
`parse_port`:
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
`load`:
```rust
let map: HashMap<String, String> = text
    .lines()
    .filter_map(|l| l.split_once('='))
    .map(|(k, v)| (k.trim().to_string(), v.trim().to_string()))
    .collect();
let port = parse_port(&map).context("failed to read the port")?;
Ok(port)
```
Don't forget `use anyhow::Context;` — the `.context` method comes from that trait.
:::

:::exercise
use std::collections::HashMap;
use std::num::ParseIntError;

// TODO: implement with thiserror
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
            Ok(port) => println!("port: {port}"),
            Err(e) => println!("error: {e:#}"),
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
        assert_eq!(ConfigError::Missing("port".to_string()).to_string(), "missing config key port");
        assert_eq!(ConfigError::PortOutOfRange { port: 9 }.to_string(), "port 9 is out of range");
        let e: ConfigError = "x".parse::<u32>().unwrap_err().into();
        assert_eq!(e.to_string(), "not a number");
    }

    #[test]
    fn load_with_context() {
        assert_eq!(load("host=a\nport=80\n").unwrap(), 80);
        assert_eq!(load("garbage line\nport = 443").unwrap(), 443);
        let err = load("host=a").unwrap_err();
        assert_eq!(err.to_string(), "failed to read the port");
        assert_eq!(format!("{err:#}"), "failed to read the port: missing config key port");
        assert!(err.downcast_ref::<ConfigError>().is_some());
        assert_eq!(format!("{:#}", load("port=70000").unwrap_err()), "failed to read the port: port 70000 is out of range");
    }
}
:::

:::solution
use anyhow::Context;
use std::collections::HashMap;
use std::num::ParseIntError;

#[derive(Debug, thiserror::Error)]
enum ConfigError {
    #[error("missing config key {0}")]
    Missing(String),
    #[error("port {port} is out of range")]
    PortOutOfRange { port: u32 },
    #[error("not a number")]
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
    let port = parse_port(&map).context("failed to read the port")?;
    Ok(port)
}

fn main() {
    for text in ["host=localhost\nport=8080", "host=localhost", "port=http", "port=70000"] {
        match load(text) {
            Ok(port) => println!("port: {port}"),
            Err(e) => println!("error: {e:#}"),
        }
    }
}
:::

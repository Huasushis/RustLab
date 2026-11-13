---
title: clap：命令行参数解析
crates: clap
---
写命令行工具几乎都会用到 `clap`。和 Python 的 `argparse` 相比，它最大的特点是**用一个结构体描述参数**，解析结果直接就是这个强类型的结构体：

```rust
use clap::Parser;

/// 一个打招呼的小工具          ← 文档注释会变成 --help 里的说明
#[derive(Parser, Debug)]
#[command(name = "greet", version)]
struct Cli {
    /// 要问候的名字              ← 每个字段的文档注释是这个参数的帮助文字
    name: String,                         // 没有 #[arg(...)]：位置参数，必填

    /// 重复几次
    #[arg(short, long, default_value_t = 1)]
    count: u8,                            // -c 3 或 --count 3

    /// 全部大写
    #[arg(long)]
    shout: bool,                          // bool 字段就是开关：出现即为 true

    #[arg(short, long)]
    lang: Option<String>,                 // Option：可选参数
}

fn main() {
    let cli = Cli::parse();               // 从真正的命令行参数解析；出错时自动打印用法并退出
}
```

自动得到的东西包括：`--help` / `-h` 帮助页、`--version`、类型校验（`--count abc` 会被拒绝，并给出清晰的报错）、缺少必填参数时的提示。

## 子命令

像 `git commit`、`cargo build` 这样的子命令，用枚举表示：

```rust
#[derive(clap::Subcommand, Debug)]
enum Command {
    /// 添加一项待办
    Add { text: String },
    /// 列出待办
    List {
        #[arg(long)]
        all: bool,
    },
}

#[derive(Parser, Debug)]
struct App {
    #[command(subcommand)]
    command: Command,
}
```

## 在测试里解析参数

`Cli::parse()` 读的是进程真正的命令行参数，在线环境里没法传。好在还有 `try_parse_from`，可以传入任意的参数列表（第一个元素是程序名），解析失败时返回 `Err` 而不是退出进程：

```rust
let cli = Cli::try_parse_from(["greet", "Ferris", "-c", "2", "--shout"]).unwrap();
```

## 任务

做一个迷你待办工具的命令行接口：

1. 给 `Cli` 和 `Command` 加上 clap 的 derive 和属性：
   - 全局开关 `-v` / `--verbose`
   - 子命令 `add <TEXT>`，带可选的 `-p` / `--priority`，默认值 `3`
   - 子命令 `done <ID>`，`ID` 是 `u32`
   - 子命令 `list`，带开关 `--all`
2. `describe(cli)`：把解析结果描述成一句话（格式见测试），`verbose` 时在开头加上 `[verbose] `

:::hint
```rust
#[derive(Parser, Debug)]
struct Cli {
    #[arg(short, long)]
    verbose: bool,
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand, Debug)]
enum Command {
    Add {
        text: String,
        #[arg(short, long, default_value_t = 3)]
        priority: u8,
    },
    Done { id: u32 },
    List {
        #[arg(long)]
        all: bool,
    },
}
```
:::

:::hint
`describe`：先 `match &cli.command` 得到描述，例如 `Command::Add { text, priority } => format!("添加「{text}」，优先级 {priority}")`；再根据 `cli.verbose` 决定要不要加前缀。
:::

:::exercise
use clap::{Parser, Subcommand};

// TODO: 加上 clap 的 derive 和属性
#[derive(Debug)]
struct Cli {
    verbose: bool,
    command: Command,
}

#[derive(Debug)]
enum Command {
    Add { text: String, priority: u8 },
    Done { id: u32 },
    List { all: bool },
}

fn describe(cli: &Cli) -> String {
    todo!()
}

fn main() {
    let inputs: [&[&str]; 4] = [
        &["todo", "add", "学 Rust", "-p", "1"],
        &["todo", "-v", "done", "7"],
        &["todo", "list", "--all"],
        &["todo", "done", "seven"],
    ];
    for args in inputs {
        match Cli::try_parse_from(args) {
            Ok(cli) => println!("{}", describe(&cli)),
            Err(e) => println!("参数错误：{}", e.kind()),
        }
    }
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    fn parse(args: &[&str]) -> Cli {
        Cli::try_parse_from(args).unwrap()
    }

    #[test]
    fn add_with_default_priority() {
        let cli = parse(&["todo", "add", "买菜"]);
        assert!(!cli.verbose);
        assert!(matches!(&cli.command, Command::Add { text, priority: 3 } if text == "买菜"));
        assert_eq!(describe(&cli), "添加「买菜」，优先级 3");
    }

    #[test]
    fn add_with_priority_and_verbose() {
        let cli = parse(&["todo", "--verbose", "add", "写周报", "--priority", "1"]);
        assert_eq!(describe(&cli), "[verbose] 添加「写周报」，优先级 1");
        let cli = parse(&["todo", "-v", "add", "x", "-p", "2"]);
        assert_eq!(describe(&cli), "[verbose] 添加「x」，优先级 2");
    }

    #[test]
    fn done_and_list() {
        assert_eq!(describe(&parse(&["todo", "done", "7"])), "完成第 7 项");
        assert_eq!(describe(&parse(&["todo", "list"])), "列出未完成的待办");
        assert_eq!(describe(&parse(&["todo", "list", "--all"])), "列出全部待办");
    }

    #[test]
    fn rejects_bad_arguments() {
        assert!(Cli::try_parse_from(["todo", "done", "seven"]).is_err());
        assert!(Cli::try_parse_from(["todo"]).is_err());
        assert!(Cli::try_parse_from(["todo", "add"]).is_err());
        assert!(Cli::try_parse_from(["todo", "remove", "1"]).is_err());
    }
}
:::

:::solution
use clap::{Parser, Subcommand};

#[derive(Parser, Debug)]
struct Cli {
    #[arg(short, long)]
    verbose: bool,
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand, Debug)]
enum Command {
    Add {
        text: String,
        #[arg(short, long, default_value_t = 3)]
        priority: u8,
    },
    Done {
        id: u32,
    },
    List {
        #[arg(long)]
        all: bool,
    },
}

fn describe(cli: &Cli) -> String {
    let what = match &cli.command {
        Command::Add { text, priority } => format!("添加「{text}」，优先级 {priority}"),
        Command::Done { id } => format!("完成第 {id} 项"),
        Command::List { all: true } => "列出全部待办".to_string(),
        Command::List { all: false } => "列出未完成的待办".to_string(),
    };
    if cli.verbose { format!("[verbose] {what}") } else { what }
}

fn main() {
    let inputs: [&[&str]; 4] = [
        &["todo", "add", "学 Rust", "-p", "1"],
        &["todo", "-v", "done", "7"],
        &["todo", "list", "--all"],
        &["todo", "done", "seven"],
    ];
    for args in inputs {
        match Cli::try_parse_from(args) {
            Ok(cli) => println!("{}", describe(&cli)),
            Err(e) => println!("参数错误：{}", e.kind()),
        }
    }
}
:::

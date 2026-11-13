---
title: clap — Command-Line Arguments
---
Almost every command-line tool uses `clap`. Compared with Python's `argparse`, its standout feature is that **a struct describes the arguments**, and the parse result is that strongly-typed struct:

```rust
use clap::Parser;

/// A tiny greeting tool          ← doc comments become the description in --help
#[derive(Parser, Debug)]
#[command(name = "greet", version)]
struct Cli {
    /// The name to greet           ← each field's doc comment is that argument's help text
    name: String,                         // no #[arg(...)]: a required positional argument

    /// How many times to repeat
    #[arg(short, long, default_value_t = 1)]
    count: u8,                            // -c 3 or --count 3

    /// Shout in uppercase
    #[arg(long)]
    shout: bool,                          // a bool field is a flag: present means true

    #[arg(short, long)]
    lang: Option<String>,                 // Option: an optional argument
}

fn main() {
    let cli = Cli::parse();               // parse the real command line; on error prints usage and exits
}
```

What you get for free: a `--help` / `-h` page, `--version`, type checking (`--count abc` is rejected with a clear message), and a hint when a required argument is missing.

## Subcommands

Subcommands like `git commit` or `cargo build` are expressed as an enum:

```rust
#[derive(clap::Subcommand, Debug)]
enum Command {
    /// Add a to-do item
    Add { text: String },
    /// List to-do items
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

## Parsing arguments in tests

`Cli::parse()` reads the process's real arguments, which you can't pass in the online environment. Fortunately there's `try_parse_from`, which takes any argument list (the first element is the program name) and returns `Err` on failure instead of exiting:

```rust
let cli = Cli::try_parse_from(["greet", "Ferris", "-c", "2", "--shout"]).unwrap();
```

## Task

Build the command-line interface of a mini to-do tool:

1. Add clap derives and attributes to `Cli` and `Command`:
   - a global flag `-v` / `--verbose`
   - a subcommand `add <TEXT>` with an optional `-p` / `--priority`, defaulting to `3`
   - a subcommand `done <ID>`, where `ID` is a `u32`
   - a subcommand `list` with an `--all` flag
2. `describe(cli)`: describe the parsed result in one sentence (see the tests for the format); with `verbose`, prefix it with `[verbose] `

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
`describe`: first `match &cli.command` to build the description, e.g. `Command::Add { text, priority } => format!("add \"{text}\" with priority {priority}")`; then add the prefix depending on `cli.verbose`.
:::

:::exercise
use clap::{Parser, Subcommand};

// TODO: add clap derives and attributes
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
        &["todo", "add", "learn Rust", "-p", "1"],
        &["todo", "-v", "done", "7"],
        &["todo", "list", "--all"],
        &["todo", "done", "seven"],
    ];
    for args in inputs {
        match Cli::try_parse_from(args) {
            Ok(cli) => println!("{}", describe(&cli)),
            Err(e) => println!("argument error: {}", e.kind()),
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
        let cli = parse(&["todo", "add", "buy milk"]);
        assert!(!cli.verbose);
        assert!(matches!(&cli.command, Command::Add { text, priority: 3 } if text == "buy milk"));
        assert_eq!(describe(&cli), "add \"buy milk\" with priority 3");
    }

    #[test]
    fn add_with_priority_and_verbose() {
        let cli = parse(&["todo", "--verbose", "add", "weekly report", "--priority", "1"]);
        assert_eq!(describe(&cli), "[verbose] add \"weekly report\" with priority 1");
        let cli = parse(&["todo", "-v", "add", "x", "-p", "2"]);
        assert_eq!(describe(&cli), "[verbose] add \"x\" with priority 2");
    }

    #[test]
    fn done_and_list() {
        assert_eq!(describe(&parse(&["todo", "done", "7"])), "complete item 7");
        assert_eq!(describe(&parse(&["todo", "list"])), "list open items");
        assert_eq!(describe(&parse(&["todo", "list", "--all"])), "list all items");
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
        Command::Add { text, priority } => format!("add \"{text}\" with priority {priority}"),
        Command::Done { id } => format!("complete item {id}"),
        Command::List { all: true } => "list all items".to_string(),
        Command::List { all: false } => "list open items".to_string(),
    };
    if cli.verbose { format!("[verbose] {what}") } else { what }
}

fn main() {
    let inputs: [&[&str]; 4] = [
        &["todo", "add", "learn Rust", "-p", "1"],
        &["todo", "-v", "done", "7"],
        &["todo", "list", "--all"],
        &["todo", "done", "seven"],
    ];
    for args in inputs {
        match Cli::try_parse_from(args) {
            Ok(cli) => println!("{}", describe(&cli)),
            Err(e) => println!("argument error: {}", e.kind()),
        }
    }
}
:::

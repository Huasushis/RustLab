---
title: An Expression Calculator
---
The final level: a calculator that can evaluate expressions like `2 * (3 + 4) - -1`. It works in two steps — the same first two steps as almost every compiler and interpreter:

```text
"2 * (3 + 4)"  ──lexing──▶  [Num(2), Star, LParen, Num(3), Plus, Num(4), RParen]  ──parsing + evaluation──▶  14
```

## Step 1: lexing with `tokenize`

Cut the string into a sequence of `Token`s:

- skip whitespace
- consecutive digits and dots form one number (e.g. `3.5`), parsed as an `f64`; report `BadNumber` if parsing fails
- each of `+ - * / ( )` is a token
- any other character reports `UnexpectedChar(c)`

`chars().peekable()` lets you "peek" at the next character without taking it: `it.peek()` returns `Option<&char>`, and only `it.next()` actually consumes it.

## Step 2: recursive-descent evaluation

Operator precedence can be written directly as **grammar rules**, one function per rule:

```text
expr   = term   { ("+" | "-") term }        // addition and subtraction: lowest precedence
term   = factor { ("*" | "/") factor }      // multiplication and division
factor = Num | "-" factor | "(" expr ")"    // numbers, negation, parentheses: highest precedence
```

`expr` calls `term`, `term` calls `factor`, and when `factor` sees a parenthesis it calls back into `expr`. The nesting of the functions *is* the precedence. `{ }` means repetition and becomes a loop, which makes operators of the same level left-associative: `8 - 3 - 2` is `3`.

The skeleton's `Parser` already provides `peek` (look at the current token) and `next` (take the current token); you implement the three rule functions.

## Errors

| Situation | Error |
| --- | --- |
| division by 0 | `DivisionByZero` |
| the expression ends too early, e.g. `1 +`, `(2`, or an empty string | `UnexpectedEnd` |
| a token appears where it doesn't belong, e.g. `1 2`, `)`, `* 3` | `UnexpectedToken` |

:::hint
The main loop of `tokenize`:
```rust
let mut tokens = Vec::new();
let mut it = s.chars().peekable();
while let Some(&c) = it.peek() {
    match c {
        ' ' | '\t' | '\n' => { it.next(); }
        '+' => { it.next(); tokens.push(Token::Plus); }
        // ... the other symbols work the same way
        '0'..='9' | '.' => {
            let mut num = String::new();
            while let Some(&d) = it.peek() {
                if d.is_ascii_digit() || d == '.' { num.push(d); it.next(); } else { break; }
            }
            let v = num.parse::<f64>().map_err(|_| CalcError::BadNumber(num.clone()))?;
            tokens.push(Token::Num(v));
        }
        other => return Err(CalcError::UnexpectedChar(other)),
    }
}
Ok(tokens)
```
:::

:::hint
`expr` (`term` has the same shape with `*` `/`, and checks the divisor when dividing):
```rust
let mut value = self.term()?;
loop {
    match self.peek() {
        Some(Token::Plus) => { self.next(); value += self.term()?; }
        Some(Token::Minus) => { self.next(); value -= self.term()?; }
        _ => return Ok(value),
    }
}
```
:::

:::hint
`factor`:
```rust
match self.next() {
    Some(Token::Num(n)) => Ok(n),
    Some(Token::Minus) => Ok(-self.factor()?),
    Some(Token::LParen) => {
        let v = self.expr()?;
        match self.next() {
            Some(Token::RParen) => Ok(v),
            Some(t) => Err(CalcError::UnexpectedToken(t)),
            None => Err(CalcError::UnexpectedEnd),
        }
    }
    Some(t) => Err(CalcError::UnexpectedToken(t)),
    None => Err(CalcError::UnexpectedEnd),
}
```
:::

:::exercise
#[derive(Debug, Clone, Copy, PartialEq)]
enum Token {
    Num(f64),
    Plus,
    Minus,
    Star,
    Slash,
    LParen,
    RParen,
}

#[derive(Debug, PartialEq)]
enum CalcError {
    UnexpectedChar(char),
    BadNumber(String),
    UnexpectedToken(Token),
    UnexpectedEnd,
    DivisionByZero,
}

fn tokenize(s: &str) -> Result<Vec<Token>, CalcError> {
    todo!()
}

struct Parser {
    tokens: Vec<Token>,
    pos: usize,
}

impl Parser {
    /// Peek at the current token without advancing
    fn peek(&self) -> Option<Token> {
        self.tokens.get(self.pos).copied()
    }

    /// Take the current token
    fn next(&mut self) -> Option<Token> {
        let t = self.peek();
        if t.is_some() {
            self.pos += 1;
        }
        t
    }

    /// expr = term { ("+" | "-") term }
    fn expr(&mut self) -> Result<f64, CalcError> {
        todo!()
    }

    /// term = factor { ("*" | "/") factor }
    fn term(&mut self) -> Result<f64, CalcError> {
        todo!()
    }

    /// factor = Num | "-" factor | "(" expr ")"
    fn factor(&mut self) -> Result<f64, CalcError> {
        todo!()
    }
}

fn calc(s: &str) -> Result<f64, CalcError> {
    let tokens = tokenize(s)?;
    let mut p = Parser { tokens, pos: 0 };
    let value = p.expr()?;
    // nothing may be left over after the whole expression is parsed
    match p.next() {
        None => Ok(value),
        Some(t) => Err(CalcError::UnexpectedToken(t)),
    }
}

fn main() {
    for s in ["1 + 2 * 3", "2 * (3 + 4) - -1", "8 / (3 - 3)", "1 +", "2 $ 3"] {
        println!("{s:<18} => {:?}", calc(s));
    }
}
:::

:::solution
#[derive(Debug, Clone, Copy, PartialEq)]
enum Token {
    Num(f64),
    Plus,
    Minus,
    Star,
    Slash,
    LParen,
    RParen,
}

#[derive(Debug, PartialEq)]
enum CalcError {
    UnexpectedChar(char),
    BadNumber(String),
    UnexpectedToken(Token),
    UnexpectedEnd,
    DivisionByZero,
}

fn tokenize(s: &str) -> Result<Vec<Token>, CalcError> {
    let mut tokens = Vec::new();
    let mut it = s.chars().peekable();
    while let Some(&c) = it.peek() {
        let simple = match c {
            '+' => Some(Token::Plus),
            '-' => Some(Token::Minus),
            '*' => Some(Token::Star),
            '/' => Some(Token::Slash),
            '(' => Some(Token::LParen),
            ')' => Some(Token::RParen),
            _ => None,
        };
        if let Some(t) = simple {
            it.next();
            tokens.push(t);
        } else if c.is_whitespace() {
            it.next();
        } else if c.is_ascii_digit() || c == '.' {
            let mut num = String::new();
            while let Some(&d) = it.peek() {
                if d.is_ascii_digit() || d == '.' {
                    num.push(d);
                    it.next();
                } else {
                    break;
                }
            }
            let v = num.parse::<f64>().map_err(|_| CalcError::BadNumber(num.clone()))?;
            tokens.push(Token::Num(v));
        } else {
            return Err(CalcError::UnexpectedChar(c));
        }
    }
    Ok(tokens)
}

struct Parser {
    tokens: Vec<Token>,
    pos: usize,
}

impl Parser {
    /// Peek at the current token without advancing
    fn peek(&self) -> Option<Token> {
        self.tokens.get(self.pos).copied()
    }

    /// Take the current token
    fn next(&mut self) -> Option<Token> {
        let t = self.peek();
        if t.is_some() {
            self.pos += 1;
        }
        t
    }

    /// expr = term { ("+" | "-") term }
    fn expr(&mut self) -> Result<f64, CalcError> {
        let mut value = self.term()?;
        loop {
            match self.peek() {
                Some(Token::Plus) => {
                    self.next();
                    value += self.term()?;
                }
                Some(Token::Minus) => {
                    self.next();
                    value -= self.term()?;
                }
                _ => return Ok(value),
            }
        }
    }

    /// term = factor { ("*" | "/") factor }
    fn term(&mut self) -> Result<f64, CalcError> {
        let mut value = self.factor()?;
        loop {
            match self.peek() {
                Some(Token::Star) => {
                    self.next();
                    value *= self.factor()?;
                }
                Some(Token::Slash) => {
                    self.next();
                    let d = self.factor()?;
                    if d == 0.0 {
                        return Err(CalcError::DivisionByZero);
                    }
                    value /= d;
                }
                _ => return Ok(value),
            }
        }
    }

    /// factor = Num | "-" factor | "(" expr ")"
    fn factor(&mut self) -> Result<f64, CalcError> {
        match self.next() {
            Some(Token::Num(n)) => Ok(n),
            Some(Token::Minus) => Ok(-self.factor()?),
            Some(Token::LParen) => {
                let v = self.expr()?;
                match self.next() {
                    Some(Token::RParen) => Ok(v),
                    Some(t) => Err(CalcError::UnexpectedToken(t)),
                    None => Err(CalcError::UnexpectedEnd),
                }
            }
            Some(t) => Err(CalcError::UnexpectedToken(t)),
            None => Err(CalcError::UnexpectedEnd),
        }
    }
}

fn calc(s: &str) -> Result<f64, CalcError> {
    let tokens = tokenize(s)?;
    let mut p = Parser { tokens, pos: 0 };
    let value = p.expr()?;
    // nothing may be left over after the whole expression is parsed
    match p.next() {
        None => Ok(value),
        Some(t) => Err(CalcError::UnexpectedToken(t)),
    }
}

fn main() {
    for s in ["1 + 2 * 3", "2 * (3 + 4) - -1", "8 / (3 - 3)", "1 +", "2 $ 3"] {
        println!("{s:<18} => {:?}", calc(s));
    }
}
:::

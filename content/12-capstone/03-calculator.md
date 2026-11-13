---
title: 表达式计算器
---
最后一关：写一个能计算 `2 * (3 + 4) - -1` 这种表达式的计算器。它分成两步，也是几乎所有编译器和解释器的开头两步：

```text
"2 * (3 + 4)"  ──词法分析──▶  [Num(2), Star, LParen, Num(3), Plus, Num(4), RParen]  ──语法分析+求值──▶  14
```

## 第一步：词法分析 `tokenize`

把字符串切成 `Token` 序列：

- 跳过空白
- 连续的数字和小数点组成一个数（如 `3.5`），解析成 `f64`；解析失败报 `BadNumber`
- `+ - * / ( )` 各自是一个 token
- 其它字符报 `UnexpectedChar(c)`

`chars().peekable()` 能让你「偷看」下一个字符而不取走它：`it.peek()` 返回 `Option<&char>`，`it.next()` 才真正取走。

## 第二步：递归下降求值

运算符优先级可以直接写成**语法规则**，每条规则对应一个函数：

```text
expr   = term   { ("+" | "-") term }        // 加减：最低优先级
term   = factor { ("*" | "/") factor }      // 乘除
factor = Num | "-" factor | "(" expr ")"    // 数字、负号、括号：最高优先级
```

`expr` 调用 `term`，`term` 调用 `factor`，`factor` 遇到括号又回头调用 `expr`。函数的嵌套层次自然就体现了优先级，`{ }` 表示的重复用循环实现，所以同级运算符是左结合的：`8 - 3 - 2` 等于 `3`。

骨架代码里的 `Parser` 已经提供了 `peek`（看当前 token）和 `next`（取走当前 token），你需要实现三个规则函数。

## 错误

| 情况 | 错误 |
| --- | --- |
| 除数为 0 | `DivisionByZero` |
| 表达式提前结束，例如 `1 +`、`(2`、空串 | `UnexpectedEnd` |
| 出现了不该出现的 token，例如 `1 2`、`)`、`* 3` | `UnexpectedToken` |

:::hint
`tokenize` 的主循环：
```rust
let mut tokens = Vec::new();
let mut it = s.chars().peekable();
while let Some(&c) = it.peek() {
    match c {
        ' ' | '\t' | '\n' => { it.next(); }
        '+' => { it.next(); tokens.push(Token::Plus); }
        // ... 其它符号同理
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
`expr`（`term` 结构相同，换成 `*` `/`，并在除法时检查除数）：
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
`factor`：
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
    /// 看一眼当前 token，不移动位置
    fn peek(&self) -> Option<Token> {
        self.tokens.get(self.pos).copied()
    }

    /// 取走当前 token
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
    // 整个表达式解析完之后不应该还有剩余的 token
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

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tokenizer() {
        assert_eq!(
            tokenize("3.5*(1 -2)"),
            Ok(vec![
                Token::Num(3.5),
                Token::Star,
                Token::LParen,
                Token::Num(1.0),
                Token::Minus,
                Token::Num(2.0),
                Token::RParen
            ])
        );
        assert_eq!(tokenize("  "), Ok(vec![]));
        assert_eq!(tokenize("2 $ 3"), Err(CalcError::UnexpectedChar('$')));
        assert_eq!(tokenize("1.2.3"), Err(CalcError::BadNumber("1.2.3".to_string())));
    }

    #[test]
    fn precedence_and_associativity() {
        assert_eq!(calc("1 + 2 * 3"), Ok(7.0));
        assert_eq!(calc("(1 + 2) * 3"), Ok(9.0));
        assert_eq!(calc("8 - 3 - 2"), Ok(3.0));
        assert_eq!(calc("24 / 4 / 2"), Ok(3.0));
        assert_eq!(calc("2 * (3 + 4) - -1"), Ok(15.0));
        assert_eq!(calc("--2"), Ok(2.0));
        assert_eq!(calc("-(1 + 1) * 2.5"), Ok(-5.0));
        assert_eq!(calc("((((7))))"), Ok(7.0));
    }

    #[test]
    fn errors() {
        assert_eq!(calc("8 / (3 - 3)"), Err(CalcError::DivisionByZero));
        assert_eq!(calc("1 +"), Err(CalcError::UnexpectedEnd));
        assert_eq!(calc("(2"), Err(CalcError::UnexpectedEnd));
        assert_eq!(calc(""), Err(CalcError::UnexpectedEnd));
        assert_eq!(calc("1 2"), Err(CalcError::UnexpectedToken(Token::Num(2.0))));
        assert_eq!(calc(")"), Err(CalcError::UnexpectedToken(Token::RParen)));
        assert_eq!(calc("* 3"), Err(CalcError::UnexpectedToken(Token::Star)));
        assert_eq!(calc("(1))"), Err(CalcError::UnexpectedToken(Token::RParen)));
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
    /// 看一眼当前 token，不移动位置
    fn peek(&self) -> Option<Token> {
        self.tokens.get(self.pos).copied()
    }

    /// 取走当前 token
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
    // 整个表达式解析完之后不应该还有剩余的 token
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

---
title: Defining and Implementing Traits
---
A **trait** describes "what a type can do", and it's the only way to share behavior in Rust.

```rust
trait Summary {
    fn title(&self) -> String;                 // required method (signature only)

    fn summarize(&self) -> String {            // method with a default implementation; inherit or override it
        format!("“{}” … (read more)", self.title())
    }
}

struct Article { headline: String }

impl Summary for Article {
    fn title(&self) -> String {
        self.headline.clone()
    }
    // summarize uses the default
}
```

## Analogies

| | |
| --- | --- |
| Java / C# | `interface` (with default methods) |
| C++ | a pure virtual base class, or a C++20 concept |
| Python | `Protocol` / abstract base classes |

But two things are very different:

**1. Implementations are separate from type definitions.** `impl Summary for Article` doesn't have to live inside `Article`'s definition. That means you can implement your own traits for **other people's types** (even `i32` or `Vec<T>`):

```rust
impl Summary for i32 {
    fn title(&self) -> String { format!("the number {self}") }
}
println!("{}", 42.summarize());
```

There's only one restriction (the **orphan rule**): either the trait or the type must be defined in your own crate. You can't implement someone else's trait for someone else's type.

**2. No inheritance.** There's no such thing as "fields of the base class"; traits describe behavior only. Reuse data through composition.

## Calling trait methods

Call them with `.` like ordinary methods. The trait has to be **in scope**, which is why you sometimes need to `use` a trait before its standard-library methods become available.

## Task

The `Describe` trait is given; `describe` has a default implementation.

1. Implement `Describe` for `Dog`: `name` returns `"a dog"`, and `describe` uses the default
2. Implement `Describe` for `Robot`: `name` returns `robot #` followed by its `id`, e.g. `robot #7`; and **override** `describe` to return `beep boop, robot #7 reporting`

:::hint
```rust
impl Describe for Dog {
    fn name(&self) -> String {
        "a dog".to_string()
    }
}
```
:::

:::hint
`name` for `Robot`: `format!("robot #{}", self.id)`. Overriding `describe` just means writing that method again in the same `impl` block: `format!("beep boop, {} reporting", self.name())`.
:::

:::exercise
trait Describe {
    fn name(&self) -> String;

    fn describe(&self) -> String {
        format!("I am {}", self.name())
    }
}

struct Dog;

struct Robot {
    id: u32,
}

// TODO: implement Describe for Dog and Robot

fn main() {
    let dog = Dog;
    let robot = Robot { id: 7 };
    println!("{}", dog.describe());
    println!("{}", robot.describe());
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dog_uses_default() {
        assert_eq!(Dog.name(), "a dog");
        assert_eq!(Dog.describe(), "I am a dog");
    }

    #[test]
    fn robot_overrides() {
        let r = Robot { id: 7 };
        assert_eq!(r.name(), "robot #7");
        assert_eq!(r.describe(), "beep boop, robot #7 reporting");
        assert_eq!(Robot { id: 42 }.describe(), "beep boop, robot #42 reporting");
    }
}
:::

:::solution
trait Describe {
    fn name(&self) -> String;

    fn describe(&self) -> String {
        format!("I am {}", self.name())
    }
}

struct Dog;

struct Robot {
    id: u32,
}

impl Describe for Dog {
    fn name(&self) -> String {
        "a dog".to_string()
    }
}

impl Describe for Robot {
    fn name(&self) -> String {
        format!("robot #{}", self.id)
    }

    fn describe(&self) -> String {
        format!("beep boop, {} reporting", self.name())
    }
}

fn main() {
    let dog = Dog;
    let robot = Robot { id: 7 };
    println!("{}", dog.describe());
    println!("{}", robot.describe());
}
:::

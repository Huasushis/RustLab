---
title: Structs and Methods
---
## Defining and creating

```rust
struct User {
    name: String,
    age: u32,
}

let name = String::from("Ada");
let u = User { name, age: 36 };          // shorthand when the variable has the field's name
let older = User { age: 37, ..u };       // remaining fields come from u (note: u.name is moved)
println!("{}", older.name);
```

There are two more flavours: **tuple structs** `struct Rgb(u8, u8, u8);` (fields accessed with `.0 .1 .2`) and **unit structs** `struct Marker;`.

## Methods go in an impl block

Rust keeps data (`struct`) and behavior (`impl`) apart:

```rust
impl User {
    // No self parameter: an "associated function", called as User::new(...), like a static method
    fn new(name: &str, age: u32) -> Self {
        Self { name: name.to_string(), age }
    }

    fn greeting(&self) -> String {            // borrows self read-only
        format!("I'm {}", self.name)
    }

    fn birthday(&mut self) {                  // borrows self mutably
        self.age += 1;
    }

    fn into_name(self) -> String {            // takes ownership; the object can't be used afterwards
        self.name
    }
}
```

The three forms of `self` match the three ways of passing arguments from the previous chapter, and they **must be written explicitly** — like Python's `self`, and clearer than C++'s implicit `this`.

## Compared with classes in C++ / Python

- **No constructors.** `new` is just a conventional name for an ordinary associated function.
- **No inheritance.** Code reuse is done with composition and traits (chapter 6).
- Fields are private by default (to code outside the module, chapter 10); there are no `public:` / `private:` sections.
- `#[derive(Debug)]` makes a struct printable with `{:?}`, like a generated `__repr__`.

## Task

Implement five methods for `Rectangle`:

| Method | Purpose |
| --- | --- |
| `new(width, height)` | Create a rectangle |
| `square(side)` | Create a square |
| `area(&self)` | Area |
| `can_hold(&self, other)` | Are both its width and height **strictly greater** than `other`'s? |
| `scale(&mut self, factor)` | Multiply width and height by `factor` |

:::hint
The body of `new`: `Self { width, height }`. `square` can reuse it: `Self::new(side, side)`.
:::

:::hint
`can_hold`: `self.width > other.width && self.height > other.height`. `scale`: `self.width *= factor; self.height *= factor;`
:::

:::exercise
#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    fn new(width: u32, height: u32) -> Self {
        todo!()
    }

    fn square(side: u32) -> Self {
        todo!()
    }

    fn area(&self) -> u32 {
        todo!()
    }

    /// Can self fully contain other (both width and height strictly greater)?
    fn can_hold(&self, other: &Rectangle) -> bool {
        todo!()
    }

    fn scale(&mut self, factor: u32) {
        todo!()
    }
}

fn main() {
    let mut a = Rectangle::new(30, 50);
    let b = Rectangle::square(20);
    println!("a = {a:?}, area {}", a.area());
    println!("can a hold b? {}", a.can_hold(&b));
    a.scale(2);
    println!("after scaling, a = {a:?}");
}
:::

:::solution
#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    fn new(width: u32, height: u32) -> Self {
        Self { width, height }
    }

    fn square(side: u32) -> Self {
        Self::new(side, side)
    }

    fn area(&self) -> u32 {
        self.width * self.height
    }

    /// Can self fully contain other (both width and height strictly greater)?
    fn can_hold(&self, other: &Rectangle) -> bool {
        self.width > other.width && self.height > other.height
    }

    fn scale(&mut self, factor: u32) {
        self.width *= factor;
        self.height *= factor;
    }
}

fn main() {
    let mut a = Rectangle::new(30, 50);
    let b = Rectangle::square(20);
    println!("a = {a:?}, area {}", a.area());
    println!("can a hold b? {}", a.can_hold(&b));
    a.scale(2);
    println!("after scaling, a = {a:?}");
}
:::

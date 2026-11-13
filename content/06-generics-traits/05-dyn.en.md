---
title: Trait Objects and Dynamic Dispatch
---
Generics use **static dispatch**: every element of a `Vec<T>` must be the same `T`. What if you want circles and rectangles in the same `Vec`?

One option is to wrap them in an enum (the `Shape` from chapter 3). When the set of kinds is **open** — say, users of your library may add their own shapes — you need **trait objects**:

```rust
trait Shape {
    fn area(&self) -> f64;
}

let shapes: Vec<Box<dyn Shape>> = vec![
    Box::new(Circle { r: 1.0 }),
    Box::new(Rect { w: 2.0, h: 3.0 }),
];

for s in &shapes {
    println!("{}", s.area());      // which area runs is decided at run time
}
```

`dyn Shape` reads as "some type implementing `Shape`; which one is only known at run time". Its size isn't known at compile time, so it has to live behind a pointer: `Box<dyn Shape>`, `&dyn Shape` and `Rc<dyn Shape>` all work. `Box<T>` is an owning pointer to the heap, like `std::unique_ptr<T>`; chapter 9 covers it in detail.

## This is virtual dispatch

`&dyn Shape` is a **fat pointer**: one pointer to the data and one to a **vtable**. Calling a method jumps through the vtable — exactly what C++'s `virtual` does.

The difference is where the vtable pointer lives: C++ stores it **in the object** (every object with virtual functions grows by 8 bytes); Rust stores it **in the pointer**. So a `Circle` used directly costs nothing extra; you only pay for dynamic dispatch when you use it as a `dyn Shape`.

## Which one to pick

| | Generics `impl Trait` / `T: Trait` | Trait objects `dyn Trait` |
| --- | --- | --- |
| Dispatch | static, inlinable | dynamic, through the vtable |
| Code size | one copy per type | a single copy |
| Many types in one collection | no | yes |

Default to generics; reach for `dyn` when you need a heterogeneous collection, or when the type is only known at run time (e.g. creating different objects based on configuration).

## Task

The `Shape` trait and `Circle`, `Rect` are already implemented. Complete:

1. `total_area(shapes)`: the sum of all areas
2. `largest_name(shapes)`: the name of the shape with the largest area; `None` if there are no shapes
3. `make_shape(kind, size)`: a little factory function
   - `"circle"` → a circle with radius `size`
   - `"square"` → a `Rect` with side `size`
   - anything else → `None`

:::hint
`total_area`: `let mut sum = 0.0; for s in shapes { sum += s.area(); } sum`. Calling a method on a `Box<dyn Shape>` is the same as on a normal value: just use `.`.
:::

:::hint
`largest_name`: keep the largest so far in `let mut best: Option<&Box<dyn Shape>> = None;`, compare `s.area()` as you loop, and finish with `best.map(|s| s.name())`.
:::

:::hint
`make_shape`:
```rust
match kind {
    "circle" => Some(Box::new(Circle { r: size })),
    "square" => Some(Box::new(Rect { w: size, h: size })),
    _ => None,
}
```
The two arms produce different concrete types, but since the return type says `Box<dyn Shape>`, both are converted into trait objects automatically.
:::

:::exercise
use std::f64::consts::PI;

trait Shape {
    fn area(&self) -> f64;
    fn name(&self) -> String;
}

struct Circle {
    r: f64,
}

struct Rect {
    w: f64,
    h: f64,
}

impl Shape for Circle {
    fn area(&self) -> f64 {
        PI * self.r * self.r
    }
    fn name(&self) -> String {
        "circle".to_string()
    }
}

impl Shape for Rect {
    fn area(&self) -> f64 {
        self.w * self.h
    }
    fn name(&self) -> String {
        "rectangle".to_string()
    }
}

fn total_area(shapes: &[Box<dyn Shape>]) -> f64 {
    todo!()
}

/// The name of the shape with the largest area
fn largest_name(shapes: &[Box<dyn Shape>]) -> Option<String> {
    todo!()
}

/// Create a shape by name: "circle" or "square"
fn make_shape(kind: &str, size: f64) -> Option<Box<dyn Shape>> {
    todo!()
}

fn main() {
    let mut shapes: Vec<Box<dyn Shape>> = vec![Box::new(Circle { r: 1.0 }), Box::new(Rect { w: 2.0, h: 3.0 })];
    if let Some(s) = make_shape("square", 1.5) {
        shapes.push(s);
    }
    println!("total area: {:.2}", total_area(&shapes));
    println!("the largest is: {:?}", largest_name(&shapes));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> Vec<Box<dyn Shape>> {
        vec![
            Box::new(Circle { r: 1.0 }),
            Box::new(Rect { w: 2.0, h: 3.0 }),
            Box::new(Rect { w: 1.0, h: 1.0 }),
        ]
    }

    #[test]
    fn total_area_works() {
        assert!((total_area(&sample()) - (PI + 7.0)).abs() < 1e-9);
        assert_eq!(total_area(&[]), 0.0);
    }

    #[test]
    fn largest_name_works() {
        assert_eq!(largest_name(&sample()), Some("rectangle".to_string()));
        let shapes: Vec<Box<dyn Shape>> = vec![Box::new(Rect { w: 1.0, h: 1.0 }), Box::new(Circle { r: 5.0 })];
        assert_eq!(largest_name(&shapes), Some("circle".to_string()));
        assert_eq!(largest_name(&[]), None);
    }

    #[test]
    fn make_shape_works() {
        let c = make_shape("circle", 2.0).expect("should create a circle");
        assert_eq!(c.name(), "circle");
        assert!((c.area() - 4.0 * PI).abs() < 1e-9);
        let s = make_shape("square", 3.0).expect("should create a square");
        assert_eq!(s.name(), "rectangle");
        assert_eq!(s.area(), 9.0);
        assert!(make_shape("hexagon", 1.0).is_none());
    }
}
:::

:::solution
use std::f64::consts::PI;

trait Shape {
    fn area(&self) -> f64;
    fn name(&self) -> String;
}

struct Circle {
    r: f64,
}

struct Rect {
    w: f64,
    h: f64,
}

impl Shape for Circle {
    fn area(&self) -> f64 {
        PI * self.r * self.r
    }
    fn name(&self) -> String {
        "circle".to_string()
    }
}

impl Shape for Rect {
    fn area(&self) -> f64 {
        self.w * self.h
    }
    fn name(&self) -> String {
        "rectangle".to_string()
    }
}

fn total_area(shapes: &[Box<dyn Shape>]) -> f64 {
    let mut sum = 0.0;
    for s in shapes {
        sum += s.area();
    }
    sum
}

/// The name of the shape with the largest area
fn largest_name(shapes: &[Box<dyn Shape>]) -> Option<String> {
    let mut best: Option<&Box<dyn Shape>> = None;
    for s in shapes {
        match best {
            Some(b) if b.area() >= s.area() => {}
            _ => best = Some(s),
        }
    }
    best.map(|s| s.name())
}

/// Create a shape by name: "circle" or "square"
fn make_shape(kind: &str, size: f64) -> Option<Box<dyn Shape>> {
    match kind {
        "circle" => Some(Box::new(Circle { r: size })),
        "square" => Some(Box::new(Rect { w: size, h: size })),
        _ => None,
    }
}

fn main() {
    let mut shapes: Vec<Box<dyn Shape>> = vec![Box::new(Circle { r: 1.0 }), Box::new(Rect { w: 2.0, h: 3.0 })];
    if let Some(s) = make_shape("square", 1.5) {
        shapes.push(s);
    }
    println!("total area: {:.2}", total_area(&shapes));
    println!("the largest is: {:?}", largest_name(&shapes));
}
:::

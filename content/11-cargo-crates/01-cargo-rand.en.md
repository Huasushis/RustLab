---
title: Cargo and Your First Crate — rand
---
So far we've only used the standard library. Rust's standard library is deliberately small: random numbers, regular expressions, JSON, command-line parsing — "batteries included" in Python — are all left to community **crates** in Rust. The tool that manages them is **Cargo**.

## What Cargo is

Cargo is a package manager, a build system and a test runner in one; it combines all of these:

| What you know | Rust |
| --- | --- |
| `pip` / `npm` / `vcpkg` / `conan` | `cargo add`; dependencies come from [crates.io](https://crates.io) |
| `requirements.txt` / `package.json` / `CMakeLists.txt` | `Cargo.toml` |
| `poetry.lock` / `package-lock.json` | `Cargo.lock` |
| `make` / `cmake --build` | `cargo build` |
| `pytest` / `ctest` | `cargo test` |
| `black` / `clang-format` | `cargo fmt` |
| `pylint` / `clang-tidy` | `cargo clippy` |
| Sphinx / Doxygen | `cargo doc --open` |

C++ programmers will appreciate this the most: no build scripts to write, no header search paths or link order to worry about, and every Rust project builds the same way.

## Day-to-day with a project

```bash
cargo new hello          # create a project: Cargo.toml + src/main.rs
cd hello
cargo add rand           # add a dependency (written into Cargo.toml for you)
cargo run                # build and run
cargo check              # type-check only, no binary; much faster than build
cargo test               # run all tests
cargo build --release    # optimized build, for shipping or measuring performance
```

`Cargo.toml` looks like this:

```toml
[package]
name = "hello"
version = "0.1.0"
edition = "2024"

[dependencies]
rand = "0.10"                                        # same as ^0.10: accept 0.10.x updates
serde = { version = "1", features = ["derive"] }     # features: turn on optional parts of a crate
```

Versions follow **semantic versioning** (semver). On the first build Cargo records the exact versions it picked in `Cargo.lock`, so everyone builds with the same set afterwards. Applications should commit `Cargo.lock` to Git.

## Finding crates

- [crates.io](https://crates.io): the official registry; search and check download counts
- [docs.rs](https://docs.rs): auto-generated API docs for **every version** of every crate
- [lib.rs](https://lib.rs) and [blessed.rs](https://blessed.rs): curated lists by topic, great when you don't know which crate to pick

## Using crates on this site

The online environment needs **no** `Cargo.toml`: the official Playground preinstalls the few hundred most-downloaded crates, so you can just `use` them. The local runner preinstalls the crates this chapter uses — rand, serde, serde_json, regex, anyhow, thiserror, itertools, clap and chrono — at the same versions as the Playground.

## rand: random numbers

```rust
use rand::RngExt;                      // the trait that provides random_range and friends
use rand::seq::{IndexedRandom, SliceRandom};

let mut rng = rand::rng();             // a thread-local generator; all you need day to day
let dice: u8 = rng.random_range(1..=6);
let coin: bool = rng.random_bool(0.5);
let x: f64 = rng.random();             // a float in [0, 1)

let mut cards = vec![1, 2, 3, 4, 5];
cards.shuffle(&mut rng);               // shuffle in place (SliceRandom)
let one = cards.choose(&mut rng);      // pick one at random, as Option<&T> (IndexedRandom)
```

**Reproducible randomness**: tests often need random numbers that are "the same every run". Use a fixed seed:

```rust
use rand::{SeedableRng, rngs::StdRng};
let mut rng = StdRng::seed_from_u64(42);   // the same seed always produces the same sequence
```

So when writing functions, don't call `rand::rng()` inside them; **take the generator as a parameter** instead: `fn roll(rng: &mut impl RngExt)`. Callers who want real randomness pass `rand::rng()`, and tests pass a fixed-seed `StdRng`. That's dependency injection — a good way to make code testable in any language.

> ⚠️ Crate APIs change between versions. In rand 0.8 it was `thread_rng()` and `gen_range`; 0.9 renamed them to `rng()` and `random_range`; 0.10 moved those methods into the `RngExt` trait. Old tutorials — and even code from an AI — may use the old names. **When you get "method not found", check docs.rs for the version you actually use first**; the compiler's `help:` line also often tells you which trait to `use`.

## Task

1. `roll_dice(rng)`: return a random integer from 1 to 6 (inclusive)
2. `shuffled(items, rng)`: return a shuffled **copy**, leaving the original slice untouched
3. `random_password(len, rng)`: build a password from `len` randomly chosen characters of `ALPHABET`

:::hint
`roll_dice`: `rng.random_range(1..=6)`. You can call these methods directly on an `impl RngExt` parameter.
:::

:::hint
`shuffled`: start with `let mut v = items.to_vec();`, then `v.shuffle(rng);`, and return `v`. `rng` is already a `&mut` reference, so pass it straight through.
:::

:::hint
`random_password`: turn the alphabet into a vector of characters, then pick `len` times:
```rust
let chars: Vec<char> = ALPHABET.chars().collect();
(0..len).map(|_| *chars.choose(rng).unwrap()).collect()
```
`choose` returns `Option<&char>`; the alphabet isn't empty, so `unwrap` is safe here.
:::

:::exercise
use rand::RngExt;
use rand::seq::{IndexedRandom, SliceRandom};

const ALPHABET: &str = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/// Roll a die: 1..=6
fn roll_dice(rng: &mut impl RngExt) -> u8 {
    todo!()
}

/// Return a shuffled copy
fn shuffled(items: &[i32], rng: &mut impl RngExt) -> Vec<i32> {
    todo!()
}

/// Pick len random characters from ALPHABET
fn random_password(len: usize, rng: &mut impl RngExt) -> String {
    todo!()
}

fn main() {
    let mut rng = rand::rng();
    let rolls: Vec<u8> = (0..10).map(|_| roll_dice(&mut rng)).collect();
    println!("10 dice rolls: {rolls:?}");
    println!("shuffled: {:?}", shuffled(&[1, 2, 3, 4, 5, 6, 7, 8], &mut rng));
    println!("random password: {}", random_password(12, &mut rng));
}
:::

:::tests
#[cfg(test)]
mod tests {
    use super::*;
    use rand::SeedableRng;
    use rand::rngs::StdRng;

    #[test]
    fn dice_stays_in_range_and_covers_all_faces() {
        let mut rng = StdRng::seed_from_u64(1);
        let mut seen = [false; 7];
        for _ in 0..600 {
            let d = roll_dice(&mut rng);
            assert!((1..=6).contains(&d), "rolled {d}");
            seen[d as usize] = true;
        }
        assert!(seen[1..].iter().all(|&s| s), "every face should appear in 600 rolls");
    }

    #[test]
    fn shuffled_is_a_permutation_and_keeps_original() {
        let original: Vec<i32> = (1..=20).collect();
        let mut rng = StdRng::seed_from_u64(7);
        let s = shuffled(&original, &mut rng);
        assert_ne!(s, original, "20 shuffled elements staying in order is extremely unlikely");
        let mut sorted = s.clone();
        sorted.sort();
        assert_eq!(sorted, original);
        assert_eq!(original, (1..=20).collect::<Vec<i32>>());
    }

    #[test]
    fn password_uses_alphabet_and_is_reproducible() {
        let mut a = StdRng::seed_from_u64(99);
        let mut b = StdRng::seed_from_u64(99);
        let p1 = random_password(16, &mut a);
        let p2 = random_password(16, &mut b);
        assert_eq!(p1.chars().count(), 16);
        assert!(p1.chars().all(|c| ALPHABET.contains(c)));
        assert_eq!(p1, p2, "the same seed should give the same password");
        assert_ne!(p1, random_password(16, &mut a));
        assert_eq!(random_password(0, &mut a), "");
    }
}
:::

:::solution
use rand::RngExt;
use rand::seq::{IndexedRandom, SliceRandom};

const ALPHABET: &str = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/// Roll a die: 1..=6
fn roll_dice(rng: &mut impl RngExt) -> u8 {
    rng.random_range(1..=6)
}

/// Return a shuffled copy
fn shuffled(items: &[i32], rng: &mut impl RngExt) -> Vec<i32> {
    let mut v = items.to_vec();
    v.shuffle(rng);
    v
}

/// Pick len random characters from ALPHABET
fn random_password(len: usize, rng: &mut impl RngExt) -> String {
    let chars: Vec<char> = ALPHABET.chars().collect();
    (0..len).map(|_| *chars.choose(rng).unwrap()).collect()
}

fn main() {
    let mut rng = rand::rng();
    let rolls: Vec<u8> = (0..10).map(|_| roll_dice(&mut rng)).collect();
    println!("10 dice rolls: {rolls:?}");
    println!("shuffled: {:?}", shuffled(&[1, 2, 3, 4, 5, 6, 7, 8], &mut rng));
    println!("random password: {}", random_password(12, &mut rng));
}
:::

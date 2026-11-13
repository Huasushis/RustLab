// 运行器预装的第三方库。版本与官方 Rust Playground 保持一致（https://play.rust-lang.org/meta/crates），
// 这样同一段代码在网页（Playground）、本地运行器、Docker 和本地 cargo 项目里行为相同。
// 更新版本后运行 npm run verify 和 npm run verify -- --playground 确认关卡仍然通过。
export const CRATES = {
  rand: { version: '0.10.3' },
  serde: { version: '1.0.229', features: ['derive'] },
  serde_json: { version: '1.0.154' },
  regex: { version: '1.13.1' },
  anyhow: { version: '1.0.104' },
  thiserror: { version: '2.0.21' },
  itertools: { version: '0.15.0' },
  clap: { version: '4.6.7', features: ['derive'] },
  chrono: { version: '0.4.45' },
};

/** 生成 Cargo.toml 的 [dependencies] 段 */
export function dependenciesToml() {
  const lines = ['[dependencies]'];
  for (const [name, { version, features }] of Object.entries(CRATES)) {
    lines.push(
      features
        ? `${name} = { version = "${version}", features = [${features.map((f) => `"${f}"`).join(', ')}] }`
        : `${name} = "${version}"`,
    );
  }
  return lines.join('\n') + '\n';
}

/** 代码里用到了哪些预装的库 */
export function cratesUsedBy(code) {
  return Object.keys(CRATES).filter((name) =>
    new RegExp(`\\b(use\\s+(::)?${name}\\b|${name}::|extern\\s+crate\\s+${name}\\b)`).test(code),
  );
}

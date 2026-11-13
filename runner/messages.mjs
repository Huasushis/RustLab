// 运行器的提示文字（中 / 英）。返回给网页的报错按请求的 Accept-Language 选择，控制台日志按 LANG 环境变量选择。
const M = {
  zh: {
    noRustc: '无法启动 rustc：{err}\n请先安装 Rust 工具链（https://rustup.rs）。',
    compileTimeout: '编译超时。',
    runTimeout: '运行超过 {s} 秒，已被终止（是不是写了死循环？）',
    noCargo: '没有找到 cargo，无法使用第三方库（请安装 Rust 工具链：https://rustup.rs）',
    cratesFailed: '编译第三方库失败：\n{err}',
    cratesMissing: '编译第三方库后没有找到：{list}',
    preparing: '正在准备第三方库（{list}），首次需要下载编译，请稍候…',
    ready: '第三方库已就绪。',
    noRustfmt: '本机没有找到 rustfmt（rustup component add rustfmt）',
    started: 'RustLab 本地运行器已启动: {url}',
    using: '使用 {v}',
    rustcMissing: '⚠ 没有找到 rustc，请先安装 Rust 工具链: https://rustup.rs',
    origins: '允许的页面来源: {list}',
    anyOrigin: '⚠ 已允许任意来源：任何网页都能让本机执行代码，只应在隔离的容器里这样用',
    howTo: '在 RustLab 的「设置 → 运行环境」里选择"自定义运行器"并填入上面的地址即可。',
    forbiddenOrigin: '来源 {o} 不在允许列表中，请用 --allow-origin {o} 重新启动运行器',
    needJson: 'Content-Type 必须是 application/json',
    needCode: '缺少 code 字段',
    tooLarge: '请求体过大',
  },
  en: {
    noRustc: 'Could not start rustc: {err}\nPlease install the Rust toolchain first (https://rustup.rs).',
    compileTimeout: 'Compilation timed out.',
    runTimeout: 'The program ran for more than {s} seconds and was killed (an infinite loop?)',
    noCargo: 'cargo was not found, so crates are unavailable (install the Rust toolchain: https://rustup.rs)',
    cratesFailed: 'Failed to build the preinstalled crates:\n{err}',
    cratesMissing: 'These crates were missing after the build: {list}',
    preparing: 'Preparing crates ({list}); the first time they are downloaded and compiled, please wait…',
    ready: 'Crates are ready.',
    noRustfmt: 'rustfmt was not found on this machine (rustup component add rustfmt)',
    started: 'RustLab local runner listening on {url}',
    using: 'Using {v}',
    rustcMissing: '⚠ rustc not found. Install the Rust toolchain first: https://rustup.rs',
    origins: 'Allowed page origins: {list}',
    anyOrigin: '⚠ Any origin is allowed: every web page can make this machine run code. Only do this inside an isolated container',
    howTo: 'In RustLab, open Settings → Runner, choose "Custom runner" and enter the address above.',
    forbiddenOrigin: 'Origin {o} is not allowed. Restart the runner with --allow-origin {o}',
    needJson: 'Content-Type must be application/json',
    needCode: 'Missing "code" field',
    tooLarge: 'Request body too large',
  },
};

/** 从 Accept-Language 或 LANG 之类的字符串里挑语言 */
export function pickLang(value) {
  return /^\s*zh/i.test(value ?? '') ? 'zh' : 'en';
}

export const envLang = pickLang(process.env.RUSTLAB_LANG ?? process.env.LANG ?? 'zh');

export function msg(lang, key, vars = {}) {
  let s = (M[lang] ?? M.zh)[key];
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

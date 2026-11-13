// 用本机的 rustc 编译并运行一段 Rust 代码。
// 被 runner/server.mjs（本地运行器）和 scripts/verify-content.ts（内容校验）共用。
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { CRATES, cratesUsedBy, dependenciesToml } from './crates.mjs';

const MAX_OUTPUT = 256 * 1024;

function run(cmd, args, { cwd, timeoutMs, input }) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let child;
    try {
      child = spawn(cmd, args, { cwd, stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'] });
    } catch (err) {
      resolve({ code: -1, stdout, stderr: String(err), timedOut, spawnError: true });
      return;
    }
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);
    const append = (current, chunk) =>
      current.length >= MAX_OUTPUT ? current : (current + chunk.toString('utf8')).slice(0, MAX_OUTPUT);
    child.stdout.on('data', (c) => (stdout = append(stdout, c)));
    child.stderr.on('data', (c) => (stderr = append(stderr, c)));
    if (input !== undefined) {
      child.stdin.on('error', () => {}); // 进程没能启动时忽略 EPIPE
      child.stdin.end(input);
    }
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: `${stderr}${err.message}\n`, timedOut, spawnError: true });
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ code: code ?? -1, signal, stdout, stderr, timedOut });
    });
  });
}

// ---------- 第三方库 ----------
// 做法与官方 Playground 相同：用 cargo 把预装的库编译一次，之后学习者的代码直接用
// rustc --extern 链接这些 .rlib，不必每次都跑 cargo，速度快，也能并发编译。

const CRATES_DIR = process.env.RUSTLAB_CRATES_DIR ?? join(homedir(), '.cache', 'rustlab', 'crates');
const MANIFEST = `[package]\nname = "rustlab-crates"\nversion = "0.0.0"\nedition = "2024"\npublish = false\n\n${dependenciesToml()}`;

/** @type {Promise<{ libDirs: string[], externs: Record<string, string> }> | null} */
let prepared = null;

/**
 * 确保预装库已经编译好，返回 rustc 需要的路径。第一次调用会下载并编译（约十几秒到一两分钟），之后直接读缓存。
 * @param {(msg: string) => void} [log]
 */
export function prepareCrates(log = () => {}) {
  prepared ??= doPrepare(log).catch((err) => {
    prepared = null; // 失败了允许下次重试（例如网络恢复后）
    throw err;
  });
  return prepared;
}

async function doPrepare(log) {
  const cacheFile = join(CRATES_DIR, 'externs.json');
  try {
    const cached = JSON.parse(await readFile(cacheFile, 'utf8'));
    if (cached.manifest === MANIFEST && cached.libDirs && Object.values(cached.externs).every((f) => existsSync(f))) {
      return { libDirs: cached.libDirs, externs: cached.externs };
    }
  } catch {
    /* 没有缓存 */
  }
  log(`正在准备第三方库（${Object.keys(CRATES).join(', ')}），首次需要下载编译，请稍候…`);
  await mkdir(join(CRATES_DIR, 'src'), { recursive: true });
  await writeFile(join(CRATES_DIR, 'Cargo.toml'), MANIFEST);
  await writeFile(join(CRATES_DIR, 'src', 'main.rs'), 'fn main() {}\n');
  const res = await run('cargo', ['build', '--message-format=json'], { cwd: CRATES_DIR, timeoutMs: 20 * 60_000 });
  if (res.spawnError) throw new Error('没有找到 cargo，无法使用第三方库（请安装 Rust 工具链：https://rustup.rs）');
  if (res.code !== 0) throw new Error(`编译第三方库失败：\n${res.stderr.slice(-3000)}`);

  // 不同版本的 cargo 产物目录布局不同（旧版集中在 target/debug/deps，新版每个库一个目录），
  // 所以从 cargo 的 JSON 输出里收集每个产物（包括间接依赖和过程宏）实际所在的目录
  const externs = {};
  const libDirs = new Set();
  for (const line of res.stdout.split('\n')) {
    if (!line.startsWith('{')) continue;
    const msg = JSON.parse(line);
    if (msg.reason !== 'compiler-artifact') continue;
    for (const f of msg.filenames) libDirs.add(dirname(f));
    const name = msg.target.name.replace(/-/g, '_');
    const rlib = msg.filenames.find((f) => f.endsWith('.rlib'));
    if (name in CRATES && rlib) externs[name] = rlib;
  }
  const missing = Object.keys(CRATES).filter((n) => !externs[n]);
  if (missing.length) throw new Error(`编译第三方库后没有找到：${missing.join(', ')}`);
  const result = { libDirs: [...libDirs], externs };
  await writeFile(cacheFile, JSON.stringify({ manifest: MANIFEST, ...result }, null, 2));
  log('第三方库已就绪。');
  return result;
}

/**
 * @param {{ code: string, tests?: boolean, edition?: string, compileTimeoutMs?: number, runTimeoutMs?: number }} req
 * @returns {Promise<{ success: boolean, stdout: string, stderr: string, exitDetail: string }>}
 */
export async function compileAndRun({
  code,
  tests = false,
  edition = '2024',
  compileTimeoutMs = 60_000,
  runTimeoutMs = 10_000,
}) {
  const dir = await mkdtemp(join(tmpdir(), 'rustlab-'));
  try {
    await mkdir(join(dir, 'src'));
    // 与官方 Playground 保持同样的相对路径，报错里的位置都是 src/main.rs:行:列
    await writeFile(join(dir, 'src', 'main.rs'), code);
    const bin = join(dir, process.platform === 'win32' ? 'playground.exe' : 'playground');
    const args = ['--edition', edition, '--color', 'never', '--crate-name', 'playground', '-C', 'debuginfo=0', '-o', bin];
    if (tests) args.push('--test');
    if (cratesUsedBy(code).length > 0) {
      let libs;
      try {
        libs = await prepareCrates();
      } catch (err) {
        return { success: false, stdout: '', stderr: String(err instanceof Error ? err.message : err), exitDetail: 'crates unavailable' };
      }
      for (const dir of libs.libDirs) args.push('-L', `dependency=${dir}`);
      for (const [name, file] of Object.entries(libs.externs)) args.push('--extern', `${name}=${file}`);
    }
    args.push(join('src', 'main.rs'));

    const compile = await run('rustc', args, { cwd: dir, timeoutMs: compileTimeoutMs });
    if (compile.spawnError) {
      return {
        success: false,
        stdout: '',
        stderr: `无法启动 rustc：${compile.stderr}\n请先安装 Rust 工具链（https://rustup.rs）。`,
        exitDetail: 'rustc not found',
      };
    }
    if (compile.timedOut) {
      return { success: false, stdout: '', stderr: `${compile.stderr}\n编译超时。`, exitDetail: 'compile timeout' };
    }
    if (compile.code !== 0) {
      return { success: false, stdout: '', stderr: compile.stderr, exitDetail: `rustc exited with ${compile.code}` };
    }

    const exec = await run(bin, [], { cwd: dir, timeoutMs: runTimeoutMs });
    let stderr = compile.stderr + exec.stderr;
    if (exec.timedOut) stderr += `\n运行超过 ${runTimeoutMs / 1000} 秒，已被终止（是不是写了死循环？）\n`;
    return {
      success: exec.code === 0 && !exec.timedOut,
      stdout: exec.stdout,
      stderr,
      exitDetail: exec.timedOut ? 'run timeout' : `Exited with status ${exec.code}`,
    };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function rustcVersion() {
  const res = await run('rustc', ['--version'], { cwd: tmpdir(), timeoutMs: 10_000 });
  return res.code === 0 ? res.stdout.trim() : null;
}

/** 用 rustfmt 格式化代码；本机没有 rustfmt 时返回失败 */
export async function formatCode(code, edition = '2024') {
  const res = await run('rustfmt', ['--edition', edition, '--color', 'never'], {
    cwd: tmpdir(),
    timeoutMs: 15_000,
    input: code,
  });
  if (res.spawnError) {
    return { success: false, code: '', stdout: '', stderr: '本机没有找到 rustfmt（rustup component add rustfmt）' };
  }
  return { success: res.code === 0, code: res.code === 0 ? res.stdout : '', stdout: '', stderr: res.stderr };
}

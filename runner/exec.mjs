// 用本机的 rustc 编译并运行一段 Rust 代码。
// 被 runner/server.mjs（本地运行器）和 scripts/verify-content.ts（内容校验）共用。
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

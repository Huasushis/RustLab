// 判题逻辑与编译器输出解析。纯函数、无浏览器依赖：前端与 scripts/verify-content.ts 共用。
import { t } from '../i18n/index.ts';
import type { Level } from './parser.ts';

export const RUST_EDITION = '2024';
/** 关卡里隐藏判题测试所在的模块名（用于和学习者自己写的测试区分开） */
export const HIDDEN_TEST_MODULE = 'rustlab_checks';

export interface ExecRequest {
  code: string;
  /** true：以 `cargo test` 方式编译运行；false：运行 main */
  tests: boolean;
}

export interface ExecResult {
  success: boolean;
  stdout: string;
  stderr: string;
}

export type Executor = (req: ExecRequest) => Promise<ExecResult>;

export interface TestResult {
  name: string;
  status: 'ok' | 'failed' | 'ignored';
  detail: string;
}

export interface Diagnostic {
  severity: 'error' | 'warning';
  code: string | null;
  message: string;
  line: number;
  col: number;
}

export interface Outcome {
  kind: 'run' | 'check';
  passed: boolean;
  /** 一句话结论，显示在结果横幅上 */
  summary: string;
  stdout: string;
  stderr: string;
  tests: TestResult[];
  diagnostics: Diagnostic[];
  /** 运行模式下输出不匹配时，给出期望输出用于对比 */
  expected: string | null;
}

/** 去掉 cargo 的进度行，只留下对学习者有用的编译器信息 */
export function cleanStderr(stderr: string): string {
  return stderr
    .split('\n')
    .filter(
      (l) =>
        !/^\s*(Compiling|Finished|Running|Blocking|Downloaded|Downloading) /.test(l) &&
        !/^(warning|error): `?playground`? /.test(l) &&
        !/^error: could not compile `playground`/.test(l),
    )
    .join('\n')
    .replace(/^\n+/, '')
    .replace(/\n{3,}/g, '\n\n');
}

const HEADER = /^(error|warning)(?:\[(E\d+)\])?: (.+)$/;
const LOCATION = /^\s*--> (?:src\/)?main\.rs:(\d+):(\d+)/;
const PANIC = /^thread '.*?'(?: \(\d+\))? panicked at (?:src\/)?main\.rs:(\d+):(\d+):$/;

/**
 * 从 rustc / panic 的文本输出里提取可定位的诊断。
 * `userLines` 是学习者代码的行数：落在其后的位置属于追加的测试代码，不标到编辑器里。
 */
export function parseDiagnostics(text: string, userLines: number): Diagnostic[] {
  const out: Diagnostic[] = [];
  const lines = text.split('\n');
  let pending: Omit<Diagnostic, 'line' | 'col'> | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const header = HEADER.exec(line);
    if (header) {
      pending = { severity: header[1] as Diagnostic['severity'], code: header[2] ?? null, message: header[3] };
      continue;
    }
    const loc = LOCATION.exec(line);
    if (loc && pending) {
      const ln = Number(loc[1]);
      if (ln <= userLines) out.push({ ...pending, line: ln, col: Number(loc[2]) });
      pending = null;
      continue;
    }
    const panic = PANIC.exec(line);
    if (panic) {
      const ln = Number(panic[1]);
      if (ln <= userLines) {
        out.push({
          severity: 'error',
          code: null,
          message: `panic: ${(lines[i + 1] ?? '').trim()}`,
          line: ln,
          col: Number(panic[2]),
        });
      }
    }
  }
  return out;
}

/** 解析 libtest 的输出：每个测试的结果，以及失败测试的详细信息 */
export function parseTests(stdout: string): TestResult[] {
  const results: TestResult[] = [];
  const byName = new Map<string, TestResult>();
  const lines = stdout.split('\n');
  for (const line of lines) {
    const m = /^test (.+?)(?: - should panic)? \.\.\. (ok|FAILED|ignored)/.exec(line);
    if (m) {
      const r: TestResult = { name: m[1], status: m[2] === 'FAILED' ? 'failed' : (m[2] as 'ok' | 'ignored'), detail: '' };
      results.push(r);
      byName.set(r.name, r);
    }
  }
  let current: TestResult | null = null;
  const buf: string[] = [];
  const flush = () => {
    if (current) current.detail = buf.join('\n').trim();
    buf.length = 0;
    current = null;
  };
  for (const line of lines) {
    const m = /^---- (.+?) stdout ----$/.exec(line);
    if (m) {
      flush();
      current = byName.get(m[1]) ?? null;
    } else if (/^failures:$/.test(line)) {
      flush();
    } else if (current) {
      if (!/RUST_BACKTRACE/.test(line)) buf.push(line);
    }
  }
  flush();
  return results;
}

/** 粗略去掉注释，避免注释里的文字触发 forbid 检查 */
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

const normalize = (s: string) =>
  s
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .trim();

function countLines(code: string): number {
  return code.split('\n').length;
}

/** 只运行学习者的代码（不判题） */
export async function runCode(code: string, exec: Executor): Promise<Outcome> {
  const res = await exec({ code, tests: false });
  const stderr = cleanStderr(res.stderr);
  return {
    kind: 'run',
    passed: res.success,
    summary: res.success ? t('check.runDone') : stderr.includes('panicked at') ? t('check.panic') : t('check.compileFailed'),
    stdout: res.stdout,
    stderr,
    tests: [],
    diagnostics: parseDiagnostics(stderr, countLines(code)),
    expected: null,
  };
}

/** 判题：通过返回 passed=true */
export async function checkLevel(level: Level, code: string, exec: Executor): Promise<Outcome> {
  const base = { kind: 'check' as const, stdout: '', stderr: '', tests: [], diagnostics: [], expected: null };
  const stripped = stripComments(code);
  for (const f of level.forbid) {
    // 关键字（如 for）按完整单词匹配，免得 format! 被误判；其它片段（如 .clone()）按子串匹配
    const hit = /^\w+$/.test(f) ? new RegExp(`\\b${f}\\b`).test(stripped) : stripped.includes(f);
    if (hit) {
      return { ...base, passed: false, summary: t('check.forbidden', { f }) };
    }
  }

  const userLines = countLines(code);
  if (level.mode === 'test') {
    const full = level.tests ? `${code}\n\n${level.tests}\n` : code;
    const res = await exec({ code: full, tests: true });
    const stderr = cleanStderr(res.stderr);
    const tests = parseTests(res.stdout);
    const failed = tests.filter((t) => t.status === 'failed').length;
    const ok = tests.filter((t) => t.status === 'ok').length;
    // min_tests 只统计学习者自己写的测试：隐藏的判题测试放在 rustlab_checks 模块里
    const own = tests.filter((t) => t.status === 'ok' && !t.name.startsWith(`${HIDDEN_TEST_MODULE}::`)).length;
    const need = Math.max(1, level.minTests);
    let passed = res.success && failed === 0 && ok >= need;
    let summary: string;
    if (tests.length === 0 && !res.success) summary = t('check.compileFailedHint');
    else if (failed > 0) summary = t('check.testsFailed', { total: tests.length, failed });
    else if (level.minTests > 0 && own < level.minTests) {
      passed = false;
      summary = t('check.needOwnTests', { need: level.minTests, own });
    } else if (ok < need) {
      passed = false;
      summary = t('check.noTests');
    } else if (!res.success) summary = t('check.testCrash');
    else summary = t('check.allTestsPassed', { n: ok });
    return {
      ...base,
      passed,
      summary,
      stdout: res.stdout,
      stderr,
      tests,
      diagnostics: parseDiagnostics(`${stderr}\n${res.stdout}`, userLines),
    };
  }

  const res = await exec({ code, tests: false });
  const stderr = cleanStderr(res.stderr);
  const diagnostics = parseDiagnostics(stderr, userLines);
  if (!res.success) {
    return {
      ...base,
      passed: false,
      summary: stderr.includes('panicked at') ? t('check.panic') : t('check.compileFailedHint'),
      stdout: res.stdout,
      stderr,
      diagnostics,
    };
  }
  if (level.expect !== null && normalize(res.stdout) !== normalize(level.expect)) {
    return {
      ...base,
      passed: false,
      summary: t('check.wrongOutput'),
      stdout: res.stdout,
      stderr,
      diagnostics,
      expected: level.expect,
    };
  }
  return { ...base, passed: true, summary: t('check.outputOk'), stdout: res.stdout, stderr, diagnostics };
}

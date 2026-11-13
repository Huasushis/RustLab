// 代码运行环境。三种方式的请求格式完全一样（都兼容 play.rust-lang.org 的 /execute 接口）：
//   playground  浏览器直接请求官方 Playground（它允许跨域），零配置
//   proxy       经由本站 Cloudflare Pages Function 转发到官方 Playground（官方地址访问不畅时使用）
//   custom      自己的运行器：runner/server.mjs（本机 / Docker / Codespaces）
import { getLang, t } from '../i18n/index.ts';
import { RUST_EDITION, type ExecRequest, type ExecResult, type Executor } from './check.ts';
import type { Settings } from './storage.ts';

const PLAYGROUND = 'https://play.rust-lang.org';
const PROXY = 'api/rust'; // 相对路径：兼容部署在子目录下

export function runnerBase(s: Settings): string {
  switch (s.runner) {
    case 'playground':
      return PLAYGROUND;
    case 'proxy':
      return PROXY;
    case 'custom':
      return s.runnerUrl.replace(/\/+$/, '');
  }
}

export function runnerLabel(s: Settings): string {
  switch (s.runner) {
    case 'playground':
      return t('runner.labelPlayground');
    case 'proxy':
      return import.meta.env.DEV ? t('runner.labelDevProxy') : t('runner.labelProxy');
    case 'custom':
      return t('runner.labelCustom', { url: s.runnerUrl });
  }
}

async function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      // 自定义运行器会根据 Accept-Language 选择报错信息的语言
      headers: { 'Content-Type': 'application/json', 'Accept-Language': getLang() },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new Error(t('runner.unreachable', { url }));
  }
  if (res.status === 429) throw new Error(t('runner.tooMany'));
  if (!res.ok) {
    let detail = '';
    try {
      const j = (await res.json()) as { error?: string };
      detail = j.error ?? '';
    } catch {
      /* ignore */
    }
    throw new Error(`${t('runner.httpError', { status: res.status })}${detail ? `: ${detail}` : ''}`);
  }
  return (await res.json()) as T;
}

export function makeExecutor(s: Settings, signal?: AbortSignal): Executor {
  const base = runnerBase(s);
  return async (req: ExecRequest): Promise<ExecResult> => {
    const res = await postJson<ExecResult & { error?: string }>(
      `${base}/execute`,
      {
        channel: 'stable',
        mode: 'debug',
        edition: RUST_EDITION,
        crateType: 'bin',
        tests: req.tests,
        code: req.code,
        backtrace: false,
      },
      signal,
    );
    if (res.error) throw new Error(res.error);
    return { success: res.success, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
  };
}

/** 用 rustfmt 格式化代码（官方 Playground 和本站代理支持；自定义运行器需要本机装有 rustfmt） */
export async function formatCode(s: Settings, code: string): Promise<string> {
  const res = await postJson<{ success: boolean; code?: string; stderr?: string; error?: string }>(
    `${runnerBase(s)}/format`,
    { channel: 'stable', edition: RUST_EDITION, code },
  );
  if (!res.success || typeof res.code !== 'string') {
    throw new Error(res.error ?? (res.stderr?.trim() || t('runner.formatFailed')));
  }
  return res.code;
}

/** 检查运行环境是否可用，返回一段描述 */
export async function probeRunner(s: Settings): Promise<string> {
  if (s.runner === 'custom') {
    const res = await fetch(`${runnerBase(s)}/health`).catch(() => {
      throw new Error(t('runner.customDown', { url: s.runnerUrl }));
    });
    if (!res.ok) throw new Error(t('runner.httpError', { status: res.status }));
    const j = (await res.json()) as { rustc?: string | null };
    if (!j.rustc) throw new Error(t('runner.noRustc'));
    return j.rustc;
  }
  const exec = makeExecutor(s);
  const r = await exec({ code: 'fn main() { println!("ok"); }', tests: false });
  if (!r.success || r.stdout.trim() !== 'ok') throw new Error(t('runner.unexpected'));
  return t('runner.ok');
}

/** 在官方 Playground 中打开当前代码的链接 */
export function playgroundLink(code: string): string {
  return `${PLAYGROUND}/?version=stable&mode=debug&edition=${RUST_EDITION}&code=${encodeURIComponent(code)}`;
}

import { t } from '../i18n/index.ts';
// 本地持久化：设置、进度、代码草稿。全部存在浏览器 localStorage 里，不上传任何地方。

export type RunnerKind = 'playground' | 'proxy' | 'custom';
export type LlmProvider = 'none' | 'anthropic' | 'openai';
export type Theme = 'system' | 'dark' | 'light';
export type LangSetting = 'auto' | 'zh' | 'en';

export interface Settings {
  lang: LangSetting;
  theme: Theme;
  fontSize: number;
  runner: RunnerKind;
  /** 自定义运行器地址，例如 http://127.0.0.1:7878 */
  runnerUrl: string;
  llm: {
    provider: LlmProvider;
    baseUrl: string;
    model: string;
    apiKey: string;
    /** 经由本站的 /api/llm 代理转发（解决部分服务商不支持浏览器跨域的问题） */
    useProxy: boolean;
  };
}

export const DEFAULT_SETTINGS: Settings = {
  lang: 'auto',
  theme: 'system',
  fontSize: 14,
  // npm run dev:local 时默认走开发服务器转发到本机 rustc
  runner: import.meta.env.VITE_DEFAULT_RUNNER === 'proxy' ? 'proxy' : 'playground',
  runnerUrl: 'http://127.0.0.1:7878',
  llm: { provider: 'none', baseUrl: '', model: '', apiKey: '', useProxy: false },
};

const KEY_SETTINGS = 'rustlab:settings';
const KEY_PROGRESS = 'rustlab:progress';
const KEY_HINTS = 'rustlab:hints';
const codeKey = (id: string) => `rustlab:code:${id}`;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 隐私模式或存储已满：静默忽略，页面照常可用
  }
}

export function loadSettings(): Settings {
  const s = read<Partial<Settings>>(KEY_SETTINGS) ?? {};
  return { ...DEFAULT_SETTINGS, ...s, llm: { ...DEFAULT_SETTINGS.llm, ...(s.llm ?? {}) } };
}

export function saveSettings(s: Settings): void {
  write(KEY_SETTINGS, s);
}

/** 关卡 ID -> 通关时间戳 */
export type Progress = Record<string, number>;

export function loadProgress(): Progress {
  return read<Progress>(KEY_PROGRESS) ?? {};
}

export function saveProgress(p: Progress): void {
  write(KEY_PROGRESS, p);
}

/** 关卡 ID -> 已解锁的提示数量 */
export function loadHints(): Record<string, number> {
  return read<Record<string, number>>(KEY_HINTS) ?? {};
}

export function saveHints(h: Record<string, number>): void {
  write(KEY_HINTS, h);
}

export function loadCode(id: string): string | null {
  try {
    return localStorage.getItem(codeKey(id));
  } catch {
    return null;
  }
}

export function saveCode(id: string, code: string): void {
  try {
    localStorage.setItem(codeKey(id), code);
  } catch {
    /* ignore */
  }
}

export function clearCode(id: string): void {
  try {
    localStorage.removeItem(codeKey(id));
  } catch {
    /* ignore */
  }
}

/** 导出全部学习数据（不含 API Key），用于换设备或备份 */
export function exportData(): string {
  const data: Record<string, unknown> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (k.startsWith('rustlab:') && k !== KEY_SETTINGS) data[k] = localStorage.getItem(k);
    }
  } catch {
    /* ignore */
  }
  return JSON.stringify({ app: 'rustlab', version: 1, data }, null, 2);
}

export function importData(json: string): number {
  const parsed = JSON.parse(json) as { app?: string; data?: Record<string, string> };
  if (parsed.app !== 'rustlab' || !parsed.data) throw new Error(t('storage.badFile'));
  let n = 0;
  for (const [k, v] of Object.entries(parsed.data)) {
    if (k.startsWith('rustlab:') && k !== KEY_SETTINGS && typeof v === 'string') {
      localStorage.setItem(k, v);
      n++;
    }
  }
  return n;
}

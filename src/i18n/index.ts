// 界面多语言。新增语言：复制 en.ts，翻译后在 DICTS 和 LANGS 里登记即可（关卡内容见 README）。
import { en } from './en.ts';
import { zh, type Messages } from './zh.ts';

export type Lang = 'zh' | 'en';

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'zh', label: '简体中文' },
  { id: 'en', label: 'English' },
];

const DICTS: Record<Lang, Messages> = { zh, en };

let current: Lang = 'zh';

export function setLang(lang: Lang): void {
  current = lang;
  if (typeof document !== 'undefined') document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
}

export function getLang(): Lang {
  return current;
}

/** 根据浏览器语言猜一个默认值 */
export function detectLang(): Lang {
  const langs = typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language];
  for (const l of langs) {
    if (/^zh\b/i.test(l)) return 'zh';
    if (/^en\b/i.test(l)) return 'en';
  }
  return 'en';
}

export type MessageKey = keyof Messages;

/** 取一条界面文字；{name} 形式的占位符用 vars 替换 */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  let s: string = DICTS[current][key] ?? zh[key];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

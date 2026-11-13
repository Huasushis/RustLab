// AI 助教：可选功能，使用学习者自己填写的 API Key，直接从浏览器调用模型服务。
// 支持两类接口：
//   anthropic  Claude（官方 SDK）
//   openai     任何 OpenAI 兼容的 /chat/completions 接口：DeepSeek、通义千问、Kimi、智谱、
//              硅基流动、OpenRouter、Gemini、本地 Ollama、自建的 one-api / LiteLLM 网关……
import { getLang, t } from '../i18n/index.ts';
import type { Settings } from './storage.ts';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ProviderPreset {
  id: string;
  label: { zh: string; en: string };
  provider: 'anthropic' | 'openai';
  baseUrl: string;
  model: string;
  note?: { zh: string; en: string };
}

// 预设只用来填默认值，模型名随时可能更新，用户可以在设置里修改，或点「获取模型列表」
export const PRESETS: ProviderPreset[] = [
  {
    id: 'anthropic',
    label: { zh: 'Claude（Anthropic）', en: 'Claude (Anthropic)' },
    provider: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-opus-5-5',
    note: { zh: '官方 SDK，支持浏览器直连。', en: 'Official SDK, works directly from the browser.' },
  },
  {
    id: 'deepseek',
    label: { zh: 'DeepSeek', en: 'DeepSeek' },
    provider: 'openai',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    note: { zh: '价格低，中文好。', en: 'Inexpensive, strong in Chinese.' },
  },
  {
    id: 'qwen',
    label: { zh: '通义千问（阿里云百炼）', en: 'Qwen (Alibaba Cloud)' },
    provider: 'openai',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    note: { zh: '新用户有免费额度。', en: 'Free quota for new users.' },
  },
  {
    id: 'zhipu',
    label: { zh: '智谱 GLM', en: 'Zhipu GLM' },
    provider: 'openai',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
    note: { zh: '提供免费模型。', en: 'Offers free models.' },
  },
  {
    id: 'moonshot',
    label: { zh: 'Kimi（月之暗面）', en: 'Kimi (Moonshot)' },
    provider: 'openai',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
  },
  {
    id: 'siliconflow',
    label: { zh: '硅基流动 SiliconFlow', en: 'SiliconFlow' },
    provider: 'openai',
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'Qwen/Qwen2.5-7B-Instruct',
    note: { zh: '部分开源模型免费。', en: 'Some open models are free.' },
  },
  {
    id: 'openrouter',
    label: { zh: 'OpenRouter', en: 'OpenRouter' },
    provider: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'deepseek/deepseek-chat',
    note: {
      zh: '一个 Key 调用多家模型，有免费模型（名字以 :free 结尾）。',
      en: 'One key for many providers; free models end with :free.',
    },
  },
  {
    id: 'gemini',
    label: { zh: 'Google Gemini', en: 'Google Gemini' },
    provider: 'openai',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.5-flash',
    note: { zh: '有免费额度。', en: 'Has a free tier.' },
  },
  {
    id: 'ollama',
    label: { zh: '本地 Ollama', en: 'Local Ollama' },
    provider: 'openai',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: 'qwen2.5-coder:7b',
    note: {
      zh: '完全离线、免费。需要用 OLLAMA_ORIGINS=* ollama serve 启动以允许网页访问。',
      en: 'Fully offline and free. Start it with OLLAMA_ORIGINS=* ollama serve so web pages may call it.',
    },
  },
  {
    id: 'openai',
    label: { zh: 'OpenAI', en: 'OpenAI' },
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
];

export function llmConfigured(s: Settings): boolean {
  const l = s.llm;
  if (l.provider === 'none' || !l.model.trim() || !l.baseUrl.trim()) return false;
  // 本地模型通常不需要 Key
  return Boolean(l.apiKey.trim()) || isLocalUrl(l.baseUrl);
}

function isLocalUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?/.test(url);
}

/** 走本站代理时，把 https://host/path 改写成 <站点>/api/llm/host/path */
export function effectiveBaseUrl(s: Settings): string {
  const base = s.llm.baseUrl.trim().replace(/\/+$/, '');
  if (!s.llm.useProxy || isLocalUrl(base)) return base;
  const u = new URL(base);
  return new URL(`api/llm/${u.host}${u.pathname}`, document.baseURI).toString().replace(/\/+$/, '');
}

export interface TutorContext {
  levelTitle?: string;
  lesson?: string;
  code: string;
  output?: string;
}

const PROMPT = {
  zh: {
    intro: [
      '你是 RustLab 的 Rust 助教。学习者有 C++ 或 Python 基础，正在通过闯关学习 Rust。',
      '用简体中文回答，简洁、具体，必要时拿 C++ / Python 做类比。代码块请标注 rust 语言。',
      '引导学习者自己想明白：优先解释编译错误的含义、指出思路和相关概念，给出关键的一两行代码即可。',
      '除非学习者明确要求「直接给答案」，否则不要贴出整关的完整解答。',
      '如果学习者的问题和当前关卡无关，也照常回答 Rust 相关的问题。',
    ],
    level: '当前关卡',
    playground: '学习者现在在自由练习区，没有具体的关卡任务。',
    code: '学习者当前的代码',
    output: '最近一次运行 / 检查的输出',
  },
  en: {
    intro: [
      'You are the Rust tutor of RustLab. The learner already knows C++ or Python and is learning Rust through hands-on levels.',
      'Answer in English. Be concise and concrete, and draw analogies to C++ / Python when helpful. Tag code blocks with rust.',
      'Help the learner figure things out: explain what compiler errors mean, point out the idea and the relevant concepts, and show only the key line or two of code.',
      'Unless the learner explicitly asks for the answer, do not paste a complete solution to the level.',
      "If the question isn't about the current level, answer it anyway as long as it's about Rust.",
    ],
    level: 'Current level',
    playground: 'The learner is in the free playground; there is no specific task.',
    code: "The learner's current code",
    output: 'Output of the latest run / check',
  },
};

export function buildSystemPrompt(ctx: TutorContext): string {
  const p = PROMPT[getLang()];
  const parts = [...p.intro];
  if (ctx.levelTitle) {
    parts.push(`\n## ${p.level}: ${ctx.levelTitle}\n\n<lesson>\n${ctx.lesson ?? ''}\n</lesson>`);
  } else {
    parts.push(`\n${p.playground}`);
  }
  parts.push(`\n## ${p.code}\n\n\`\`\`rust\n${ctx.code}\n\`\`\``);
  if (ctx.output?.trim()) {
    parts.push(`\n## ${p.output}\n\n\`\`\`text\n${ctx.output.slice(0, 6000)}\n\`\`\``);
  }
  return parts.join('\n');
}

export interface StreamHandlers {
  onText: (delta: string) => void;
  signal: AbortSignal;
}

export async function streamChat(
  s: Settings,
  system: string,
  messages: ChatMessage[],
  h: StreamHandlers,
): Promise<void> {
  if (s.llm.provider === 'anthropic') {
    // Claude 的 SDK 体积较大，只有用到时才加载
    const { streamAnthropic } = await import('./anthropic.ts');
    return streamAnthropic(s.llm.apiKey.trim(), effectiveBaseUrl(s), s.llm.model.trim(), system, messages, h);
  }
  if (s.llm.provider === 'openai') return streamOpenAI(s, system, messages, h);
  throw new Error(t('llm.notConfigured'));
}

function openaiHeaders(s: Settings): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (s.llm.apiKey.trim()) headers.Authorization = `Bearer ${s.llm.apiKey.trim()}`;
  return headers;
}

async function request(url: string, init: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    if (init.signal?.aborted) throw err;
    throw new Error(t('llm.corsFailed'));
  }
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 500) || res.statusText}`);
  }
  return res;
}

async function streamOpenAI(s: Settings, system: string, messages: ChatMessage[], h: StreamHandlers) {
  const res = await request(`${effectiveBaseUrl(s)}/chat/completions`, {
    method: 'POST',
    headers: openaiHeaders(s),
    body: JSON.stringify({
      model: s.llm.model.trim(),
      stream: true,
      messages: [{ role: 'system', content: system }, ...messages],
    }),
    signal: h.signal,
  });

  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') return;
      try {
        const json = JSON.parse(data) as {
          choices?: { delta?: { content?: string | null } }[];
          error?: { message?: string };
        };
        if (json.error) throw new Error(json.error.message ?? t('llm.serviceError'));
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) h.onText(delta);
      } catch (err) {
        if (err instanceof SyntaxError) continue; // 不完整或非 JSON 的行，跳过
        throw err;
      }
    }
  }
}

/** 列出服务商提供的模型（OpenAI 格式的 GET /models；Anthropic 用官方 SDK） */
export async function listModels(s: Settings): Promise<string[]> {
  if (s.llm.provider === 'anthropic') {
    const { listAnthropicModels } = await import('./anthropic.ts');
    return listAnthropicModels(s.llm.apiKey.trim(), effectiveBaseUrl(s));
  }
  const res = await request(`${effectiveBaseUrl(s)}/models`, { headers: openaiHeaders(s) });
  const json = (await res.json()) as { data?: { id: string }[]; models?: { id?: string; name?: string }[] };
  const ids = (json.data ?? json.models ?? []).map((m) => ('id' in m && m.id ? m.id : (m as { name?: string }).name ?? ''));
  return ids.filter(Boolean).sort();
}

export function describeLlmError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

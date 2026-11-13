// Claude（Anthropic 官方 SDK）。由 llm.ts 按需动态加载。
import Anthropic from '@anthropic-ai/sdk';
import { t } from '../i18n/index.ts';
import type { ChatMessage, StreamHandlers } from './llm.ts';

function client(apiKey: string, baseURL: string): Anthropic {
  return new Anthropic({
    apiKey,
    baseURL,
    // Key 由学习者自己填写、只保存在自己的浏览器里，所以允许浏览器直连
    dangerouslyAllowBrowser: true,
    maxRetries: 1,
  });
}

export async function streamAnthropic(
  apiKey: string,
  baseURL: string,
  model: string,
  system: string,
  messages: ChatMessage[],
  h: StreamHandlers,
): Promise<void> {
  try {
    const stream = client(apiKey, baseURL).beta.messages.stream(
      {
        model,
        max_tokens: 16000,
        system,
        messages,
        // 安全分类器拒答时，由服务端自动换用合适的模型继续回答；不支持的模型会忽略此参数
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      },
      { signal: h.signal },
    );
    stream.on('text', (delta) => h.onText(delta));
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') {
      h.onText(`\n\n> ${t('llm.refusal')}`);
    } else if (final.stop_reason === 'max_tokens') {
      h.onText(`\n\n> ${t('llm.truncated')}`);
    }
  } catch (err) {
    throw new Error(describe(err), { cause: err });
  }
}

export async function listAnthropicModels(apiKey: string, baseURL: string): Promise<string[]> {
  try {
    const ids: string[] = [];
    for await (const m of client(apiKey, baseURL).models.list()) ids.push(m.id);
    return ids;
  } catch (err) {
    throw new Error(describe(err), { cause: err });
  }
}

function describe(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return t('llm.authError');
  if (err instanceof Anthropic.PermissionDeniedError) return t('llm.permissionError');
  if (err instanceof Anthropic.NotFoundError) return t('llm.notFound');
  if (err instanceof Anthropic.RateLimitError) return t('llm.rateLimit');
  if (err instanceof Anthropic.APIConnectionError) return t('llm.connection');
  if (err instanceof Anthropic.APIError) return t('llm.apiError', { message: err.message });
  return err instanceof Error ? err.message : String(err);
}

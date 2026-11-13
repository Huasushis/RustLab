// Claude（Anthropic 官方 SDK）。由 llm.ts 按需动态加载。
import Anthropic from '@anthropic-ai/sdk';
import type { ChatMessage, StreamHandlers } from './llm.ts';

export async function streamAnthropic(
  apiKey: string,
  baseURL: string,
  model: string,
  system: string,
  messages: ChatMessage[],
  h: StreamHandlers,
): Promise<void> {
  const client = new Anthropic({
    apiKey,
    baseURL,
    // Key 由学习者自己填写、只保存在自己的浏览器里，所以允许浏览器直连
    dangerouslyAllowBrowser: true,
    maxRetries: 1,
  });
  try {
    const stream = client.beta.messages.stream(
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
      h.onText('\n\n> 模型拒绝回答了这个请求，换个问法试试。');
    } else if (final.stop_reason === 'max_tokens') {
      h.onText('\n\n> （回答达到长度上限，被截断了）');
    }
  } catch (err) {
    throw new Error(describe(err), { cause: err });
  }
}

function describe(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return 'API Key 无效，请到「设置」里检查。';
  if (err instanceof Anthropic.PermissionDeniedError) return '这个 API Key 没有调用该模型的权限。';
  if (err instanceof Anthropic.NotFoundError) return '找不到这个模型，请检查模型名。';
  if (err instanceof Anthropic.RateLimitError) return '请求太频繁或额度不足，请稍后再试。';
  if (err instanceof Anthropic.APIConnectionError) {
    return '连接不上模型服务，请检查网络或 Base URL；也可以试试「通过本站代理」。';
  }
  if (err instanceof Anthropic.APIError) return `模型服务返回错误：${err.message}`;
  return err instanceof Error ? err.message : String(err);
}

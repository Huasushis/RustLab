import { useEffect, useRef, useState } from 'react';
import { describeLlmError, llmConfigured, streamChat, type ChatMessage } from '../lib/llm.ts';
import type { Settings } from '../lib/storage.ts';
import { IconSend, IconSparkle, IconStop, IconTrash } from './Icons.tsx';
import { Markdown } from './Markdown.tsx';

interface Props {
  settings: Settings;
  messages: ChatMessage[];
  onMessages(m: ChatMessage[]): void;
  /** 每次调用时现取：系统提示里带上当前关卡、代码和最近的输出 */
  buildSystem(): string;
  /** 外部（例如输出面板的「问问 AI」）塞进来的问题，会被自动发送 */
  pending: string | null;
  onPendingConsumed(): void;
  onOpenSettings(): void;
  contextLabel: string;
}

const QUICK = [
  '我卡住了，给我一点思路（先别给完整答案）',
  '帮我解释一下最近这次的报错',
  '我的代码哪里可以写得更地道？',
  '这一关的知识点，用 C++ / Python 类比讲一下',
];

export function ChatPanel(props: Props) {
  const { settings, messages, onMessages } = props;
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const ready = llmConfigured(settings);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [messages]);

  useEffect(() => () => abort.current?.abort(), []);

  async function send(text: string) {
    const q = text.trim();
    if (!q || streaming || !ready) return;
    setError(null);
    setInput('');
    const history: ChatMessage[] = [...messages, { role: 'user', content: q }];
    let answer = '';
    onMessages([...history, { role: 'assistant', content: '' }]);
    const ac = new AbortController();
    abort.current = ac;
    setStreaming(true);
    try {
      await streamChat(settings, props.buildSystem(), history, {
        signal: ac.signal,
        onText: (d) => {
          answer += d;
          onMessages([...history, { role: 'assistant', content: answer }]);
        },
      });
    } catch (err) {
      if (!ac.signal.aborted) setError(describeLlmError(err));
    } finally {
      setStreaming(false);
      abort.current = null;
      // 没有收到任何内容时，去掉空的回答气泡
      if (!answer) onMessages(history);
    }
  }

  useEffect(() => {
    if (props.pending && ready && !streaming) {
      const p = props.pending;
      props.onPendingConsumed();
      void send(p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.pending, ready]);

  if (!ready) {
    return (
      <div className="chat">
        <div className="panel-header">
          <span>AI 助教</span>
        </div>
        <div className="chat-setup">
          <IconSparkle className="big" />
          <p>
            AI 助教是<strong>可选</strong>功能：填入你自己的 API Key 后，它能看到当前关卡和你的代码，
            帮你解释编译错误、给出思路。
          </p>
          <p className="muted">
            支持 Claude，以及 DeepSeek、通义千问、智谱、Kimi、OpenRouter、Gemini、本地 Ollama 等任何 OpenAI
            兼容接口。Key 只保存在你的浏览器里，请求直接从浏览器发给模型服务商。
          </p>
          <button className="btn primary" onClick={props.onOpenSettings}>
            去设置
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat">
      <div className="panel-header">
        <span>AI 助教</span>
        <span className="muted chat-model" title={settings.llm.model}>
          {settings.llm.model}
        </span>
        <button
          className="icon-btn"
          title="清空对话"
          onClick={() => {
            abort.current?.abort();
            onMessages([]);
            setError(null);
          }}
        >
          <IconTrash />
        </button>
      </div>
      <div className="chat-context muted">上下文：{props.contextLabel}</div>
      <div className="chat-list" ref={list}>
        {messages.length === 0 && (
          <div className="chat-quick">
            {QUICK.map((q) => (
              <button key={q} className="btn ghost small" onClick={() => void send(q)}>
                {q}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.role === 'assistant' ? (
              m.content ? (
                <Markdown source={m.content} />
              ) : (
                <div className="thinking">
                  <span className="spinner" /> 思考中…
                </div>
              )
            ) : (
              <div className="user-text">{m.content}</div>
            )}
          </div>
        ))}
        {error && <div className="chat-error">{error}</div>}
      </div>
      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <textarea
          value={input}
          placeholder="问点什么…（Enter 发送，Shift+Enter 换行）"
          rows={3}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void send(input);
            }
          }}
        />
        {streaming ? (
          <button type="button" className="icon-btn send" title="停止" onClick={() => abort.current?.abort()}>
            <IconStop />
          </button>
        ) : (
          <button type="submit" className="icon-btn send" title="发送" disabled={!input.trim()}>
            <IconSend />
          </button>
        )}
      </form>
    </div>
  );
}

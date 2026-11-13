import { useRef, useState } from 'react';
import { describeLlmError, PRESETS, streamChat } from '../lib/llm.ts';
import { probeRunner } from '../lib/runners.ts';
import { exportData, importData, type RunnerKind, type Settings, type Theme } from '../lib/storage.ts';

interface Props {
  settings: Settings;
  onChange(s: Settings): void;
  onResetProgress(): void;
}

type Status = { kind: 'idle' | 'busy' | 'ok' | 'err'; text?: string };

function StatusLine({ s }: { s: Status }) {
  if (s.kind === 'idle') return null;
  return (
    <div className={`status-line ${s.kind}`}>
      {s.kind === 'busy' && <span className="spinner" />} {s.text}
    </div>
  );
}

export function SettingsPanel({ settings, onChange, onResetProgress }: Props) {
  const [runnerStatus, setRunnerStatus] = useState<Status>({ kind: 'idle' });
  const [llmStatus, setLlmStatus] = useState<Status>({ kind: 'idle' });
  const [showKey, setShowKey] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const llm = settings.llm;
  const set = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });
  const setLlm = (patch: Partial<Settings['llm']>) => onChange({ ...settings, llm: { ...llm, ...patch } });
  const preset = PRESETS.find((p) => p.baseUrl === llm.baseUrl && p.provider === llm.provider);

  async function testRunner() {
    setRunnerStatus({ kind: 'busy', text: '正在测试…' });
    try {
      setRunnerStatus({ kind: 'ok', text: `✓ ${await probeRunner(settings)}` });
    } catch (err) {
      setRunnerStatus({ kind: 'err', text: err instanceof Error ? err.message : String(err) });
    }
  }

  async function testLlm() {
    setLlmStatus({ kind: 'busy', text: '正在发送测试消息…' });
    let reply = '';
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 60_000);
      await streamChat(settings, '你是一个测试助手。', [{ role: 'user', content: '只回复两个字：你好' }], {
        signal: ac.signal,
        onText: (d) => (reply += d),
      });
      clearTimeout(timer);
      setLlmStatus({ kind: 'ok', text: `✓ 连接成功，模型回复：${reply.trim().slice(0, 40) || '（空）'}` });
    } catch (err) {
      setLlmStatus({ kind: 'err', text: describeLlmError(err) });
    }
  }

  return (
    <div className="settings">
      <div className="panel-header">
        <span>设置</span>
      </div>
      <div className="settings-body">
        <section>
          <h3>外观</h3>
          <label className="field">
            <span>主题</span>
            <select value={settings.theme} onChange={(e) => set({ theme: e.target.value as Theme })}>
              <option value="system">跟随系统</option>
              <option value="dark">深色</option>
              <option value="light">浅色</option>
            </select>
          </label>
          <label className="field">
            <span>编辑器字号</span>
            <input
              type="number"
              min={10}
              max={28}
              value={settings.fontSize}
              onChange={(e) => set({ fontSize: Math.min(28, Math.max(10, Number(e.target.value) || 14)) })}
            />
          </label>
        </section>

        <section>
          <h3>运行环境</h3>
          <p className="help">代码在哪里编译运行。三种方式的效果完全一样，选一个能用的就行。</p>
          <div className="radio-list">
            {(
              [
                ['playground', '官方 Playground', '默认。由 Rust 官方提供的免费在线编译服务，零配置。'],
                [
                  'proxy',
                  '经本站转发',
                  '部署在 Cloudflare Pages 上时转发到官方 Playground，适合官方地址访问不畅的情况；本地 npm run dev:local 时转发到本机 rustc。',
                ],
                ['custom', '自定义运行器', '用你自己机器 / 容器里的 rustc：npm run runner 或 Docker 启动，见 README。'],
              ] as [RunnerKind, string, string][]
            ).map(([value, label, desc]) => (
              <label key={value} className={`radio ${settings.runner === value ? 'checked' : ''}`}>
                <input
                  type="radio"
                  name="runner"
                  checked={settings.runner === value}
                  onChange={() => {
                    set({ runner: value });
                    setRunnerStatus({ kind: 'idle' });
                  }}
                />
                <div>
                  <div>{label}</div>
                  <div className="help">{desc}</div>
                </div>
              </label>
            ))}
          </div>
          {settings.runner === 'custom' && (
            <label className="field">
              <span>运行器地址</span>
              <input
                value={settings.runnerUrl}
                placeholder="http://127.0.0.1:7878"
                onChange={(e) => set({ runnerUrl: e.target.value.trim() })}
              />
            </label>
          )}
          <button className="btn" onClick={() => void testRunner()}>
            测试运行环境
          </button>
          <StatusLine s={runnerStatus} />
        </section>

        <section>
          <h3>AI 助教（可选）</h3>
          <p className="help">
            填写你自己的 API Key。Key 只保存在本浏览器的 localStorage 中，请求从浏览器直接发往你选择的服务商；
            勾选「通过本站代理」时会经过本站的 Cloudflare 函数转发（不记录、不保存）。
          </p>
          <label className="field">
            <span>服务商</span>
            <select
              value={llm.provider === 'none' ? 'none' : (preset?.id ?? 'custom')}
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'none') return setLlm({ provider: 'none' });
                if (v === 'custom') return setLlm({ provider: 'openai', baseUrl: '', model: '' });
                const p = PRESETS.find((x) => x.id === v)!;
                setLlm({ provider: p.provider, baseUrl: p.baseUrl, model: p.model });
                setLlmStatus({ kind: 'idle' });
              }}
            >
              <option value="none">不使用</option>
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
              <option value="custom">其它 OpenAI 兼容接口…</option>
            </select>
          </label>
          {preset?.note && <p className="help">{preset.note}</p>}
          {llm.provider !== 'none' && (
            <>
              {!preset && (
                <label className="field">
                  <span>接口类型</span>
                  <select
                    value={llm.provider}
                    onChange={(e) => setLlm({ provider: e.target.value as 'anthropic' | 'openai' })}
                  >
                    <option value="openai">OpenAI 兼容（/chat/completions）</option>
                    <option value="anthropic">Anthropic Messages API</option>
                  </select>
                </label>
              )}
              <label className="field">
                <span>Base URL</span>
                <input value={llm.baseUrl} onChange={(e) => setLlm({ baseUrl: e.target.value.trim() })} />
              </label>
              <label className="field">
                <span>模型</span>
                <input value={llm.model} onChange={(e) => setLlm({ model: e.target.value })} />
              </label>
              <label className="field">
                <span>API Key</span>
                <div className="key-row">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={llm.apiKey}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="sk-..."
                    onChange={(e) => setLlm({ apiKey: e.target.value })}
                  />
                  <button className="btn small ghost" type="button" onClick={() => setShowKey((v) => !v)}>
                    {showKey ? '隐藏' : '显示'}
                  </button>
                </div>
              </label>
              <label className="check">
                <input type="checkbox" checked={llm.useProxy} onChange={(e) => setLlm({ useProxy: e.target.checked })} />
                <span>通过本站代理（服务商不支持浏览器跨域访问时勾选）</span>
              </label>
              <button className="btn" onClick={() => void testLlm()}>
                测试连接
              </button>
              <StatusLine s={llmStatus} />
            </>
          )}
        </section>

        <section>
          <h3>学习数据</h3>
          <p className="help">进度和代码都保存在本浏览器里。换设备前可以先导出。</p>
          <div className="btn-row">
            <button
              className="btn"
              onClick={() => {
                const blob = new Blob([exportData()], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `rustlab-progress-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(a.href);
              }}
            >
              导出进度
            </button>
            <button className="btn" onClick={() => fileInput.current?.click()}>
              导入进度
            </button>
            <button
              className="btn danger"
              onClick={() => {
                if (confirm('确定清空所有关卡的进度和代码吗？此操作无法撤销。')) onResetProgress();
              }}
            >
              清空进度
            </button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              try {
                const n = importData(await f.text());
                alert(`已导入 ${n} 项数据，页面将刷新。`);
                location.reload();
              } catch (err) {
                alert(`导入失败：${err instanceof Error ? err.message : err}`);
              }
            }}
          />
        </section>

        <section className="about">
          <h3>关于</h3>
          <p className="help">
            RustLab 的关卡参考了 <a href="https://github.com/rust-lang/rustlings">rustlings</a>、
            <a href="https://doc.rust-lang.org/book/">The Rust Programming Language</a> 与
            <a href="https://course.rs/">Rust 语言圣经</a> 的章节编排，内容为原创。
          </p>
        </section>
      </div>
    </div>
  );
}

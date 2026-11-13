import { useEffect, useRef, useState } from 'react';
import { getLang, LANGS, t } from '../i18n/index.ts';
import { describeLlmError, listModels, PRESETS, streamChat } from '../lib/llm.ts';
import { probeRunner } from '../lib/runners.ts';
import { exportData, importData, type LangSetting, type RunnerKind, type Settings, type Theme } from '../lib/storage.ts';

interface Props {
  settings: Settings;
  onChange(s: Settings): void;
  onResetProgress(): void;
  /** 每次变化时滚动到 AI 助教一节并高亮（来自聊天面板的「去设置」） */
  focusAi?: number;
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

export function SettingsPanel({ settings, onChange, onResetProgress, focusAi }: Props) {
  const [runnerStatus, setRunnerStatus] = useState<Status>({ kind: 'idle' });
  const [llmStatus, setLlmStatus] = useState<Status>({ kind: 'idle' });
  const [models, setModels] = useState<string[]>([]);
  const [showKey, setShowKey] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const aiSection = useRef<HTMLElement>(null);
  const providerSelect = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (!focusAi) return;
    const el = aiSection.current;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.remove('flash');
    void el.offsetWidth; // 重新触发动画
    el.classList.add('flash');
    providerSelect.current?.focus({ preventScroll: true });
  }, [focusAi]);
  const lang = getLang();
  const llm = settings.llm;
  const set = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });
  const setLlm = (patch: Partial<Settings['llm']>) => onChange({ ...settings, llm: { ...llm, ...patch } });
  const preset = PRESETS.find((p) => p.baseUrl === llm.baseUrl && p.provider === llm.provider);
  const endpoint =
    llm.baseUrl.trim().replace(/\/+$/, '') + (llm.provider === 'anthropic' ? '/v1/messages' : '/chat/completions');

  async function testRunner() {
    setRunnerStatus({ kind: 'busy', text: t('settings.testing') });
    try {
      setRunnerStatus({ kind: 'ok', text: `✓ ${await probeRunner(settings)}` });
    } catch (err) {
      setRunnerStatus({ kind: 'err', text: err instanceof Error ? err.message : String(err) });
    }
  }

  async function testLlm() {
    setLlmStatus({ kind: 'busy', text: t('settings.testLlmBusy') });
    let reply = '';
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 60_000);
      await streamChat(settings, 'You are a connectivity test.', [{ role: 'user', content: t('settings.testLlmPrompt') }], {
        signal: ac.signal,
        onText: (d) => (reply += d),
      });
      clearTimeout(timer);
      setLlmStatus({ kind: 'ok', text: t('settings.testLlmOk', { reply: reply.trim().slice(0, 40) || '—' }) });
    } catch (err) {
      setLlmStatus({ kind: 'err', text: describeLlmError(err) });
    }
  }

  async function fetchModels() {
    setLlmStatus({ kind: 'busy', text: t('settings.fetchingModels') });
    try {
      const list = await listModels(settings);
      setModels(list);
      setLlmStatus({ kind: 'ok', text: t('settings.modelsFound', { n: list.length }) });
    } catch (err) {
      setLlmStatus({ kind: 'err', text: describeLlmError(err) });
    }
  }

  return (
    <div className="settings">
      <div className="panel-header">
        <span>{t('app.settings')}</span>
      </div>
      <div className="settings-body">
        <section>
          <h3>{t('settings.appearance')}</h3>
          <label className="field">
            <span>{t('settings.language')}</span>
            <select value={settings.lang} onChange={(e) => set({ lang: e.target.value as LangSetting })}>
              <option value="auto">{t('settings.languageAuto')}</option>
              {LANGS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t('settings.theme')}</span>
            <select value={settings.theme} onChange={(e) => set({ theme: e.target.value as Theme })}>
              <option value="system">{t('settings.themeSystem')}</option>
              <option value="dark">{t('settings.themeDark')}</option>
              <option value="light">{t('settings.themeLight')}</option>
            </select>
          </label>
          <label className="field">
            <span>{t('settings.fontSize')}</span>
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
          <h3>{t('settings.runner')}</h3>
          <p className="help">{t('settings.runnerHelp')}</p>
          <div className="radio-list">
            {(
              [
                ['playground', 'settings.runnerPlayground', 'settings.runnerPlaygroundDesc'],
                ['proxy', 'settings.runnerProxy', 'settings.runnerProxyDesc'],
                ['custom', 'settings.runnerCustom', 'settings.runnerCustomDesc'],
              ] as const
            ).map(([value, label, desc]) => (
              <label key={value} className={`radio ${settings.runner === value ? 'checked' : ''}`}>
                <input
                  type="radio"
                  name="runner"
                  checked={settings.runner === value}
                  onChange={() => {
                    set({ runner: value as RunnerKind });
                    setRunnerStatus({ kind: 'idle' });
                  }}
                />
                <div>
                  <div>{t(label)}</div>
                  <div className="help">{t(desc)}</div>
                </div>
              </label>
            ))}
          </div>
          {settings.runner === 'custom' && (
            <label className="field">
              <span>{t('settings.runnerUrl')}</span>
              <input
                value={settings.runnerUrl}
                placeholder="http://127.0.0.1:7878"
                onChange={(e) => set({ runnerUrl: e.target.value.trim() })}
              />
            </label>
          )}
          <button className="btn" onClick={() => void testRunner()}>
            {t('settings.testRunner')}
          </button>
          <StatusLine s={runnerStatus} />
        </section>

        <section ref={aiSection} className="ai-section">
          <h3>{t('settings.ai')}</h3>
          <p className="help">{t('settings.aiHelp')}</p>
          <label className="field">
            <span>{t('settings.provider')}</span>
            <select
              ref={providerSelect}
              value={llm.provider === 'none' ? 'none' : (preset?.id ?? 'custom')}
              onChange={(e) => {
                const v = e.target.value;
                setModels([]);
                setLlmStatus({ kind: 'idle' });
                if (v === 'none') return setLlm({ provider: 'none' });
                if (v === 'custom') return setLlm({ provider: 'openai', baseUrl: '', model: '' });
                const p = PRESETS.find((x) => x.id === v)!;
                setLlm({ provider: p.provider, baseUrl: p.baseUrl, model: p.model });
              }}
            >
              <option value="none">{t('settings.providerNone')}</option>
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label[lang]}
                </option>
              ))}
              <option value="custom">{t('settings.providerCustom')}</option>
            </select>
          </label>
          {preset?.note && <p className="help">{preset.note[lang]}</p>}
          {llm.provider !== 'none' && (
            <>
              {!preset && (
                <>
                  <p className="help">{t('settings.customHelp')}</p>
                  <label className="field">
                    <span>{t('settings.apiType')}</span>
                    <select
                      value={llm.provider}
                      onChange={(e) => setLlm({ provider: e.target.value as 'anthropic' | 'openai' })}
                    >
                      <option value="openai">{t('settings.apiOpenAI')}</option>
                      <option value="anthropic">{t('settings.apiAnthropic')}</option>
                    </select>
                  </label>
                </>
              )}
              <label className="field">
                <span>Base URL</span>
                <input
                  value={llm.baseUrl}
                  placeholder={llm.provider === 'anthropic' ? 'https://api.anthropic.com' : 'https://your-gateway.example.com/v1'}
                  spellCheck={false}
                  onChange={(e) => setLlm({ baseUrl: e.target.value.trim() })}
                />
              </label>
              {llm.baseUrl.trim() && <p className="help mono">→ POST {endpoint}</p>}
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
                    {t(showKey ? 'settings.hide' : 'settings.show')}
                  </button>
                </div>
              </label>
              <label className="field">
                <span>{t('settings.model')}</span>
                <div className="key-row">
                  <input
                    value={llm.model}
                    list="rustlab-models"
                    spellCheck={false}
                    onChange={(e) => setLlm({ model: e.target.value })}
                  />
                  <button className="btn small ghost" type="button" onClick={() => void fetchModels()}>
                    {t('settings.fetchModels')}
                  </button>
                </div>
                <datalist id="rustlab-models">
                  {models.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </label>
              {models.length > 0 && (
                <select className="model-list" size={Math.min(6, models.length)} value={llm.model} onChange={(e) => setLlm({ model: e.target.value })}>
                  {models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              )}
              <label className="check">
                <input type="checkbox" checked={llm.useProxy} onChange={(e) => setLlm({ useProxy: e.target.checked })} />
                <span>{t('settings.useProxy')}</span>
              </label>
              <button className="btn" onClick={() => void testLlm()}>
                {t('settings.testLlm')}
              </button>
              <StatusLine s={llmStatus} />
            </>
          )}
        </section>

        <section>
          <h3>{t('settings.data')}</h3>
          <p className="help">{t('settings.dataHelp')}</p>
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
              {t('settings.export')}
            </button>
            <button className="btn" onClick={() => fileInput.current?.click()}>
              {t('settings.import')}
            </button>
            <button
              className="btn danger"
              onClick={() => {
                if (confirm(t('settings.confirmReset'))) onResetProgress();
              }}
            >
              {t('settings.reset')}
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
                alert(t('settings.imported', { n }));
                location.reload();
              } catch (err) {
                alert(t('settings.importFailed', { error: err instanceof Error ? err.message : String(err) }));
              }
            }}
          />
        </section>

        <section className="about">
          <h3>{t('settings.about')}</h3>
          <p className="help" dangerouslySetInnerHTML={{ __html: t('settings.aboutText') }} />
        </section>
      </div>
    </div>
  );
}

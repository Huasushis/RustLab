import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { allLevels, chapterOf, findLevel, levelNumber, neighbours, PLAYGROUND_STARTER } from '../content.ts';
import { checkLevel, runCode, RUST_EDITION, type Outcome } from '../lib/check.ts';
import { buildSystemPrompt, llmConfigured, type ChatMessage } from '../lib/llm.ts';
import { applyMonacoTheme } from '../lib/monaco.ts';
import { formatCode, makeExecutor, playgroundLink, runnerLabel } from '../lib/runners.ts';
import {
  clearCode,
  loadCode,
  loadHints,
  loadProgress,
  loadSettings,
  saveCode,
  saveHints,
  saveProgress,
  saveSettings,
  type Progress,
  type Settings,
} from '../lib/storage.ts';
import { ChatPanel } from './ChatPanel.tsx';
import { CodeEditor, DiffView, type EditorHandle } from './CodeEditor.tsx';
import { Explorer } from './Explorer.tsx';
import {
  Ferris,
  IconBook,
  IconChat,
  IconCheck,
  IconCode,
  IconExternal,
  IconFiles,
  IconFormat,
  IconGear,
  IconPlay,
  IconReset,
  IconTerminal,
  IconX,
} from './Icons.tsx';
import { LessonPane, PlaygroundIntro } from './LessonPane.tsx';
import { OutputPanel, type BottomTab } from './OutputPanel.tsx';
import { SettingsPanel } from './SettingsPanel.tsx';

type Route = { kind: 'level'; id: string } | { kind: 'playground' };
type SideView = 'levels' | 'settings' | null;
type MobileView = 'lesson' | 'code' | 'chat' | 'menu';
const PLAYGROUND_KEY = 'playground';

function parseHash(): Route {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  if (h === 'playground') return { kind: 'playground' };
  const id = h.replace(/^level\//, '');
  if (findLevel(id)) return { kind: 'level', id };
  return { kind: 'level', id: allLevels[0].id };
}

function useHashRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState(parseHash);
  useEffect(() => {
    const on = () => setRoute(parseHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = useCallback((r: Route) => {
    location.hash = r.kind === 'playground' ? '#/playground' : `#/level/${r.id}`;
  }, []);
  return [route, go];
}

function useMedia(query: string): boolean {
  const [m, setM] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const mq = matchMedia(query);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return m;
}

/** 可拖拽的分隔条 */
function Splitter({ dir, onDrag }: { dir: 'x' | 'y'; onDrag(delta: number): void }) {
  return (
    <div
      className={`splitter ${dir}`}
      role="separator"
      aria-orientation={dir === 'x' ? 'vertical' : 'horizontal'}
      onPointerDown={(e) => {
        e.preventDefault();
        const el = e.currentTarget;
        el.setPointerCapture(e.pointerId);
        el.classList.add('dragging');
        let last = dir === 'x' ? e.clientX : e.clientY;
        const move = (ev: PointerEvent) => {
          const cur = dir === 'x' ? ev.clientX : ev.clientY;
          onDrag(cur - last);
          last = cur;
        };
        const up = () => {
          el.classList.remove('dragging');
          el.removeEventListener('pointermove', move);
          el.removeEventListener('pointerup', up);
        };
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', up);
      }}
    />
  );
}

function usePersistentNumber(key: string, initial: number, min: number, max: number) {
  const [v, setV] = useState(() => {
    try {
      const n = Number(localStorage.getItem(key));
      return n ? Math.min(max, Math.max(min, n)) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, String(Math.round(v)));
    } catch {
      /* ignore */
    }
  }, [key, v]);
  const adjust = useCallback((d: number) => setV((x) => Math.min(max, Math.max(min, x + d))), [min, max]);
  return [v, adjust] as const;
}

export function App() {
  const [settings, setSettingsState] = useState<Settings>(loadSettings);
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [hints, setHints] = useState<Record<string, number>>(loadHints);
  const [route, go] = useHashRoute();
  const level = route.kind === 'level' ? findLevel(route.id)! : null;
  const fileKey = level ? level.id : PLAYGROUND_KEY;
  const starter = level ? level.starter : PLAYGROUND_STARTER;

  const [code, setCode] = useState('');
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [busy, setBusy] = useState<'run' | 'check' | 'format' | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [bottomTab, setBottomTab] = useState<BottomTab>('output');
  const [side, setSide] = useState<SideView>('levels');
  const [chatOpen, setChatOpen] = useState(false);
  const [chats, setChats] = useState<Record<string, ChatMessage[]>>({});
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [diffOpen, setDiffOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>('lesson');

  const editorRef = useRef<EditorHandle>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isMobile = useMedia('(max-width: 860px)');
  const prefersLight = useMedia('(prefers-color-scheme: light)');
  const theme = settings.theme === 'system' ? (prefersLight ? 'light' : 'dark') : settings.theme;

  const [sideW, adjustSide] = usePersistentNumber('rustlab:ui:side', 260, 180, 480);
  const [lessonW, adjustLesson] = usePersistentNumber('rustlab:ui:lesson', 440, 280, 900);
  const [chatW, adjustChat] = usePersistentNumber('rustlab:ui:chat', 380, 280, 720);
  const [outputH, adjustOutput] = usePersistentNumber('rustlab:ui:output', 230, 90, 700);

  const setSettings = useCallback((s: Settings) => {
    setSettingsState(s);
    saveSettings(s);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    applyMonacoTheme(theme);
  }, [theme]);

  // 切换关卡：清掉上一关的结果
  useEffect(() => {
    abortRef.current?.abort();
    setOutcome(null);
    setRunError(null);
    setBottomTab('output');
    setDiffOpen(false);
    document.title = level ? `${levelNumber(level)} ${level.title} · RustLab` : '自由练习区 · RustLab';
  }, [fileKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // 自动保存（停止输入 400ms 后）
  useEffect(() => {
    if (!code) return;
    const t = setTimeout(() => {
      if (code === starter) clearCode(fileKey);
      else saveCode(fileKey, code);
    }, 400);
    return () => clearTimeout(t);
  }, [code, fileKey, starter]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 2600);
  }, []);

  const execute = useCallback(
    async (kind: 'run' | 'check') => {
      if (busy === 'run' || busy === 'check') return;
      const src = editorRef.current?.getValue() ?? code;
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setBusy(kind);
      setRunError(null);
      if (isMobile) setMobileView('code');
      try {
        const exec = makeExecutor(settings, ac.signal);
        const res = kind === 'check' && level ? await checkLevel(level, src, exec) : await runCode(src, exec);
        if (ac.signal.aborted) return;
        setOutcome(res);
        if (res.kind === 'check' && res.tests.length > 0 && !res.passed && res.tests.some((t) => t.status === 'failed')) {
          setBottomTab('tests');
        } else {
          setBottomTab('output');
        }
        if (res.kind === 'check' && res.passed && level && !progress[level.id]) {
          const p = { ...progress, [level.id]: Date.now() };
          setProgress(p);
          saveProgress(p);
          const ch = chapterOf(level);
          if (ch.levels.every((l) => p[l.id])) flash(`🎉 第 ${ch.index + 1} 章「${ch.title}」全部通关！`);
        }
      } catch (err) {
        if (ac.signal.aborted) return;
        setOutcome(null);
        setRunError(err instanceof Error ? err.message : String(err));
      } finally {
        if (abortRef.current === ac) {
          abortRef.current = null;
          setBusy(null);
        }
      }
    },
    [busy, code, flash, isMobile, level, progress, settings],
  );

  const format = useCallback(async () => {
    if (busy) return;
    setBusy('format');
    try {
      const src = editorRef.current?.getValue() ?? code;
      const out = await formatCode(settings, src);
      if (out !== src) editorRef.current?.setValue(out);
      flash('已格式化（rustfmt）');
    } catch (err) {
      flash(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }, [busy, code, flash, settings]);

  const resetCode = useCallback(() => {
    if (!confirm('把代码恢复成本关的初始状态？（之后仍可以用 Ctrl+Z 撤销）')) return;
    editorRef.current?.setValue(starter);
    setOutcome(null);
  }, [starter]);

  const lastOutput = useMemo(() => {
    if (runError) return runError;
    if (!outcome) return '';
    const failed = outcome.tests.filter((t) => t.status === 'failed').map((t) => `${t.name}:\n${t.detail}`);
    return [outcome.summary, outcome.stderr, outcome.tests.length ? failed.join('\n\n') : outcome.stdout]
      .filter(Boolean)
      .join('\n\n');
  }, [outcome, runError]);

  const buildSystem = useCallback(
    () =>
      buildSystemPrompt({
        levelTitle: level ? `${levelNumber(level)} ${level.title}` : undefined,
        lesson: level?.lesson,
        code: editorRef.current?.getValue() ?? code,
        output: lastOutput,
      }),
    [code, lastOutput, level],
  );

  const openChat = useCallback(
    (prompt?: string) => {
      if (isMobile) setMobileView('chat');
      else {
        setChatOpen(true);
        // 屏幕不够宽时收起左侧栏，给编辑器留出空间
        if (window.innerWidth < 1500) setSide(null);
      }
      if (prompt) setPendingPrompt(prompt);
    },
    [isMobile],
  );

  const { next } = level ? neighbours(level.id) : { next: undefined };
  const navigate = (id: string) => {
    go({ kind: 'level', id });
    if (isMobile) setMobileView('lesson');
  };
  const completedCount = allLevels.filter((l) => progress[l.id]).length;
  const aiReady = llmConfigured(settings);

  // ---------- 各个区域 ----------
  const lesson = level ? (
    <LessonPane
      level={level}
      completed={Boolean(progress[level.id])}
      hintsShown={hints[level.id] ?? 0}
      onShowHint={() => {
        const h = { ...hints, [level.id]: (hints[level.id] ?? 0) + 1 };
        setHints(h);
        saveHints(h);
      }}
      onShowSolution={() => setDiffOpen(true)}
      onNavigate={navigate}
    />
  ) : (
    <PlaygroundIntro />
  );

  const toolbar = (
    <div className="editor-toolbar">
      <div className="file-tab active">
        <IconCode /> main.rs
        {code !== starter && <span className="dot" title="已修改（自动保存在浏览器中）" />}
      </div>
      <div className="toolbar-spacer" />
      <button className="btn small ghost" title="恢复初始代码" onClick={resetCode}>
        <IconReset />
        <span className="label">重置</span>
      </button>
      <button className="btn small ghost" title="用 rustfmt 格式化（Shift+Alt+F）" onClick={() => void format()}>
        <IconFormat />
        <span className="label">格式化</span>
      </button>
      <a className="btn small ghost" href={playgroundLink(code)} target="_blank" rel="noreferrer" title="在官方 Playground 中打开">
        <IconExternal />
      </a>
      <button
        className="btn small"
        onClick={() => void execute('run')}
        disabled={busy === 'run' || busy === 'check'}
        title="运行（Ctrl/⌘ + Enter）"
      >
        <IconPlay />
        <span className="btn-text">运行</span>
      </button>
      {level && (
        <button
          className="btn small primary"
          onClick={() => void execute('check')}
          disabled={busy === 'run' || busy === 'check'}
          title="检查（Ctrl/⌘ + Shift + Enter）"
        >
          <IconCheck />
          <span className="btn-text">检查</span>
        </button>
      )}
    </div>
  );

  const editor = (
    <CodeEditor
      ref={editorRef}
      fileKey={fileKey}
      initialValue={loadCode(fileKey) ?? starter}
      diagnostics={outcome?.diagnostics ?? []}
      fontSize={settings.fontSize}
      onChange={setCode}
      onCursor={(line, col) => setCursor({ line, col })}
      onRun={() => void execute('run')}
      onCheck={() => void execute(level ? 'check' : 'run')}
      onFormat={() => void format()}
    />
  );

  const output = (
    <OutputPanel
      tab={bottomTab}
      onTab={setBottomTab}
      busy={busy}
      outcome={outcome}
      error={runError}
      onReveal={(l, c) => {
        if (isMobile) setMobileView('code');
        editorRef.current?.reveal(l, c);
      }}
      onAskAi={() => openChat('帮我看看这次为什么没通过，先解释问题出在哪里，别直接给出完整答案。')}
      onNext={next ? () => navigate(next.id) : null}
    />
  );

  const chat = (
    <ChatPanel
      settings={settings}
      messages={chats[fileKey] ?? []}
      onMessages={(m) => setChats((c) => ({ ...c, [fileKey]: m }))}
      buildSystem={buildSystem}
      pending={pendingPrompt}
      onPendingConsumed={() => setPendingPrompt(null)}
      onOpenSettings={() => {
        if (isMobile) setMobileView('menu');
        setSide('settings');
      }}
      contextLabel={level ? `${levelNumber(level)} ${level.title} + 你的代码 + 最近的输出` : '自由练习区的代码'}
    />
  );

  const settingsPanel = (
    <SettingsPanel
      settings={settings}
      onChange={setSettings}
      onResetProgress={() => {
        try {
          for (const k of Object.keys(localStorage)) {
            if (k.startsWith('rustlab:') && k !== 'rustlab:settings') localStorage.removeItem(k);
          }
        } catch {
          /* ignore */
        }
        location.reload();
      }}
    />
  );

  const explorer = (
    <Explorer
      currentId={level?.id ?? null}
      progress={progress}
      onOpen={navigate}
      playgroundActive={!level}
      onPlayground={() => {
        go({ kind: 'playground' });
        if (isMobile) setMobileView('code');
      }}
    />
  );

  const diffModal =
    diffOpen && level ? (
      <div className="modal-backdrop" onClick={() => setDiffOpen(false)}>
        <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="对比参考答案">
          <div className="modal-head">
            <div>
              <strong>对比参考答案</strong>
              <span className="muted">　左：你的代码　右：参考答案</span>
            </div>
            <button className="icon-btn" onClick={() => setDiffOpen(false)} title="关闭">
              <IconX />
            </button>
          </div>
          <p className="modal-note">参考答案只是其中一种写法。先自己试试，实在卡住了再看——看完之后最好关掉它，自己重新写一遍。</p>
          <DiffView original={editorRef.current?.getValue() ?? code} modified={level.solution} fontSize={settings.fontSize} />
          <div className="modal-foot">
            <button
              className="btn"
              onClick={() => {
                editorRef.current?.setValue(level.solution);
                setDiffOpen(false);
                flash('已替换为参考答案（Ctrl+Z 可撤销）');
              }}
            >
              用参考答案替换我的代码
            </button>
            <button className="btn primary" onClick={() => setDiffOpen(false)}>
              我自己再试试
            </button>
          </div>
        </div>
      </div>
    ) : null;

  const toastEl = toast ? <div className="toast">{toast}</div> : null;

  // ---------- 手机布局 ----------
  if (isMobile) {
    const views: [MobileView, string, ReactNode][] = [
      ['lesson', '讲解', <IconBook key="b" />],
      ['code', '代码', <IconCode key="c" />],
      ['chat', '助教', <IconChat key="h" />],
      ['menu', '菜单', <IconFiles key="m" />],
    ];
    return (
      <div className="app mobile">
        <header className="titlebar">
          <Ferris size={20} />
          <span className="brand">RustLab</span>
          <span className="title-crumb">{level ? `${levelNumber(level)} ${level.title}` : '自由练习区'}</span>
        </header>
        <main className="mobile-main">
          <div className={`mobile-pane scroll ${mobileView === 'lesson' ? '' : 'hidden'}`}>{lesson}</div>
          <div className={`mobile-pane code-pane ${mobileView === 'code' ? '' : 'hidden'}`}>
            {toolbar}
            <div className="editor-wrap">{editor}</div>
            <div className="mobile-output">{output}</div>
          </div>
          <div className={`mobile-pane ${mobileView === 'chat' ? '' : 'hidden'}`}>{chat}</div>
          <div className={`mobile-pane scroll ${mobileView === 'menu' ? '' : 'hidden'}`}>
            <div className="mobile-menu-tabs">
              <button aria-pressed={side !== 'settings'} onClick={() => setSide('levels')}>
                关卡
              </button>
              <button aria-pressed={side === 'settings'} onClick={() => setSide('settings')}>
                设置
              </button>
            </div>
            {side === 'settings' ? settingsPanel : explorer}
          </div>
        </main>
        <nav className="mobile-nav">
          {views.map(([v, label, icon]) => (
            <button key={v} aria-pressed={mobileView === v} onClick={() => setMobileView(v)}>
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </nav>
        {diffModal}
        {toastEl}
      </div>
    );
  }

  // ---------- 桌面布局：类 VS Code ----------
  return (
    <div className="app">
      <header className="titlebar">
        <Ferris size={20} />
        <span className="brand">RustLab</span>
        <span className="title-crumb">
          {level ? (
            <>
              {chapterOf(level).title} <span className="sep">›</span> {levelNumber(level)} {level.title}
            </>
          ) : (
            '自由练习区'
          )}
        </span>
        <div className="toolbar-spacer" />
        <div className="title-progress" title={`已通关 ${completedCount}/${allLevels.length}`}>
          <div className="bar">
            <div style={{ width: `${(completedCount / allLevels.length) * 100}%` }} />
          </div>
          <span>
            {completedCount}/{allLevels.length}
          </span>
        </div>
        <button className={`btn small ${chatOpen ? 'primary' : 'ghost'}`} onClick={() => (chatOpen ? setChatOpen(false) : openChat())}>
          <IconChat /> AI 助教
        </button>
      </header>

      <div className="workbench">
        <nav className="activitybar">
          <button
            aria-pressed={side === 'levels'}
            title="关卡"
            onClick={() => setSide((s) => (s === 'levels' ? null : 'levels'))}
          >
            <IconFiles />
          </button>
          <button aria-pressed={chatOpen} title="AI 助教" onClick={() => (chatOpen ? setChatOpen(false) : openChat())}>
            <IconChat />
          </button>
          <div className="toolbar-spacer" />
          <button
            aria-pressed={side === 'settings'}
            title="设置"
            onClick={() => setSide((s) => (s === 'settings' ? null : 'settings'))}
          >
            <IconGear />
          </button>
        </nav>

        {side && (
          <>
            <aside className="sidebar" style={{ width: sideW }}>
              {side === 'levels' ? explorer : settingsPanel}
            </aside>
            <Splitter dir="x" onDrag={adjustSide} />
          </>
        )}

        <section className="lesson-pane scroll" style={{ width: lessonW }}>
          {lesson}
        </section>
        <Splitter dir="x" onDrag={adjustLesson} />

        <section className="editor-pane">
          {toolbar}
          <div className="editor-wrap">{editor}</div>
          <Splitter dir="y" onDrag={(d) => adjustOutput(-d)} />
          <div className="bottom-pane" style={{ height: outputH }}>
            {output}
          </div>
        </section>

        {chatOpen && (
          <>
            <Splitter dir="x" onDrag={(d) => adjustChat(-d)} />
            <aside className="chat-pane" style={{ width: chatW }}>
              {chat}
            </aside>
          </>
        )}
      </div>

      <footer className="statusbar">
        <span>
          <IconTerminal /> {runnerLabel(settings)}
        </span>
        <span>Rust {RUST_EDITION} edition</span>
        <div className="toolbar-spacer" />
        {busy && (
          <span>
            <span className="spinner small" /> {busy === 'format' ? '格式化中' : '编译中'}
          </span>
        )}
        <span>
          行 {cursor.line}，列 {cursor.col}
        </span>
        <span>{aiReady ? `AI：${settings.llm.model}` : 'AI 助教未配置'}</span>
      </footer>
      {diffModal}
      {toastEl}
    </div>
  );
}

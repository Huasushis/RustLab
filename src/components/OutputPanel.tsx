import type { Outcome } from '../lib/check.ts';
import { IconCircleCheck, IconSparkle, IconTerminal, IconWarning, IconX } from './Icons.tsx';

export type BottomTab = 'output' | 'problems' | 'tests';

interface Props {
  tab: BottomTab;
  onTab(t: BottomTab): void;
  busy: 'run' | 'check' | 'format' | null;
  outcome: Outcome | null;
  error: string | null;
  onReveal(line: number, col: number): void;
  onAskAi: (() => void) | null;
  onNext: (() => void) | null;
}

export function OutputPanel({ tab, onTab, busy, outcome, error, onReveal, onAskAi, onNext }: Props) {
  const problems = outcome?.diagnostics ?? [];
  const errors = problems.filter((d) => d.severity === 'error').length;
  const tests = outcome?.tests ?? [];
  const failedTests = tests.filter((t) => t.status === 'failed').length;

  return (
    <div className="output-panel">
      <div className="panel-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'output'} onClick={() => onTab('output')}>
          输出
        </button>
        <button role="tab" aria-selected={tab === 'problems'} onClick={() => onTab('problems')}>
          问题{problems.length > 0 && <span className={`badge ${errors ? 'err' : 'warn'}`}>{problems.length}</span>}
        </button>
        <button role="tab" aria-selected={tab === 'tests'} onClick={() => onTab('tests')}>
          测试
          {tests.length > 0 && (
            <span className={`badge ${failedTests ? 'err' : 'ok'}`}>
              {tests.length - failedTests}/{tests.length}
            </span>
          )}
        </button>
      </div>

      {busy && busy !== 'format' && (
        <div className="banner running">
          <span className="spinner" /> {busy === 'run' ? '正在编译运行…' : '正在编译并判题…'}
          <span className="muted">（首次编译通常需要几秒）</span>
        </div>
      )}
      {!busy && error && (
        <div className="banner fail">
          <IconWarning /> {error}
        </div>
      )}
      {!busy && outcome && !error && (
        <div className={`banner ${outcome.passed ? 'pass' : 'fail'}`}>
          {outcome.passed ? <IconCircleCheck /> : <IconX />}
          <span className="banner-text">
            {outcome.kind === 'check' && outcome.passed ? `通过！${outcome.summary}` : outcome.summary}
          </span>
          {outcome.passed && outcome.kind === 'check' && onNext && (
            <button className="btn primary small" onClick={onNext}>
              下一关 →
            </button>
          )}
          {!outcome.passed && onAskAi && (
            <button className="btn small" onClick={onAskAi}>
              <IconSparkle /> 问问 AI 助教
            </button>
          )}
        </div>
      )}

      <div className="panel-body">
        {tab === 'output' && <OutputView outcome={outcome} />}
        {tab === 'problems' &&
          (problems.length === 0 ? (
            <Empty text="没有发现问题" />
          ) : (
            <ul className="problem-list">
              {problems.map((d, i) => (
                <li key={i}>
                  <button onClick={() => onReveal(d.line, d.col)}>
                    <span className={`sev ${d.severity}`}>{d.severity === 'error' ? '错误' : '警告'}</span>
                    <span className="problem-msg">{d.message}</span>
                    {d.code && (
                      <a
                        className="err-code"
                        href={`https://doc.rust-lang.org/error_codes/${d.code}.html`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {d.code}
                      </a>
                    )}
                    <span className="muted">
                      main.rs:{d.line}:{d.col}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ))}
        {tab === 'tests' &&
          (tests.length === 0 ? (
            <Empty text={outcome?.kind === 'check' ? '这一关不是用测试判题的' : '点「检查」运行测试'} />
          ) : (
            <ul className="test-list">
              {tests.map((t) => (
                <li key={t.name} className={t.status}>
                  <div className="test-row">
                    {t.status === 'ok' ? <IconCircleCheck /> : t.status === 'failed' ? <IconX /> : <span>—</span>}
                    <code>{t.name}</code>
                  </div>
                  {t.detail && <pre className="test-detail">{t.detail}</pre>}
                </li>
              ))}
            </ul>
          ))}
      </div>
    </div>
  );
}

function OutputView({ outcome }: { outcome: Outcome | null }) {
  if (!outcome) {
    return <Empty text="Ctrl/⌘ + Enter 运行，Ctrl/⌘ + Shift + Enter 检查" icon />;
  }
  const isTestRun = outcome.tests.length > 0;
  return (
    <div className="terminal">
      {outcome.stderr && <pre className="stderr">{outcome.stderr}</pre>}
      {!isTestRun && outcome.stdout && <pre className="stdout">{outcome.stdout}</pre>}
      {isTestRun && <pre className="stdout dim">{outcome.stdout}</pre>}
      {!outcome.stderr && !outcome.stdout && <pre className="dim">（程序没有任何输出）</pre>}
      {outcome.expected !== null && (
        <div className="expected">
          <div className="expected-col">
            <div className="label">你的输出</div>
            <pre>{outcome.stdout || '（空）'}</pre>
          </div>
          <div className="expected-col">
            <div className="label">期望的输出</div>
            <pre>{outcome.expected}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

function Empty({ text, icon = false }: { text: string; icon?: boolean }) {
  return (
    <div className="empty">
      {icon && <IconTerminal />}
      <span>{text}</span>
    </div>
  );
}

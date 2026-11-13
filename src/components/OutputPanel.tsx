import { t } from '../i18n/index.ts';
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
          {t('output.tabOutput')}
        </button>
        <button role="tab" aria-selected={tab === 'problems'} onClick={() => onTab('problems')}>
          {t('output.tabProblems')}
          {problems.length > 0 && <span className={`badge ${errors ? 'err' : 'warn'}`}>{problems.length}</span>}
        </button>
        <button role="tab" aria-selected={tab === 'tests'} onClick={() => onTab('tests')}>
          {t('output.tabTests')}
          {tests.length > 0 && (
            <span className={`badge ${failedTests ? 'err' : 'ok'}`}>
              {tests.length - failedTests}/{tests.length}
            </span>
          )}
        </button>
      </div>

      {busy && busy !== 'format' && (
        <div className="banner running">
          <span className="spinner" /> {t(busy === 'run' ? 'output.running' : 'output.checking')}
          <span className="muted">{t('output.firstCompile')}</span>
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
            {outcome.kind === 'check' && outcome.passed ? t('output.passed', { summary: outcome.summary }) : outcome.summary}
          </span>
          {outcome.passed && outcome.kind === 'check' && onNext && (
            <button className="btn primary small" onClick={onNext}>
              {t('output.next')}
            </button>
          )}
          {!outcome.passed && onAskAi && (
            <button className="btn small" onClick={onAskAi}>
              <IconSparkle /> {t('output.askAi')}
            </button>
          )}
        </div>
      )}

      <div className="panel-body">
        {tab === 'output' && <OutputView outcome={outcome} />}
        {tab === 'problems' &&
          (problems.length === 0 ? (
            <Empty text={t('output.noProblems')} />
          ) : (
            <ul className="problem-list">
              {problems.map((d, i) => (
                <li key={i}>
                  <button onClick={() => onReveal(d.line, d.col)}>
                    <span className={`sev ${d.severity}`}>{t(d.severity === 'error' ? 'output.error' : 'output.warning')}</span>
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
            <Empty text={t(outcome?.kind === 'check' ? 'output.notTestLevel' : 'output.clickCheck')} />
          ) : (
            <ul className="test-list">
              {tests.map((x) => (
                <li key={x.name} className={x.status}>
                  <div className="test-row">
                    {x.status === 'ok' ? <IconCircleCheck /> : x.status === 'failed' ? <IconX /> : <span>—</span>}
                    <code>{x.name}</code>
                  </div>
                  {x.detail && <pre className="test-detail">{x.detail}</pre>}
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
    return <Empty text={t('output.empty')} icon />;
  }
  const isTestRun = outcome.tests.length > 0;
  return (
    <div className="terminal">
      {outcome.stderr && <pre className="stderr">{outcome.stderr}</pre>}
      {!isTestRun && outcome.stdout && <pre className="stdout">{outcome.stdout}</pre>}
      {isTestRun && <pre className="stdout dim">{outcome.stdout}</pre>}
      {!outcome.stderr && !outcome.stdout && <pre className="dim">{t('output.noOutput')}</pre>}
      {outcome.expected !== null && (
        <div className="expected">
          <div className="expected-col">
            <div className="label">{t('output.yours')}</div>
            <pre>{outcome.stdout || t('output.emptyValue')}</pre>
          </div>
          <div className="expected-col">
            <div className="label">{t('output.expected')}</div>
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

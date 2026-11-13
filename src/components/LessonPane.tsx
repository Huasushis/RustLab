import { chapterOf, levelNumber, neighbours, type LocalizedLevel } from '../content.ts';
import { t } from '../i18n/index.ts';
import { IconArrowLeft, IconArrowRight, IconBulb, IconCircleCheck, IconEye } from './Icons.tsx';
import { Markdown } from './Markdown.tsx';

interface Props {
  level: LocalizedLevel;
  completed: boolean;
  hintsShown: number;
  onShowHint(): void;
  onShowSolution(): void;
  onNavigate(id: string): void;
}

export function LessonPane({ level, completed, hintsShown, onShowHint, onShowSolution, onNavigate }: Props) {
  const ch = chapterOf(level);
  const { prev, next } = neighbours(level.id);
  const modeLabel = t(level.mode === 'test' ? 'lesson.modeTest' : level.expect !== null ? 'lesson.modeExpect' : 'lesson.modeRun');

  return (
    <article className="lesson" key={level.id}>
      <header className="lesson-head">
        <div className="lesson-crumb">
          {t('lesson.chapter', { n: ch.index + 1, title: ch.title })}
        </div>
        <h1>
          <span className="lesson-no">{levelNumber(level)}</span> {level.title}
        </h1>
        <div className="lesson-tags">
          <span className="tag">{modeLabel}</span>
          {level.forbid.length > 0 && (
            <span className="tag warn" title={t('lesson.forbidTitle')}>
              {t('lesson.forbid', { list: level.forbid.join('  ') })}
            </span>
          )}
          {level.minTests > 0 && <span className="tag">{t('lesson.minTests', { n: level.minTests })}</span>}
          {level.crates.length > 0 && <span className="tag crate">{t('lesson.crates', { list: level.crates.join(', ') })}</span>}
          {completed && (
            <span className="tag ok">
              <IconCircleCheck /> {t('lesson.passed')}
            </span>
          )}
        </div>
      </header>

      {level.untranslated && <p className="untranslated">{t('lesson.untranslated')}</p>}
      <Markdown source={level.lesson} className="lesson-body" />

      <section className="hints">
        {level.hints.slice(0, hintsShown).map((h, i) => (
          <div className="hint" key={i}>
            <div className="hint-title">
              <IconBulb /> {t('lesson.hint', { n: i + 1 })}
            </div>
            <Markdown source={h} />
          </div>
        ))}
        <div className="hint-actions">
          {hintsShown < level.hints.length && (
            <button className="btn" onClick={onShowHint}>
              <IconBulb /> {t(hintsShown === 0 ? 'lesson.firstHint' : 'lesson.moreHint')}
              <span className="muted">
                ({hintsShown}/{level.hints.length})
              </span>
            </button>
          )}
          <button className="btn ghost" onClick={onShowSolution}>
            <IconEye /> {t('lesson.compare')}
          </button>
        </div>
      </section>

      <nav className="lesson-nav">
        {prev ? (
          <button className="btn ghost" onClick={() => onNavigate(prev.id)}>
            <IconArrowLeft /> {prev.title}
          </button>
        ) : (
          <span />
        )}
        {next && (
          <button className={`btn ${completed ? 'primary' : 'ghost'}`} onClick={() => onNavigate(next.id)}>
            {next.title} <IconArrowRight />
          </button>
        )}
      </nav>
    </article>
  );
}

export function PlaygroundIntro() {
  return (
    <article className="lesson">
      <header className="lesson-head">
        <div className="lesson-crumb">{t('app.sandbox')}</div>
        <h1>{t('app.playground')}</h1>
      </header>
      <Markdown className="lesson-body" source={t('playground.intro')} />
    </article>
  );
}

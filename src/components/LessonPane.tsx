import { chapterOf, levelNumber, neighbours } from '../content.ts';
import type { Level } from '../lib/parser.ts';
import { IconArrowLeft, IconArrowRight, IconBulb, IconCircleCheck, IconEye } from './Icons.tsx';
import { Markdown } from './Markdown.tsx';

interface Props {
  level: Level;
  completed: boolean;
  hintsShown: number;
  onShowHint(): void;
  onShowSolution(): void;
  onNavigate(id: string): void;
}

export function LessonPane({ level, completed, hintsShown, onShowHint, onShowSolution, onNavigate }: Props) {
  const ch = chapterOf(level);
  const { prev, next } = neighbours(level.id);
  const modeLabel = level.mode === 'test' ? '测试判题' : level.expect !== null ? '比对输出' : '编译运行';

  return (
    <article className="lesson" key={level.id}>
      <header className="lesson-head">
        <div className="lesson-crumb">
          第 {ch.index + 1} 章 · {ch.title}
        </div>
        <h1>
          <span className="lesson-no">{levelNumber(level)}</span> {level.title}
        </h1>
        <div className="lesson-tags">
          <span className="tag">{modeLabel}</span>
          {level.forbid.length > 0 && (
            <span className="tag warn" title="判题时会检查代码中是否出现这些写法（注释除外）">
              禁用：{level.forbid.join('  ')}
            </span>
          )}
          {level.minTests > 0 && <span className="tag">至少写 {level.minTests} 个测试</span>}
          {completed && (
            <span className="tag ok">
              <IconCircleCheck /> 已通过
            </span>
          )}
        </div>
      </header>

      <Markdown source={level.lesson} className="lesson-body" />

      <section className="hints">
        {level.hints.slice(0, hintsShown).map((h, i) => (
          <div className="hint" key={i}>
            <div className="hint-title">
              <IconBulb /> 提示 {i + 1}
            </div>
            <Markdown source={h} />
          </div>
        ))}
        <div className="hint-actions">
          {hintsShown < level.hints.length && (
            <button className="btn" onClick={onShowHint}>
              <IconBulb /> {hintsShown === 0 ? '给我一点提示' : '再来一条提示'}
              <span className="muted">
                （{hintsShown}/{level.hints.length}）
              </span>
            </button>
          )}
          <button className="btn ghost" onClick={onShowSolution}>
            <IconEye /> 对比参考答案
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
        <div className="lesson-crumb">沙盒</div>
        <h1>自由练习区</h1>
      </header>
      <Markdown
        className="lesson-body"
        source={`这里没有任务也没有判题，想试什么就写什么。代码会自动保存在浏览器里。

- **Ctrl/⌘ + Enter**：运行
- **Shift + Alt + F** 或 **Ctrl/⌘ + S**：用 rustfmt 格式化
- 只能使用标准库（官方 Playground 还额外提供了最常用的 100 个第三方 crate，例如 \`rand\`、\`regex\`、\`serde\`，选择官方 Playground 作为运行环境时可以直接 \`use\`）

想要更完整的开发体验（rust-analyzer 补全、调试器、cargo）？看看项目 README 里的「本地 / 容器 / Codespaces」一节，同样的关卡可以导出成 cargo 项目，在真正的 VS Code 里做。`}
      />
    </article>
  );
}

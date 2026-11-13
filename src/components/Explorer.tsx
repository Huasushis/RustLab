import { useState } from 'react';
import { chapters } from '../content.ts';
import type { Progress } from '../lib/storage.ts';
import { IconBeaker, IconChevron, IconCircle, IconCircleCheck } from './Icons.tsx';

interface Props {
  currentId: string | null;
  progress: Progress;
  onOpen(id: string): void;
  onPlayground(): void;
  playgroundActive: boolean;
}

export function Explorer({ currentId, progress, onOpen, onPlayground, playgroundActive }: Props) {
  const currentChapter = currentId?.split('/')[0];
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(chapters.map((c) => [c.dir, c.dir === currentChapter || c.index === 0])),
  );
  const total = chapters.reduce((n, c) => n + c.levels.length, 0);
  const done = chapters.reduce((n, c) => n + c.levels.filter((l) => progress[l.id]).length, 0);

  return (
    <div className="explorer">
      <div className="panel-header">
        <span>关卡</span>
        <span className="muted">
          {done}/{total}
        </span>
      </div>
      <div className="explorer-progress" role="progressbar" aria-valuenow={done} aria-valuemax={total}>
        <div style={{ width: `${(done / total) * 100}%` }} />
      </div>
      <button className={`tree-item playground-entry ${playgroundActive ? 'active' : ''}`} onClick={onPlayground}>
        <IconBeaker />
        <span>自由练习区</span>
      </button>
      <div className="tree">
        {chapters.map((c) => {
          const finished = c.levels.filter((l) => progress[l.id]).length;
          const isOpen = open[c.dir] || c.dir === currentChapter;
          return (
            <div key={c.dir} className="tree-group">
              <button
                className="tree-chapter"
                aria-expanded={isOpen}
                onClick={() => setOpen((o) => ({ ...o, [c.dir]: !isOpen }))}
                title={c.summary}
              >
                <IconChevron className={`chev ${isOpen ? 'open' : ''}`} />
                <span className="chapter-no">{c.index + 1}</span>
                <span className="chapter-title">{c.title}</span>
                <span className={`chapter-count ${finished === c.levels.length ? 'complete' : ''}`}>
                  {finished}/{c.levels.length}
                </span>
              </button>
              {isOpen &&
                c.levels.map((l, i) => (
                  <button
                    key={l.id}
                    className={`tree-item level ${l.id === currentId ? 'active' : ''}`}
                    onClick={() => onOpen(l.id)}
                  >
                    {progress[l.id] ? <IconCircleCheck className="done" /> : <IconCircle className="todo" />}
                    <span className="level-no">
                      {c.index + 1}.{i + 1}
                    </span>
                    <span className="level-title">{l.title}</span>
                  </button>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

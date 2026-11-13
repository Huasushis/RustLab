// 在构建时把 content/ 下的全部关卡打包进来：站点是纯静态的，不需要任何后端。
import chaptersJson from '../content/chapters.json';
import { parseLevel, type ChapterMeta, type Level } from './lib/parser.ts';

export interface Chapter extends ChapterMeta {
  index: number;
  levels: Level[];
}

const files = import.meta.glob('../content/*/*.md', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;

const byChapter = new Map<string, Level[]>();
for (const [path, raw] of Object.entries(files)) {
  const level = parseLevel(path.replace('../content/', ''), raw);
  const list = byChapter.get(level.chapter) ?? [];
  list.push(level);
  byChapter.set(level.chapter, list);
}

export const chapters: Chapter[] = (chaptersJson as ChapterMeta[]).map((c, index) => ({
  ...c,
  index,
  levels: (byChapter.get(c.dir) ?? []).sort((a, b) => a.slug.localeCompare(b.slug)),
}));

export const allLevels: Level[] = chapters.flatMap((c) => c.levels);

const levelIndex = new Map(allLevels.map((l, i) => [l.id, i]));

export function findLevel(id: string): Level | undefined {
  const i = levelIndex.get(id);
  return i === undefined ? undefined : allLevels[i];
}

export function neighbours(id: string): { prev?: Level; next?: Level } {
  const i = levelIndex.get(id);
  if (i === undefined) return {};
  return { prev: allLevels[i - 1], next: allLevels[i + 1] };
}

export function chapterOf(level: Level): Chapter {
  return chapters.find((c) => c.dir === level.chapter)!;
}

/** 关卡编号，例如 "3.2" */
export function levelNumber(level: Level): string {
  const ch = chapterOf(level);
  return `${ch.index + 1}.${ch.levels.indexOf(level) + 1}`;
}

export const PLAYGROUND_STARTER = `// 自由练习区：随便写点什么吧。Ctrl/⌘ + Enter 运行
use std::collections::HashMap;

fn main() {
    let text = "the quick brown fox jumps over the lazy dog";
    let mut counts: HashMap<char, usize> = HashMap::new();
    for c in text.chars().filter(|c| c.is_alphabetic()) {
        *counts.entry(c).or_insert(0) += 1;
    }
    let mut top: Vec<_> = counts.into_iter().collect();
    top.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
    println!("出现最多的字母: {:?}", &top[..3]);
}
`;

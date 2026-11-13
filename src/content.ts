// 在构建时把 content/ 下的全部关卡（含译文）打包进来：站点是纯静态的，不需要任何后端。
// 中文是原文；同目录下的 xx.en.md 是英文译文，没有译文的关卡显示原文。
import chaptersJson from '../content/chapters.json';
import { getLang, type Lang } from './i18n/index.ts';
import { applyTranslation, parseLevel, splitLocale, type ChapterMeta, type Level } from './lib/parser.ts';

export interface LocalizedLevel extends Level {
  /** 当前语言没有译文、显示的是原文 */
  untranslated: boolean;
}

export interface Chapter extends ChapterMeta {
  index: number;
  levels: LocalizedLevel[];
}

const files = import.meta.glob('../content/*/*.md', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;

const base = new Map<string, Level>();
const translations = new Map<string, Map<string, { path: string; raw: string }>>();
for (const [fullPath, raw] of Object.entries(files)) {
  const path = fullPath.replace('../content/', '');
  const { id, lang } = splitLocale(path);
  if (lang) {
    if (!translations.has(lang)) translations.set(lang, new Map());
    translations.get(lang)!.set(id, { path, raw });
  } else {
    base.set(id, parseLevel(path, raw));
  }
}

interface Catalog {
  chapters: Chapter[];
  levels: LocalizedLevel[];
  index: Map<string, number>;
}

const catalogs = new Map<Lang, Catalog>();

function catalog(): Catalog {
  const lang = getLang();
  const cached = catalogs.get(lang);
  if (cached) return cached;
  const tr = lang === 'zh' ? undefined : translations.get(lang);
  const chapters: Chapter[] = (chaptersJson as ChapterMeta[]).map((meta, index) => {
    const loc = meta.i18n?.[lang];
    const levels = [...base.values()]
      .filter((l) => l.chapter === meta.dir)
      .sort((a, b) => a.slug.localeCompare(b.slug))
      .map((l): LocalizedLevel => {
        const t = tr?.get(l.id);
        return t ? { ...applyTranslation(l, t.path, t.raw), untranslated: false } : { ...l, untranslated: lang !== 'zh' };
      });
    return { ...meta, title: loc?.title ?? meta.title, summary: loc?.summary ?? meta.summary, index, levels };
  });
  const levels = chapters.flatMap((ch) => ch.levels);
  const built: Catalog = { chapters, levels, index: new Map(levels.map((l, i) => [l.id, i])) };
  catalogs.set(lang, built);
  return built;
}

export const getChapters = () => catalog().chapters;
export const getAllLevels = () => catalog().levels;

export function findLevel(id: string): LocalizedLevel | undefined {
  const c = catalog();
  const i = c.index.get(id);
  return i === undefined ? undefined : c.levels[i];
}

export function neighbours(id: string): { prev?: LocalizedLevel; next?: LocalizedLevel } {
  const c = catalog();
  const i = c.index.get(id);
  if (i === undefined) return {};
  return { prev: c.levels[i - 1], next: c.levels[i + 1] };
}

export function chapterOf(level: Level): Chapter {
  return catalog().chapters.find((c) => c.dir === level.chapter)!;
}

/** 关卡编号，例如 "3.2" */
export function levelNumber(level: Level): string {
  const ch = chapterOf(level);
  return `${ch.index + 1}.${ch.levels.findIndex((l) => l.id === level.id) + 1}`;
}

const PLAYGROUND = {
  zh: `// 自由练习区：随便写点什么吧。Ctrl/⌘ + Enter 运行
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
`,
  en: `// Playground: write anything you like. Ctrl/⌘ + Enter to run
use std::collections::HashMap;

fn main() {
    let text = "the quick brown fox jumps over the lazy dog";
    let mut counts: HashMap<char, usize> = HashMap::new();
    for c in text.chars().filter(|c| c.is_alphabetic()) {
        *counts.entry(c).or_insert(0) += 1;
    }
    let mut top: Vec<_> = counts.into_iter().collect();
    top.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
    println!("most common letters: {:?}", &top[..3]);
}
`,
};

export const playgroundStarter = () => PLAYGROUND[getLang()];

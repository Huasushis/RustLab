// 关卡文件解析器。纯函数、无浏览器依赖：前端与 scripts/verify-content.ts 共用。
//
// 关卡文件格式（content/<章节目录>/<序号-名字>.md）：
//
//   ---
//   title: 关卡标题
//   forbid: .clone() | unsafe      （可选：禁止出现的片段，用 | 分隔）
//   min_tests: 3                   （可选：至少要有多少个通过的测试，用于"自己写测试"的关卡）
//   check: test                    （可选：没有 :::tests 块但仍想以测试模式判题时使用）
//   crates: rand, serde            （可选：本关用到的第三方库，仅用于界面展示）
//   ---
//   教程正文（Markdown）……
//
//   :::hint
//   一条提示（可以有多个 hint 块，按顺序逐条解锁）
//   :::
//
//   :::exercise
//   学习者看到的初始代码
//   :::
//
//   :::tests
//   判题时追加到学习者代码末尾的测试（可选）
//   :::
//
//   :::expect
//   期望的标准输出（可选，仅用于没有 tests 的"运行并比对输出"关卡）
//   :::
//
//   :::solution
//   参考答案（必须能通过判题）
//   :::

export interface Level {
  /** 稳定 ID：`<章节目录>/<文件名>`，例如 `01-basics/01-hello` */
  id: string;
  chapter: string;
  slug: string;
  title: string;
  lesson: string;
  hints: string[];
  starter: string;
  solution: string;
  /** 追加到用户代码之后的测试代码；没有则为空串 */
  tests: string;
  /** 运行模式下期望的 stdout；null 表示只要求编译并正常退出 */
  expect: string | null;
  forbid: string[];
  minTests: number;
  crates: string[];
  mode: 'test' | 'run';
}

export interface ChapterMeta {
  dir: string;
  title: string;
  summary: string;
  /** 其它语言的标题和简介，例如 { "en": { "title": "...", "summary": "..." } } */
  i18n?: Record<string, { title: string; summary: string }>;
}

const BLOCK_OPEN = /^:::([a-z]+)\s*$/;
const BLOCK_CLOSE = /^:::\s*$/;
const KNOWN_BLOCKS = new Set(['hint', 'exercise', 'solution', 'tests', 'expect']);

function trimBlock(lines: string[]): string {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim() === '') start++;
  while (end > start && lines[end - 1].trim() === '') end--;
  return lines.slice(start, end).join('\n');
}

/** 文件名里的语言后缀：01-hello.en.md -> { id: '01-basics/01-hello', lang: 'en' } */
export function splitLocale(path: string): { id: string; chapter: string; slug: string; lang: string | null } {
  const parts = path.replace(/\\/g, '/').split('/');
  const file = parts[parts.length - 1].replace(/\.md$/, '');
  const chapter = parts[parts.length - 2];
  const m = /^(.*)\.([a-z]{2}(?:-[A-Za-z]+)?)$/.exec(file);
  const slug = m ? m[1] : file;
  return { id: `${chapter}/${slug}`, chapter, slug, lang: m ? m[2] : null };
}

interface RawLevel {
  meta: Record<string, string>;
  lesson: string;
  blocks: Record<string, string[]>;
}

function parseRaw(id: string, raw: string): RawLevel {
  const fail = (msg: string): never => {
    throw new Error(`[${id}] ${msg}`);
  };
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const meta: Record<string, string> = {};
  let i = 0;
  if (lines[0]?.trim() === '---') {
    i = 1;
    for (; i < lines.length && lines[i].trim() !== '---'; i++) {
      const line = lines[i];
      if (line.trim() === '') continue;
      const m = /^([a-z_]+):\s*(.*)$/.exec(line);
      if (!m) fail(`无法解析的 front matter 行: ${line}`);
      else meta[m[1]] = m[2].trim();
    }
    if (i >= lines.length) fail('front matter 没有结束标记 ---');
    i++;
  }

  const lesson: string[] = [];
  const blocks: Record<string, string[]> = {};
  let current: { name: string; lines: string[] } | null = null;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (current) {
      if (BLOCK_CLOSE.test(line)) {
        (blocks[current.name] ??= []).push(trimBlock(current.lines));
        current = null;
      } else {
        current.lines.push(line);
      }
      continue;
    }
    const open = BLOCK_OPEN.exec(line);
    if (open) {
      if (!KNOWN_BLOCKS.has(open[1])) fail(`未知的块类型 :::${open[1]}`);
      current = { name: open[1], lines: [] };
    } else {
      lesson.push(line);
    }
  }
  if (current) fail(`:::${current.name} 块没有闭合`);
  for (const name of ['exercise', 'solution', 'tests', 'expect']) {
    if ((blocks[name]?.length ?? 0) > 1) fail(`:::${name} 块只能出现一次`);
  }
  if (!meta.title) fail('缺少 title');
  return { meta, lesson: trimBlock(lesson), blocks };
}

const list = (v: string | undefined, sep: string) =>
  v ? v.split(sep).map((s) => s.trim()).filter(Boolean) : [];

export function parseLevel(path: string, raw: string): Level {
  const { id, chapter, slug } = splitLocale(path);
  const { meta, lesson, blocks } = parseRaw(id, raw);
  const fail = (msg: string): never => {
    throw new Error(`[${id}] ${msg}`);
  };
  const starter = blocks.exercise?.[0] ?? fail('缺少 :::exercise 块');
  const solution = blocks.solution?.[0] ?? fail('缺少 :::solution 块');
  const tests = blocks.tests?.[0] ?? '';
  const expect = blocks.expect?.[0] ?? null;
  if (tests && expect !== null) fail(':::tests 与 :::expect 不能同时使用');

  return {
    id,
    chapter,
    slug,
    title: meta.title,
    lesson,
    hints: blocks.hint ?? [],
    starter: starter + '\n',
    solution: solution + '\n',
    tests,
    expect,
    forbid: list(meta.forbid, '|'),
    minTests: meta.min_tests ? Number(meta.min_tests) : 0,
    crates: list(meta.crates, ','),
    mode: tests || meta.check === 'test' ? 'test' : 'run',
  };
}

/**
 * 把译文（例如 01-hello.en.md）合并到原文关卡上。译文必须有 title 和讲解，
 * 其余部分（提示、初始代码、测试、期望输出、参考答案）写了就覆盖，没写就沿用原文。
 */
export function applyTranslation(base: Level, path: string, raw: string): Level {
  const { id, lang } = splitLocale(path);
  const { meta, lesson, blocks } = parseRaw(`${id} (${lang})`, raw);
  const tests = blocks.tests?.[0] ?? base.tests;
  const expect = blocks.expect?.[0] ?? base.expect;
  return {
    ...base,
    title: meta.title,
    lesson,
    hints: blocks.hint ?? base.hints,
    starter: blocks.exercise ? blocks.exercise[0] + '\n' : base.starter,
    solution: blocks.solution ? blocks.solution[0] + '\n' : base.solution,
    tests,
    expect,
    forbid: meta.forbid ? list(meta.forbid, '|') : base.forbid,
  };
}

/** 译文是否改动了会影响判题的部分（需要单独校验） */
export function codeDiffers(a: Level, b: Level): boolean {
  return a.starter !== b.starter || a.solution !== b.solution || a.tests !== b.tests || a.expect !== b.expect;
}

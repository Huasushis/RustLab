// 关卡文件解析器。纯函数、无浏览器依赖：前端与 scripts/verify-content.ts 共用。
//
// 关卡文件格式（content/<章节目录>/<序号-名字>.md）：
//
//   ---
//   title: 关卡标题
//   forbid: .clone() | unsafe      （可选：禁止出现的片段，用 | 分隔）
//   min_tests: 3                   （可选：至少要有多少个通过的测试，用于"自己写测试"的关卡）
//   check: test                    （可选：没有 :::tests 块但仍想以测试模式判题时使用）
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
  mode: 'test' | 'run';
}

export interface ChapterMeta {
  dir: string;
  title: string;
  summary: string;
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

export function parseLevel(path: string, raw: string): Level {
  const parts = path.replace(/\\/g, '/').split('/');
  const file = parts[parts.length - 1].replace(/\.md$/, '');
  const chapter = parts[parts.length - 2];
  const id = `${chapter}/${file}`;
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

  const single = (name: string): string | null => {
    const list = blocks[name];
    if (!list) return null;
    if (list.length > 1) fail(`:::${name} 块只能出现一次`);
    return list[0];
  };

  const starter = single('exercise');
  const solution = single('solution');
  const tests = single('tests') ?? '';
  const expect = single('expect');
  if (!meta.title) fail('缺少 title');
  if (starter === null) fail('缺少 :::exercise 块');
  if (solution === null) fail('缺少 :::solution 块');
  if (tests && expect !== null) fail(':::tests 与 :::expect 不能同时使用');

  const mode: Level['mode'] = tests || meta.check === 'test' ? 'test' : 'run';
  return {
    id,
    chapter,
    slug: file,
    title: meta.title,
    lesson: trimBlock(lesson),
    hints: blocks.hint ?? [],
    starter: starter + '\n',
    solution: solution + '\n',
    tests,
    expect,
    forbid: meta.forbid ? meta.forbid.split('|').map((s) => s.trim()).filter(Boolean) : [],
    minTests: meta.min_tests ? Number(meta.min_tests) : 0,
    mode,
  };
}

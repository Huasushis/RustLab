// 校验 content/ 下的全部关卡：
//   1. 文件格式正确，chapters.json 与目录一致
//   2. 参考答案能通过判题
//   3. 初始代码不能直接通过（否则这关没有意义）
//
//   node scripts/verify-content.ts                 用本机 rustc 校验（需要 Node >= 22.18）
//   node scripts/verify-content.ts --only 02-own   只校验 ID 包含该片段的关卡
//   node scripts/verify-content.ts --playground    改用官方 Playground 校验（慢，串行）
import { readdir, readFile } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileAndRun } from '../runner/exec.mjs';
import { checkLevel, RUST_EDITION, type Executor } from '../src/lib/check.ts';
import { parseLevel, type ChapterMeta, type Level } from '../src/lib/parser.ts';

const root = fileURLToPath(new URL('../content', import.meta.url));
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const usePlayground = args.includes('--playground');

const localExec: Executor = (req) => compileAndRun({ ...req, edition: RUST_EDITION });
const playgroundExec: Executor = async (req) => {
  const res = await fetch('https://play.rust-lang.org/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: 'stable',
      mode: 'debug',
      edition: RUST_EDITION,
      crateType: 'bin',
      tests: req.tests,
      code: req.code,
      backtrace: false,
    }),
  });
  if (!res.ok) throw new Error(`Playground HTTP ${res.status}`);
  return (await res.json()) as { success: boolean; stdout: string; stderr: string };
};
const exec = usePlayground ? playgroundExec : localExec;

const chapters = JSON.parse(await readFile(join(root, 'chapters.json'), 'utf8')) as ChapterMeta[];
const dirs = (await readdir(root, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
const problems: string[] = [];
for (const d of dirs) if (!chapters.some((c) => c.dir === d)) problems.push(`目录 ${d} 没有登记在 chapters.json 里`);
for (const c of chapters) if (!dirs.includes(c.dir)) problems.push(`chapters.json 里的 ${c.dir} 没有对应目录`);

const levels: Level[] = [];
for (const c of chapters) {
  if (!dirs.includes(c.dir)) continue;
  const files = (await readdir(join(root, c.dir))).filter((f) => f.endsWith('.md')).sort();
  if (files.length === 0) problems.push(`章节 ${c.dir} 里没有关卡`);
  for (const f of files) {
    try {
      levels.push(parseLevel(`${c.dir}/${f}`, await readFile(join(root, c.dir, f), 'utf8')));
    } catch (err) {
      problems.push(String(err instanceof Error ? err.message : err));
    }
  }
}

const selected = only ? levels.filter((l) => l.id.includes(only)) : levels;
console.log(`共 ${levels.length} 关，本次校验 ${selected.length} 关（${usePlayground ? '官方 Playground' : '本机 rustc'}）\n`);

async function verify(level: Level): Promise<string[]> {
  const errs: string[] = [];
  const sol = await checkLevel(level, level.solution, exec);
  if (!sol.passed) {
    errs.push(`[${level.id}] 参考答案未通过：${sol.summary}\n${sol.stderr}\n${sol.stdout}`.trimEnd());
  }
  const starter = await checkLevel(level, level.starter, exec);
  if (starter.passed) errs.push(`[${level.id}] 初始代码不改就能通过`);
  if (level.hints.length === 0) errs.push(`[${level.id}] 没有提示`);
  console.log(`${errs.length ? '✗' : '✓'} ${level.id}  ${level.title}`);
  return errs;
}

const queue = [...selected];
const workers = Array.from({ length: usePlayground ? 1 : Math.min(8, availableParallelism()) }, async () => {
  for (let level = queue.shift(); level; level = queue.shift()) {
    try {
      problems.push(...(await verify(level)));
    } catch (err) {
      problems.push(`[${level.id}] 校验过程出错：${err instanceof Error ? err.message : err}`);
    }
  }
});
await Promise.all(workers);

if (problems.length) {
  console.error(`\n发现 ${problems.length} 个问题：\n`);
  for (const p of problems) console.error(`${p}\n`);
  process.exit(1);
}
console.log('\n全部通过 ✓');

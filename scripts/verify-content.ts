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
import { applyTranslation, codeDiffers, parseLevel, splitLocale, type ChapterMeta, type Level } from '../src/lib/parser.ts';

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

const LANGS = ['en'];
const levels: Level[] = [];
/** 需要单独校验的译文版本（改动了代码、测试或期望输出的） */
const variants: { label: string; level: Level }[] = [];
const missing: Record<string, string[]> = Object.fromEntries(LANGS.map((l) => [l, []]));
for (const c of chapters) {
  if (!dirs.includes(c.dir)) continue;
  for (const lang of LANGS) if (!c.i18n?.[lang]) missing[lang].push(`chapters.json: ${c.dir}`);
  const files = (await readdir(join(root, c.dir))).filter((f) => f.endsWith('.md')).sort();
  const baseFiles = files.filter((f) => !splitLocale(`${c.dir}/${f}`).lang);
  if (baseFiles.length === 0) problems.push(`章节 ${c.dir} 里没有关卡`);
  for (const f of baseFiles) {
    let base: Level;
    try {
      base = parseLevel(`${c.dir}/${f}`, await readFile(join(root, c.dir, f), 'utf8'));
    } catch (err) {
      problems.push(String(err instanceof Error ? err.message : err));
      continue;
    }
    levels.push(base);
    variants.push({ label: base.id, level: base });
    for (const lang of LANGS) {
      const tf = f.replace(/\.md$/, `.${lang}.md`);
      if (!files.includes(tf)) {
        missing[lang].push(base.id);
        continue;
      }
      try {
        const tr = applyTranslation(base, `${c.dir}/${tf}`, await readFile(join(root, c.dir, tf), 'utf8'));
        if (tr.hints.length !== base.hints.length) problems.push(`[${base.id}] ${lang} 译文的提示数量与原文不同`);
        if (codeDiffers(base, tr)) variants.push({ label: `${base.id} [${lang}]`, level: tr });
      } catch (err) {
        problems.push(String(err instanceof Error ? err.message : err));
      }
    }
  }
  for (const f of files) {
    const { lang, slug } = splitLocale(`${c.dir}/${f}`);
    if (lang && !files.includes(`${slug}.md`)) problems.push(`${c.dir}/${f} 没有对应的原文`);
    if (lang && !LANGS.includes(lang)) problems.push(`${c.dir}/${f}：未知语言 ${lang}`);
  }
}

const selected = only ? variants.filter((v) => v.label.includes(only)) : variants;
console.log(`共 ${levels.length} 关，本次校验 ${selected.length} 个版本（${usePlayground ? '官方 Playground' : '本机 rustc'}）\n`);

async function verify({ label, level }: { label: string; level: Level }): Promise<string[]> {
  const errs: string[] = [];
  const sol = await checkLevel(level, level.solution, exec);
  if (!sol.passed) {
    errs.push(`[${label}] 参考答案未通过：${sol.summary}\n${sol.stderr}\n${sol.stdout}`.trimEnd());
  }
  const starter = await checkLevel(level, level.starter, exec);
  if (starter.passed) errs.push(`[${label}] 初始代码不改就能通过`);
  if (level.hints.length === 0) errs.push(`[${label}] 没有提示`);
  console.log(`${errs.length ? '✗' : '✓'} ${label}  ${level.title}`);
  return errs;
}

const queue = [...selected];
const workers = Array.from({ length: usePlayground ? 1 : Math.min(8, availableParallelism()) }, async () => {
  for (let v = queue.shift(); v; v = queue.shift()) {
    try {
      problems.push(...(await verify(v)));
    } catch (err) {
      problems.push(`[${v.label}] 校验过程出错：${err instanceof Error ? err.message : err}`);
    }
  }
});
await Promise.all(workers);

for (const [lang, list] of Object.entries(missing)) {
  if (list.length) console.log(`\n⚠ ${lang} 译文缺少 ${list.length} 项（不影响校验结果）：${list.slice(0, 8).join(', ')}${list.length > 8 ? ' …' : ''}`);
}

if (problems.length) {
  console.error(`\n发现 ${problems.length} 个问题：\n`);
  for (const p of problems) console.error(`${p}\n`);
  process.exit(1);
}
console.log('\n全部通过 ✓');

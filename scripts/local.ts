// RustLab 本地模式：在你自己的编辑器（VS Code + rust-analyzer 等）里做题，体验类似 rustlings。
//
//   npm run local -- export            把全部关卡导出到 workspace/（已存在的文件不会被覆盖）
//   npm run local -- watch             监视模式：保存文件就自动判题，通过后自动进入下一关
//   npm run local -- check 02-ownership/01-move    判一关（也可以写文件路径）
//   npm run local -- hint 02-ownership/01-move     查看下一条提示
//   npm run local -- list              查看进度
//
// 判题逻辑与网页版完全相同（src/lib/check.ts），使用本机的 rustc。需要 Node >= 22.18。
import { watch } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileAndRun } from '../runner/exec.mjs';
import { checkLevel, RUST_EDITION, type Executor, type Outcome } from '../src/lib/check.ts';
import { parseLevel, type ChapterMeta, type Level } from '../src/lib/parser.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const contentDir = join(root, 'content');
const ws = resolve(process.env.RUSTLAB_WORKSPACE ?? join(root, 'workspace'));
const progressFile = join(ws, '.rustlab-progress.json');

const c = {
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  orange: (s: string) => `\x1b[38;5;208m${s}\x1b[0m`,
};

const exec: Executor = (req) => compileAndRun({ ...req, edition: RUST_EDITION });

async function loadLevels(): Promise<{ chapters: ChapterMeta[]; levels: Level[] }> {
  const chapters = JSON.parse(await readFile(join(contentDir, 'chapters.json'), 'utf8')) as ChapterMeta[];
  const levels: Level[] = [];
  for (const ch of chapters) {
    const files = (await readdir(join(contentDir, ch.dir))).filter((f) => f.endsWith('.md')).sort();
    for (const f of files) levels.push(parseLevel(`${ch.dir}/${f}`, await readFile(join(contentDir, ch.dir, f), 'utf8')));
  }
  return { chapters, levels };
}

const rsPath = (l: Level) => join(ws, 'exercises', l.chapter, `${l.slug}.rs`);
const mdPath = (l: Level) => join(ws, 'exercises', l.chapter, `${l.slug}.md`);
const binName = (l: Level) => `ch${l.chapter.slice(0, 2)}_${l.slug.replace(/-/g, '_')}`;

type LocalProgress = { done: Record<string, number>; hints: Record<string, number> };

async function loadProgress(): Promise<LocalProgress> {
  try {
    return JSON.parse(await readFile(progressFile, 'utf8')) as LocalProgress;
  } catch {
    return { done: {}, hints: {} };
  }
}

async function saveProgress(p: LocalProgress) {
  await writeFile(progressFile, JSON.stringify(p, null, 2));
}

async function cmdExport(levels: Level[], chapters: ChapterMeta[]) {
  await mkdir(ws, { recursive: true });
  let created = 0;
  for (const l of levels) {
    await mkdir(join(ws, 'exercises', l.chapter), { recursive: true });
    if (!existsSync(rsPath(l))) {
      await writeFile(rsPath(l), l.starter);
      created++;
    }
    const ch = chapters.find((x) => x.dir === l.chapter)!;
    await writeFile(mdPath(l), `# ${l.title}\n\n> ${ch.title} · 判题：npm run local -- check ${l.id}\n\n${l.lesson}\n`);
  }
  const bins = levels.map((l) => `[[bin]]\nname = "${binName(l)}"\npath = "exercises/${l.chapter}/${l.slug}.rs"\n`);
  await writeFile(
    join(ws, 'Cargo.toml'),
    `# 由 npm run local -- export 生成。每一关是一个 bin，rust-analyzer 可以直接识别。\n` +
      `[package]\nname = "rustlab-exercises"\nversion = "0.1.0"\nedition = "${RUST_EDITION}"\npublish = false\n\n` +
      `[lints.rust]\ndead_code = "allow"\nunused_variables = "allow"\n\n${bins.join('\n')}`,
  );
  await writeFile(
    join(ws, 'README.md'),
    `# RustLab 本地练习\n\n每一关是 \`exercises/<章节>/<关卡>.rs\`，旁边的 \`.md\` 是讲解。\n\n` +
      `- \`npm run local -- watch\`：监视模式，保存即判题\n` +
      `- \`npm run local -- check <关卡>\`：判一关\n` +
      `- \`cargo run --bin <名字>\`：直接运行某一关（名字见 Cargo.toml）\n`,
  );
  if (!existsSync(join(ws, '.gitignore'))) await writeFile(join(ws, '.gitignore'), 'target\n');
  console.log(`已导出到 ${c.bold(relative(process.cwd(), ws) || '.')}：新建 ${created} 个练习文件，已有的文件保持不变。`);
  console.log(`下一步：${c.orange('npm run local -- watch')}`);
}

function findLevel(levels: Level[], target: string): Level | undefined {
  const t = target.replace(/\\/g, '/').replace(/\.(rs|md)$/, '');
  return levels.find((l) => t === l.id || t.endsWith(`/${l.id}`) || t === binName(l));
}

function printOutcome(level: Level, out: Outcome) {
  if (out.stderr.trim()) console.log(out.stderr.trimEnd());
  if (out.tests.length) {
    for (const t of out.tests) {
      const mark = t.status === 'ok' ? c.green('✓') : t.status === 'failed' ? c.red('✗') : c.dim('-');
      console.log(`  ${mark} ${t.name}`);
      if (t.status === 'failed' && t.detail) console.log(c.dim(t.detail.replace(/^/gm, '      ')));
    }
  } else if (out.stdout.trim()) {
    console.log(c.dim('── 程序输出 ──'));
    console.log(out.stdout.trimEnd());
  }
  if (out.expected !== null) {
    console.log(c.dim('── 期望输出 ──'));
    console.log(out.expected);
  }
  const head = out.passed ? c.green(c.bold('✓ 通过')) : c.red(c.bold('✗ 未通过'));
  console.log(`\n${head} ${level.id}：${out.summary}`);
}

async function judge(level: Level, p: LocalProgress): Promise<boolean> {
  if (!existsSync(rsPath(level))) {
    console.log(c.red(`找不到 ${rsPath(level)}，先运行 npm run local -- export`));
    return false;
  }
  const code = await readFile(rsPath(level), 'utf8');
  console.log(c.dim(`正在编译 ${relative(process.cwd(), rsPath(level))} …`));
  const out = await checkLevel(level, code, exec);
  printOutcome(level, out);
  if (out.passed && !p.done[level.id]) {
    p.done[level.id] = Date.now();
    await saveProgress(p);
  }
  return out.passed;
}

function banner(level: Level, levels: Level[], p: LocalProgress) {
  const done = levels.filter((l) => p.done[l.id]).length;
  console.log(`\n${c.orange('━'.repeat(60))}`);
  console.log(`${c.bold(level.title)}  ${c.dim(`(${level.id})`)}    进度 ${done}/${levels.length}`);
  console.log(`讲解：${relative(process.cwd(), mdPath(level))}`);
  console.log(`代码：${c.bold(relative(process.cwd(), rsPath(level)))}`);
  console.log(c.dim('保存文件即自动判题。输入 h 回车看提示，n 跳到下一关，q 退出。'));
}

async function cmdWatch(levels: Level[]) {
  const p = await loadProgress();
  let current = levels.find((l) => !p.done[l.id]);
  if (!current) {
    console.log(c.green('🎉 所有关卡都已通过！'));
    return;
  }
  banner(current, levels, p);
  let running = false;
  let again = false;
  const run = async () => {
    if (running) {
      again = true;
      return;
    }
    running = true;
    do {
      again = false;
      console.clear();
      banner(current!, levels, p);
      const passed = await judge(current!, p);
      if (passed) {
        const next = levels.find((l) => !p.done[l.id]);
        if (!next) {
          console.log(c.green('\n🎉 恭喜，所有关卡都已通过！'));
          process.exit(0);
        }
        console.log(c.green(`\n下一关：${next.title}，打开 ${relative(process.cwd(), rsPath(next))} 继续。`));
        current = next;
      }
    } while (again);
    running = false;
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  watch(join(ws, 'exercises'), { recursive: true }, (_e, file) => {
    if (!file || !String(file).endsWith('.rs')) return;
    const changed = findLevel(levels, String(file).split(sep).join('/'));
    if (changed && changed.id !== current!.id) current = changed;
    clearTimeout(timer);
    timer = setTimeout(() => void run(), 150);
  });

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', async (input: string) => {
    const cmd = input.trim();
    if (cmd === 'q') process.exit(0);
    if (cmd === 'h') showHint(current!, p);
    if (cmd === 'n') {
      const i = levels.indexOf(current!);
      current = levels[Math.min(levels.length - 1, i + 1)];
      banner(current, levels, p);
    }
    if (cmd === '' || cmd === 'r') await run();
  });
}

function showHint(level: Level, p: LocalProgress) {
  const n = Math.min((p.hints[level.id] ?? 0) + 1, level.hints.length);
  p.hints[level.id] = n;
  void saveProgress(p);
  for (let i = 0; i < n; i++) console.log(`\n${c.yellow(`💡 提示 ${i + 1}/${level.hints.length}`)}\n${level.hints[i]}`);
}

async function main() {
  const [cmd = 'help', arg] = process.argv.slice(2);
  const { chapters, levels } = await loadLevels();
  if (cmd !== 'export' && cmd !== 'help' && !existsSync(join(ws, 'exercises'))) {
    console.log('还没有导出练习，先执行导出：');
    await cmdExport(levels, chapters);
  }
  switch (cmd) {
    case 'export':
      return cmdExport(levels, chapters);
    case 'watch':
      return cmdWatch(levels);
    case 'check':
    case 'hint': {
      const p = await loadProgress();
      const level = arg ? findLevel(levels, arg) : levels.find((l) => !p.done[l.id]);
      if (!level) {
        console.log(c.red(`找不到关卡 ${arg ?? ''}`));
        process.exit(1);
      }
      if (cmd === 'hint') return showHint(level, p);
      process.exit((await judge(level, p)) ? 0 : 1);
      break;
    }
    case 'list': {
      const p = await loadProgress();
      for (const ch of chapters) {
        console.log(c.bold(`\n${ch.title}`));
        for (const l of levels.filter((x) => x.chapter === ch.dir)) {
          console.log(`  ${p.done[l.id] ? c.green('✓') : c.dim('○')} ${l.id.padEnd(40)} ${l.title}`);
        }
      }
      console.log(`\n已通过 ${levels.filter((l) => p.done[l.id]).length}/${levels.length}`);
      return;
    }
    default:
      console.log(`用法：npm run local -- <export | watch | check [关卡] | hint [关卡] | list>`);
  }
}

await main();

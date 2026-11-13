// Monaco 编辑器（VS Code 的编辑器内核）的按需加载与配置。
// 只打包编辑器本体 + Rust 语法高亮，不包含 CSS/HTML/TS 等语言服务，体积小很多。
import * as monaco from 'monaco-vs/editor/editor.api.js';
import './monaco-contribs.ts';
import 'monaco-vs/languages/definitions/rust/register.js';
import EditorWorker from 'monaco-vs/editor/editor.worker.js?worker';

self.MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
};

monaco.editor.defineTheme('rustlab-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'keyword', foreground: 'f28b54' },
    { token: 'type', foreground: '7fd1c7' },
    { token: 'string', foreground: 'b5cea8' },
    { token: 'comment', foreground: '6f7a87', fontStyle: 'italic' },
  ],
  colors: {
    'editor.background': '#16181d',
    'editor.lineHighlightBackground': '#1f232b',
    'editorGutter.background': '#16181d',
    'editorLineNumber.foreground': '#4b5260',
    'editorLineNumber.activeForeground': '#aeb6c2',
  },
});

monaco.editor.defineTheme('rustlab-light', {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'keyword', foreground: 'b7410e' },
    { token: 'type', foreground: '0f766e' },
    { token: 'comment', foreground: '7a8494', fontStyle: 'italic' },
  ],
  colors: {
    'editor.background': '#ffffff',
    'editor.lineHighlightBackground': '#f4f5f7',
  },
});

// 常用片段补全：没有 rust-analyzer，但写起来能顺手一些
const SNIPPETS: [string, string, string][] = [
  ['println!', 'println!("${1:{}}", ${2});', '打印一行'],
  ['print!', 'print!("${1}");', '打印（不换行）'],
  ['format!', 'format!("${1:{}}", ${2})', '格式化为 String'],
  ['vec!', 'vec![${1}]', '创建 Vec'],
  ['assert_eq!', 'assert_eq!(${1:left}, ${2:right});', '断言相等'],
  ['assert!', 'assert!(${1:cond});', '断言为真'],
  ['todo!', 'todo!()', '占位'],
  ['fn', 'fn ${1:name}(${2}) ${3:-> ${4:()} }{\n\t$0\n}', '函数'],
  ['main', 'fn main() {\n\t$0\n}', 'main 函数'],
  ['struct', 'struct ${1:Name} {\n\t${2:field}: ${3:Type},\n}', '结构体'],
  ['enum', 'enum ${1:Name} {\n\t${2:Variant},\n}', '枚举'],
  ['impl', 'impl ${1:Type} {\n\t$0\n}', 'impl 块'],
  ['implfor', 'impl ${1:Trait} for ${2:Type} {\n\t$0\n}', '为类型实现 trait'],
  ['trait', 'trait ${1:Name} {\n\t$0\n}', 'trait'],
  ['match', 'match ${1:value} {\n\t${2:pattern} => ${3},\n\t_ => ${4},\n}', 'match 表达式'],
  ['iflet', 'if let ${1:Some(x)} = ${2:value} {\n\t$0\n}', 'if let'],
  ['letelse', 'let ${1:Some(x)} = ${2:value} else {\n\t${3:return};\n};', 'let else'],
  ['for', 'for ${1:item} in ${2:iter} {\n\t$0\n}', 'for 循环'],
  ['while', 'while ${1:cond} {\n\t$0\n}', 'while 循环'],
  ['loop', 'loop {\n\t$0\n}', 'loop 循环'],
  ['test', '#[test]\nfn ${1:it_works}() {\n\t$0\n}', '测试函数'],
  ['tests', '#[cfg(test)]\nmod tests {\n\tuse super::*;\n\n\t#[test]\n\tfn ${1:it_works}() {\n\t\t$0\n\t}\n}', '测试模块'],
  ['derive', '#[derive(${1:Debug, Clone, PartialEq})]', 'derive 属性'],
];

const KEYWORDS = (
  'as break const continue crate else enum extern false fn for if impl in let loop match mod move mut pub ref ' +
  'return self Self static struct super trait true type unsafe use where while dyn async await'
).split(' ');

const STD_ITEMS = (
  'String Vec Option Some None Result Ok Err Box Rc Arc RefCell Cell Mutex HashMap HashSet BTreeMap BTreeSet ' +
  'VecDeque Iterator IntoIterator From Into Display Debug Clone Copy Default PartialEq Eq PartialOrd Ord Hash ' +
  'i8 i16 i32 i64 i128 isize u8 u16 u32 u64 u128 usize f32 f64 bool char str'
).split(' ');

const METHODS = (
  'len is_empty push push_str pop insert remove get get_mut contains iter iter_mut into_iter map filter ' +
  'filter_map flat_map fold sum count collect enumerate zip rev take skip chain any all find position max min ' +
  'max_by_key min_by_key sort sort_by sort_by_key dedup retain extend clone to_string to_owned as_str as_ref ' +
  'unwrap unwrap_or unwrap_or_else unwrap_or_default expect map_err ok_or ok_or_else and_then copied cloned ' +
  'chars bytes lines split split_whitespace split_once trim starts_with ends_with parse to_uppercase ' +
  'to_lowercase join entry or_insert or_default keys values borrow borrow_mut lock join spawn send recv'
).split(' ');

monaco.languages.registerCompletionItemProvider('rust', {
  triggerCharacters: ['.'],
  provideCompletionItems(model, position) {
    const word = model.getWordUntilPosition(position);
    const range = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
    const before = model.getLineContent(position.lineNumber).slice(0, word.startColumn - 1);
    const K = monaco.languages.CompletionItemKind;
    if (before.endsWith('.')) {
      return { suggestions: METHODS.map((m) => ({ label: m, kind: K.Method, insertText: m, range })) };
    }
    // 编辑器里已经出现过的标识符，也作为候选
    const seen = new Set<string>();
    for (const m of model.getValue().matchAll(/\b[A-Za-z_][A-Za-z0-9_]{2,}\b/g)) seen.add(m[0]);
    const Rule = monaco.languages.CompletionItemInsertTextRule;
    return {
      suggestions: [
        ...SNIPPETS.map(([label, body, doc]) => ({
          label,
          kind: K.Snippet,
          insertText: body,
          insertTextRules: Rule.InsertAsSnippet,
          documentation: doc,
          range,
        })),
        ...KEYWORDS.map((k) => ({ label: k, kind: K.Keyword, insertText: k, range })),
        ...STD_ITEMS.map((k) => ({ label: k, kind: K.Class, insertText: k, range })),
        ...[...seen]
          .filter((w) => !KEYWORDS.includes(w) && !STD_ITEMS.includes(w))
          .map((w) => ({ label: w, kind: K.Text, insertText: w, range })),
      ],
    };
  },
});

export function applyMonacoTheme(theme: 'dark' | 'light'): void {
  monaco.editor.setTheme(theme === 'dark' ? 'rustlab-dark' : 'rustlab-light');
}

export { monaco };

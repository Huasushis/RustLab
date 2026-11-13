import DOMPurify from 'dompurify';
import { Marked } from 'marked';
import { monaco } from './monaco.ts';

const marked = new Marked({ gfm: true, breaks: false });

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export function renderMarkdown(src: string): string {
  return DOMPurify.sanitize(marked.parse(src, { async: false }));
}

/** 用 Monaco 的 Rust 语法高亮为讲解里的代码块上色，保证和编辑器里看到的一致 */
export async function highlightCode(root: HTMLElement): Promise<void> {
  const blocks = root.querySelectorAll<HTMLElement>('pre > code.language-rust:not([data-hl])');
  await Promise.all(
    [...blocks].map(async (el) => {
      el.dataset.hl = '1';
      const text = (el.textContent ?? '').replace(/\n+$/, '');
      try {
        const html = await monaco.editor.colorize(text, 'rust', { tabSize: 4 });
        el.innerHTML = DOMPurify.sanitize(html);
      } catch {
        /* 保留纯文本 */
      }
    }),
  );
}

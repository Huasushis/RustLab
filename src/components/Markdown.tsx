import { useEffect, useMemo, useRef } from 'react';
import { highlightCode, renderMarkdown } from '../lib/markdown.ts';

export function Markdown({ source, className = '' }: { source: string; className?: string }) {
  const html = useMemo(() => renderMarkdown(source), [source]);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) void highlightCode(ref.current);
  }, [html]);
  return <div ref={ref} className={`markdown ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

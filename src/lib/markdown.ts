import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';

const processor = unified()
  .use(remarkParse)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeStringify, { allowDangerousHtml: true });

export function renderMarkdown(md: string): string {
  return String(processor.processSync(md));
}

export function renderInlineMarkdown(md: string): string {
  const html = renderMarkdown(md.trim());
  return html.replace(/^<p>([\s\S]*)<\/p>\s*$/m, '$1');
}

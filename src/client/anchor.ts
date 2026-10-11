import type { AnnotationAnchor } from '../contract.js';

function hashText(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function textOffset(root: Node, boundary: Node, offset: number): number {
  const range = document.createRange();
  range.selectNodeContents(root);
  range.setEnd(boundary, offset);
  return range.toString().length;
}

/** 将 DOM Range 映射到当前 Surface 的纯文本坐标，并保留重定位所需上下文。 */
export function createTextAnchor(root: HTMLElement, range: Range): AnnotationAnchor {
  const content = root.textContent ?? '';
  const quote = range.toString().trim();
  if (!quote) throw new Error('不能为一个空选区创建批注。');
  const rawStart = textOffset(root, range.startContainer, range.startOffset);
  const leadingTrim = range.toString().length - range.toString().trimStart().length;
  const start = rawStart + leadingTrim;
  const end = start + quote.length;
  return {
    quote,
    start,
    end,
    prefix: content.slice(Math.max(0, start - 48), start),
    suffix: content.slice(end, end + 48),
    contentHash: hashText(content),
  };
}

export function resolveAnchor(content: string, anchor: AnnotationAnchor): { start: number; end: number } | undefined {
  if (content.slice(anchor.start, anchor.end) === anchor.quote) return { start: anchor.start, end: anchor.end };
  const matches: number[] = [];
  let from = 0;
  while (from <= content.length) {
    const index = content.indexOf(anchor.quote, from);
    if (index < 0) break;
    matches.push(index);
    from = index + Math.max(1, anchor.quote.length);
  }
  if (matches.length === 1) return { start: matches[0], end: matches[0] + anchor.quote.length };
  const contextual = matches.filter(index => {
    const before = content.slice(Math.max(0, index - anchor.prefix.length), index);
    const after = content.slice(index + anchor.quote.length, index + anchor.quote.length + anchor.suffix.length);
    return before.endsWith(anchor.prefix) && after.startsWith(anchor.suffix);
  });
  return contextual.length === 1 ? { start: contextual[0], end: contextual[0] + anchor.quote.length } : undefined;
}

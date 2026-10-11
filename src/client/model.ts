import type { Annotation } from '../contract.js';

export function annotationRef(sessionId: string, id: string): string { return `${sessionId}:${id}`; }

export function annotationLabel(comment: string): string {
  const compact = comment.replace(/\s+/g, ' ').trim();
  return `批注：${compact.length > 22 ? `${compact.slice(0, 22)}…` : compact}`;
}

export function formatAnnotation(annotation: Annotation): string {
  const { source, anchor } = annotation;
  return [
    '',
    `【批注｜${source.title}】`,
    `来源：${source.kind} · ${source.uri}`,
    `位置：${anchor.start}-${anchor.end} · 内容指纹 ${anchor.contentHash}`,
    '选中原文：',
    anchor.quote,
    '',
    '前文：',
    anchor.prefix || '（无）',
    '后文：',
    anchor.suffix || '（无）',
    '',
    '我的批注：',
    annotation.comment,
    '---',
    '',
  ].join('\n');
}

export function resolveSessionId(selection: { readonly sessionId?: string } | undefined, legacy: { readonly current?: string } | undefined): string | undefined {
  return selection?.sessionId ?? legacy?.current;
}

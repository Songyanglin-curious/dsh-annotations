// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { AnnotationDraft } from '../src/contract.js';
import type { InputSnapshot, ScopedContext } from '../src/client/input-trigger.js';
import { AnnotationTurnStore } from '../src/client/store.js';

const draft: AnnotationDraft = {
  source: { kind: 'workspace-file', uri: 'docs/a.md', title: 'a.md' },
  anchor: { quote: '准确原文', start: 4, end: 8, prefix: '前文', suffix: '后文', contentHash: 'hash' },
};

function input(overrides: Partial<InputSnapshot> = {}): InputSnapshot {
  return { draft: '请修改', draftRev: 7, phase: 'plain', occurrences: [], ...overrides };
}

describe('本轮批注存储', () => {
  it('把新批注作为原生引用插入当前输入', () => {
    const bail = vi.fn((..._args: unknown[]) => true);
    const store = new AnnotationTurnStore();
    store.bind('s1', { bail } as ScopedContext, input());
    expect(store.add('s1', draft, '改成更直接的表达')).toBe(true);
    const payload = bail.mock.calls[0]?.[2] as { reference: { source: string; ref: string; label: string }; span: { start: number; end: number; draftRev: number } };
    expect(payload.reference).toMatchObject({ source: 'annotations', label: '批注：改成更直接的表达' });
    expect(payload.reference.ref).toMatch(/^s1:/);
    expect(payload.span).toEqual({ start: 3, end: 3, draftRev: 7 });
    expect(store.annotation(payload.reference.ref)).toMatchObject({ comment: '改成更直接的表达', anchor: { quote: '准确原文' } });
  });

  it('输入不可编辑或宿主拒绝插入时不留下失效批注', () => {
    const store = new AnnotationTurnStore();
    const bail = vi.fn((..._args: unknown[]) => false);
    store.bind('s1', { bail } as ScopedContext, input({ phase: 'sending' }));
    expect(store.add('s1', draft, '不会加入')).toBe(false);
    expect(bail).not.toHaveBeenCalled();
    store.updateInput('s1', input());
    expect(store.add('s1', draft, '仍不会加入')).toBe(false);
    const ref = (bail.mock.calls[0]?.[2] as { reference: { ref: string } }).reference.ref;
    expect(store.annotation(ref)).toBeUndefined();
  });

  it('按可见引用偏移移除批注芯片', () => {
    const occurrence = { source: 'annotations', ref: 's1:a1', offset: 8, length: 9 };
    const earlier = { source: 'file', ref: 'f1', offset: 2, length: 5 };
    const bail = vi.fn((..._args: unknown[]) => true);
    const store = new AnnotationTurnStore();
    store.bind('s1', { bail } as ScopedContext, input({ draft: 'ab￼text￼', occurrences: [earlier, occurrence] }));
    store.remove('s1', occurrence);
    expect(bail).toHaveBeenCalledWith(expect.anything(), 'slash/input-insert-text', {
      text: '', span: { start: 4, end: 5, draftRev: 7 },
    });
  });
});

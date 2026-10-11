import type { Annotation, AnnotationDraft } from '../contract.js';
import { ANNOTATION_SOURCE } from '../contract.js';
import { annotationLabel, annotationRef } from './model.js';
import { detectEnd, detectOffset, type InputOccurrence, type InputSnapshot, type ScopedContext, type TokenSpan } from './input-trigger.js';

interface Binding { actx: ScopedContext; input?: InputSnapshot }

export class AnnotationTurnStore {
  private readonly values = new Map<string, Annotation>();
  private readonly bindings = new Map<string, Binding>();
  private readonly listeners = new Set<() => void>();
  private version = 0;

  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  snapshot = () => this.version;
  private emit() { this.version += 1; for (const listener of this.listeners) listener(); }
  bind(sessionId: string, actx: ScopedContext, input?: InputSnapshot) { this.bindings.set(sessionId, { actx, input }); }
  updateInput(sessionId: string, input: InputSnapshot) { const binding = this.bindings.get(sessionId); if (binding) binding.input = input; }
  annotation(ref: string) { return this.values.get(ref); }

  add(sessionId: string, draft: AnnotationDraft, comment: string): boolean {
    const binding = this.bindings.get(sessionId);
    if (!binding?.input || binding.input.phase !== 'plain') return false;
    const id = globalThis.crypto?.randomUUID?.() ?? `annotation-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const annotation: Annotation = { ...draft, id, comment: comment.trim() };
    const ref = annotationRef(sessionId, id);
    this.values.set(ref, annotation);
    const offset = detectEnd(binding.input.draft, binding.input.occurrences);
    const inserted = binding.actx.bail(binding.actx, 'slash/input-insert-reference', {
      reference: { source: ANNOTATION_SOURCE, ref, label: annotationLabel(annotation.comment), clipboardText: `@批注:${id.slice(0, 8)}` },
      span: { start: offset, end: offset, draftRev: binding.input.draftRev },
    }) === true;
    if (!inserted) this.values.delete(ref); else this.emit();
    return inserted;
  }

  active(input: InputSnapshot): Array<{ annotation: Annotation; occurrence: InputOccurrence }> {
    return input.occurrences.flatMap(occurrence => {
      if (occurrence.source !== ANNOTATION_SOURCE) return [];
      const annotation = this.values.get(occurrence.ref);
      return annotation ? [{ annotation, occurrence }] : [];
    });
  }

  edit(ref: string, comment: string) { const item = this.values.get(ref); if (item && comment.trim()) { item.comment = comment.trim(); this.emit(); } }
  remove(sessionId: string, occurrence: InputOccurrence) {
    const binding = this.bindings.get(sessionId);
    if (!binding?.input || binding.input.phase !== 'plain') return;
    const start = detectOffset(occurrence, binding.input.occurrences);
    const span: TokenSpan = { start, end: start + 1, draftRev: binding.input.draftRev };
    if (binding.actx.bail(binding.actx, 'slash/input-insert-text', { text: '', span }) === true) this.emit();
  }
}

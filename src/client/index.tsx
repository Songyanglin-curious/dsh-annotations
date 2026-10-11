import { useState, useSyncExternalStore } from 'react';
import styleText from './style.css?inline';
import { ANNOTATION_SERVICE_READY_EVENT, ANNOTATION_SERVICE_REQUEST_EVENT, ANNOTATION_SERVICE_SYMBOL, ANNOTATION_SOURCE, type Annotation, type AnnotationDraft, type AnnotationService } from '../contract.js';
import { createTextAnchor } from './anchor.js';
import { type InputSnapshot, type InputTriggerSource, type ScopedContext } from './input-trigger.js';
import { formatAnnotation, resolveSessionId } from './model.js';
import { openAnnotationPopover, closePopover } from './popover.js';
import { AnnotationTurnStore } from './store.js';
import { conversationSurface, SurfaceRegistry, workspaceDocumentSurface } from './surfaces.js';

interface ClientContext {
  inputTriggers: { registerSource(source: InputTriggerSource): () => void };
  sessions: { list: { getSnapshot(): { current?: string } }; scope(sessionId: string): ScopedContext | undefined };
  uiWorkspace?: { selection?: { getSnapshot(): { sessionId?: string } } };
  slots: { inject(name: string, factory: () => unknown): unknown; register(options: { name: string; id: string; order?: number; inject?: (sessionId: string) => Record<string, unknown> }, component: unknown): () => void };
  effect?(factory: () => () => void, label?: string): unknown;
}

const store = new AnnotationTurnStore();
const registry = new SurfaceRegistry();

function AnnotationDock({ annotationSessionId, input }: { annotationSessionId: string; input: InputSnapshot }) {
  useSyncExternalStore(store.subscribe, store.snapshot); store.updateInput(annotationSessionId, input);
  const [editing, setEditing] = useState<string>();
  const active = store.active(input); if (!active.length) return null;
  return <div data-annotations-dock=""><div className="annotations-heading">本轮批注 · {active.length}</div>{active.map(({ annotation, occurrence }) => {
    const edit = editing === occurrence.ref;
    return <div className="annotations-row" key={occurrence.ref} title={annotation.anchor.quote}>
      <div><span className="annotations-source">{annotation.source.title}</span><span className="annotations-quote">“{annotation.anchor.quote}”</span><span className="annotations-comment">{annotation.comment}</span></div>
      <button type="button" aria-label="编辑批注" onClick={() => setEditing(edit ? undefined : occurrence.ref)}>✎</button>
      <button type="button" aria-label="移除批注" onClick={() => store.remove(annotationSessionId, occurrence)}>×</button>
      {edit && <AnnotationEdit annotation={annotation} onCancel={() => setEditing(undefined)} onSave={value => { store.edit(occurrence.ref, value); setEditing(undefined); }} />}
    </div>;
  })}</div>;
}

function AnnotationEdit({ annotation, onCancel, onSave }: { annotation: Annotation; onCancel(): void; onSave(value: string): void }) {
  const [value, setValue] = useState(annotation.comment);
  return <div className="annotations-edit"><textarea aria-label="批注内容" value={value} onChange={event => setValue(event.target.value)} /><div><button onClick={onCancel}>取消</button><button onClick={() => onSave(value)} disabled={!value.trim()}>保存</button></div></div>;
}

export const inject = ['slots', 'sessions', 'inputTriggers', 'uiWorkspace'];

export function apply(ctx: ClientContext): void {
  if (typeof document === 'undefined') return;
  const style = document.createElement('style'); style.dataset.annotationsStyle = ''; style.textContent = styleText; document.head.appendChild(style);
  const disposeConversation = registry.register(conversationSurface());
  const disposeWorkspaceDocument = registry.register(workspaceDocumentSurface());
  const service: AnnotationService = {
    registerSurface: adapter => registry.register(adapter),
    capture(draft, anchor, bounds) {
      const sessionId = resolveSessionId(ctx.uiWorkspace?.selection?.getSnapshot(), ctx.sessions.list.getSnapshot());
      if (sessionId) openAnnotationPopover(anchor, bounds, draft, comment => store.add(sessionId, draft, comment));
    },
  };
  window[ANNOTATION_SERVICE_SYMBOL] = service;
  const announceService = () => document.dispatchEvent(new CustomEvent(ANNOTATION_SERVICE_READY_EVENT, { detail: service }));
  document.addEventListener(ANNOTATION_SERVICE_REQUEST_EVENT, announceService);
  announceService();
  const source: InputTriggerSource = { trigger: '@', name: ANNOTATION_SOURCE, order: 5, showGroupTitle: false, candidates: async () => [], onPick: () => undefined, codec: { clipboardText: ref => `@批注:${ref.split(':').at(-1)?.slice(0, 8) ?? ''}`, serialize: async ref => { const item = store.annotation(ref); if (!item) throw new Error('本轮批注已失效，请移除后重新添加。'); return formatAnnotation(item); } } };
  const disposeSource = ctx.inputTriggers.registerSource(source);
  let disposeDock: (() => void) | undefined;
  ctx.slots.inject('conversation.input.dock', () => { disposeDock = ctx.slots.register({ name: 'conversation.input.dock', id: 'annotations', order: 10, inject: sessionId => { const actx = ctx.sessions.scope(sessionId); if (!actx) throw new Error(`批注：找不到会话 ${sessionId}`); store.bind(sessionId, actx); return { annotationSessionId: sessionId }; } }, AnnotationDock); return disposeDock; });

  const onMouseUp = (event: MouseEvent) => queueMicrotask(() => {
    const eventElement = event.target instanceof Element ? event.target : event.target instanceof Node ? event.target.parentElement : null;
    if (eventElement?.closest('[data-annotations-menu],[data-annotations-editor]')) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) { closePopover(); return; }
    const range = selection.getRangeAt(0); const match = registry.match(range.commonAncestorContainer); if (!match || !match.root.contains(range.commonAncestorContainer)) return;
    let draft: AnnotationDraft; try { draft = { source: match.source, anchor: createTextAnchor(match.root, range) }; } catch { return; }
    const rangeRect = typeof range.getBoundingClientRect === 'function' ? range.getBoundingClientRect() : undefined;
    const anchorRect = rangeRect && (rangeRect.width || rangeRect.height)
      ? rangeRect
      : new DOMRect(event.clientX, event.clientY, 0, 0);
    service.capture(draft, anchorRect, match.root.getBoundingClientRect());
  });
  document.addEventListener('mouseup', onMouseUp);
  ctx.effect?.(() => () => {
    document.removeEventListener('mouseup', onMouseUp); document.removeEventListener(ANNOTATION_SERVICE_REQUEST_EVENT, announceService); closePopover(); disposeConversation(); disposeWorkspaceDocument(); disposeDock?.(); disposeSource(); style.remove();
    if (window[ANNOTATION_SERVICE_SYMBOL] === service) delete window[ANNOTATION_SERVICE_SYMBOL];
  }, 'annotations: client');
}

export { currentAnnotationService } from '../contract.js';
export type { Annotation, AnnotationAnchor, AnnotationDraft, AnnotationService, AnnotationSource, AnnotationSurfaceAdapter, AnnotationSurfaceMatch } from '../contract.js';

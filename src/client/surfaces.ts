import type { AnnotationSource, AnnotationSurfaceAdapter, AnnotationSurfaceMatch } from '../contract.js';

export class SurfaceRegistry {
  private readonly adapters: AnnotationSurfaceAdapter[] = [];
  register(adapter: AnnotationSurfaceAdapter): () => void {
    if (this.adapters.some(item => item.id === adapter.id)) throw new Error(`批注 Surface 已注册：${adapter.id}`);
    this.adapters.push(adapter);
    return () => { const index = this.adapters.indexOf(adapter); if (index >= 0) this.adapters.splice(index, 1); };
  }
  match(target: Node): AnnotationSurfaceMatch | undefined {
    for (let index = this.adapters.length - 1; index >= 0; index -= 1) {
      const match = this.adapters[index].match(target);
      if (match) return match;
    }
    return undefined;
  }
}

function nearestReadableBlock(target: Node, boundary: HTMLElement): HTMLElement {
  const element = target instanceof Element ? target : target.parentElement;
  return element?.closest<HTMLElement>('p,li,pre,blockquote,h1,h2,h3,h4,h5,h6,[role="article"]') ?? boundary;
}

/** DSH 0.2 暂无消息选区插槽；把 DOM 假设收敛在此适配器。 */
export function conversationSurface(): AnnotationSurfaceAdapter {
  return {
    id: 'dsh-conversation',
    match(target) {
      const element = target instanceof Element ? target : target.parentElement;
      const boundary = element?.closest<HTMLElement>('[data-conversation-content]');
      if (!boundary || element?.closest('[data-composer-seat],[data-annotations-dock],[data-annotations-editor]')) return undefined;
      const sessionId = boundary.dataset.conversationSession;
      if (!sessionId) return undefined;
      const root = nearestReadableBlock(target, boundary);
      const source: AnnotationSource = { kind: 'conversation', uri: `dsh://session/${sessionId}`, title: '对话消息', metadata: { sessionId } };
      return { root, source };
    },
  };
}

/** DSH 原生右侧栏的 Markdown / 纯文本文件预览。 */
export function workspaceDocumentSurface(): AnnotationSurfaceAdapter {
  return {
    id: 'dsh-workspace-document',
    match(target) {
      const element = target instanceof Element ? target : target.parentElement;
      const root = element?.closest<HTMLElement>('[data-document-markdown],[data-textpreview-plain]');
      if (!root) return undefined;
      const preview = root.closest<HTMLElement>('[data-textpreview-url]');
      const uri = preview?.dataset.textpreviewUrl;
      if (!preview || !uri) return undefined;
      const displayedPath = preview.querySelector<HTMLElement>('[data-textpreview-path]')?.textContent?.trim();
      const fallbackTitle = decodeURIComponent(uri.split(/[\\/]/).at(-1) ?? uri);
      return {
        root,
        source: {
          kind: 'workspace-file',
          uri,
          title: displayedPath || fallbackTitle || '工作区文件',
          metadata: preview.dataset.documentPreview ? { previewId: preview.dataset.documentPreview } : undefined,
        },
      };
    },
  };
}

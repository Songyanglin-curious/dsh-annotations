// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { conversationSurface, SurfaceRegistry, workspaceDocumentSurface } from '../src/client/surfaces.js';

describe('Surface 注册表', () => {
  it('后注册的插件 Surface 优先', () => {
    const root = document.createElement('div'); const child = document.createTextNode('文字'); root.appendChild(child);
    const registry = new SurfaceRegistry();
    registry.register({ id: 'first', match: () => ({ root, source: { kind: 'first', uri: 'a', title: 'A' } }) });
    registry.register({ id: 'second', match: () => ({ root, source: { kind: 'second', uri: 'b', title: 'B' } }) });
    expect(registry.match(child)?.source.kind).toBe('second');
  });
  it('识别 DSH 对话并排除输入区域', () => {
    const root = document.createElement('div'); root.dataset.conversationContent = ''; root.dataset.conversationSession = 's1';
    const p = document.createElement('p'); p.textContent = '回答'; root.appendChild(p); document.body.appendChild(root);
    expect(conversationSurface().match(p.firstChild!)?.source.uri).toBe('dsh://session/s1');
    const composer = document.createElement('div'); composer.dataset.composerSeat = ''; composer.textContent = '输入'; root.appendChild(composer);
    expect(conversationSurface().match(composer.firstChild!)).toBeUndefined();
  });
  it('识别 DSH 原生 Markdown 文件预览', () => {
    const preview = document.createElement('section'); preview.dataset.textpreviewUrl = 'session-file://s1/docs/note.md'; preview.dataset.documentPreview = 'preview-1';
    const path = document.createElement('div'); path.dataset.textpreviewPath = ''; path.textContent = 'docs/note.md';
    const markdown = document.createElement('article'); markdown.dataset.documentMarkdown = ''; markdown.innerHTML = '<p>可批注正文</p>';
    preview.append(path, markdown); document.body.appendChild(preview);
    const result = workspaceDocumentSurface().match(markdown.querySelector('p')!.firstChild!);
    expect(result?.root).toBe(markdown);
    expect(result?.source).toEqual({ kind: 'workspace-file', uri: 'session-file://s1/docs/note.md', title: 'docs/note.md', metadata: { previewId: 'preview-1' } });
  });
});

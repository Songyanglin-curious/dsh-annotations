// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ANNOTATION_SERVICE_READY_EVENT, ANNOTATION_SERVICE_REQUEST_EVENT, ANNOTATION_SERVICE_SYMBOL, type AnnotationService } from '../src/contract.js';
import { apply } from '../src/client/index.js';

afterEach(() => {
  document.body.replaceChildren();
  document.head.querySelectorAll('[data-annotations-style]').forEach(node => node.remove());
  delete window[ANNOTATION_SERVICE_SYMBOL];
});

describe('Annotations 客户端桥接', () => {
  it('发布服务并响应晚加载插件的主动请求', () => {
    let cleanup = () => {};
    const registerSource = vi.fn(() => () => {});
    const ready = vi.fn<(event: Event) => void>();
    document.addEventListener(ANNOTATION_SERVICE_READY_EVENT, ready);
    apply({
      inputTriggers: { registerSource },
      sessions: { list: { getSnapshot: () => ({ current: 's1' }) }, scope: () => undefined },
      slots: { inject: () => undefined, register: () => () => {} },
      effect: factory => { cleanup = factory(); },
    });

    expect(window[ANNOTATION_SERVICE_SYMBOL]).toBeDefined();
    expect(registerSource).toHaveBeenCalledOnce();
    expect(ready).toHaveBeenCalledOnce();
    ready.mockClear();
    document.dispatchEvent(new CustomEvent(ANNOTATION_SERVICE_REQUEST_EVENT));
    expect(ready).toHaveBeenCalledOnce();
    expect((ready.mock.calls[0]?.[0] as CustomEvent<AnnotationService>).detail).toBe(window[ANNOTATION_SERVICE_SYMBOL]);

    cleanup();
    expect(window[ANNOTATION_SERVICE_SYMBOL]).toBeUndefined();
    document.removeEventListener(ANNOTATION_SERVICE_READY_EVENT, ready);
  });
});

// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createTextAnchor, resolveAnchor } from '../src/client/anchor.js';

describe('文本锚点', () => {
  it('从 DOM Range 保存纯文本范围和前后文', () => {
    const root = document.createElement('div'); root.innerHTML = '<p>开头<strong>目标文字</strong>结尾</p>'; document.body.appendChild(root);
    const text = root.querySelector('strong')!.firstChild!; const range = document.createRange(); range.setStart(text, 0); range.setEnd(text, 4);
    const anchor = createTextAnchor(root, range);
    expect(anchor).toMatchObject({ quote: '目标文字', start: 2, end: 6, prefix: '开头', suffix: '结尾' });
    expect(anchor.contentHash).toMatch(/^[0-9a-f]{8}$/);
  });
  it('内容偏移后用唯一原文重新定位', () => {
    const anchor = { quote: '目标', start: 2, end: 4, prefix: '开头', suffix: '结尾', contentHash: 'x' };
    expect(resolveAnchor('新增开头目标结尾', anchor)).toEqual({ start: 4, end: 6 });
  });
  it('重复且上下文不足时拒绝猜测', () => {
    const anchor = { quote: '重复', start: 99, end: 101, prefix: '', suffix: '', contentHash: 'x' };
    expect(resolveAnchor('重复与重复', anchor)).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import { annotationLabel, annotationRef, formatAnnotation, resolveSessionId } from '../src/client/model.js';

const annotation = {
  id: 'a1', comment: '改成有限定条件的表达。',
  source: { kind: 'workspace-file', uri: 'file:///notes/test.md', title: '测试文章' },
  anchor: { quote: '这个结论总是成立', start: 10, end: 18, prefix: '此前说过：', suffix: '。下一段', contentHash: '1234abcd' },
};

describe('批注模型', () => {
  it('序列化时包含准确来源、范围、上下文与用户意见', () => {
    const text = formatAnnotation(annotation);
    expect(text).toContain('来源：workspace-file · file:///notes/test.md');
    expect(text).toContain('位置：10-18 · 内容指纹 1234abcd');
    expect(text).toContain('此前说过：');
    expect(text).toContain('改成有限定条件的表达。');
  });
  it('保持会话隔离并生成简短标签', () => {
    expect(annotationRef('s1', 'a1')).toBe('s1:a1');
    expect(annotationLabel('  一条   批注 ')).toBe('批注：一条 批注');
  });
  it('优先使用 Workspace 当前会话', () => {
    expect(resolveSessionId({ sessionId: 'new' }, { current: 'old' })).toBe('new');
  });
});

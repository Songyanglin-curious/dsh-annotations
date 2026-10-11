import type { Context } from '@deepseek-ai/cordis';

export const name = 'annotations';

export function apply(ctx: Context): void {
  ctx.logger.info('Annotations 插件已加载。');
  ctx.effect(() => () => ctx.logger.info('Annotations 插件已卸载。'));
}

export default apply;

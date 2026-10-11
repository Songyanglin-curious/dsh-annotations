# DSH Annotations

DSH 的通用行内批注插件。它把“选中原文、写下意见、加入当前会话”组织成一个轻量闭环，并保留来源与文本锚点，供 AI 准确理解批注针对的位置。

## 当前能力

- 在 DSH 普通对话内容中选中文字并添加批注；
- 将多条批注作为引用 chip 聚合到当前会话输入框；
- 在发送前编辑或移除本轮批注；
- 保存来源 URI、选区范围、前后文和内容指纹；
- 通过公共 Surface API 接入 Markdown 文件、Sift Reference 等其他内容区域。

## 开发

```powershell
pnpm install
pnpm check
pnpm test
pnpm build
```

当前适配 DSH `0.2.0-rc.2`，要求 Node.js 24 或更高版本。

本地与其他插件联调时，可直接安装仓库链接：

```powershell
dsh plugin --profile <profile> add 'link:D:\code\dsh-annotations'
```

Annotations 可以独立用于日常 DSH 对话；Sift 只是一个可选的内容区域提供方。两者通过事件握手和稳定的 Surface 结构契约协作，任意加载顺序都可以工作。

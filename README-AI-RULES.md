# PhotoX AI 规则配置指南

本项目使用 `AGENTS.md` 作为 AI 编码规范的单一事实来源。

## 各 IDE/工具配置方式

| 工具 | 识别文件 | 配置方式 |
|------|----------|----------|
| GitHub Copilot | `AGENTS.md` | ✅ 原生支持，无需配置 |
| Qwen Code | `AGENTS.md` | ✅ 原生支持，无需配置 |
| Cline | `.clinerules` | 运行: `ln -s AGENTS.md .clinerules` |
| Windsurf | `.windsurfrules` | 运行: `ln -s AGENTS.md .windsurfrules` |
| Cursor | `.cursorrules` | 运行: `ln -s AGENTS.md .cursorrules` |

## 维护须知

- 所有规范修改 **仅编辑 `AGENTS.md`**
- 软链接文件会自动同步，切勿直接修改
- 更新后务必同步 `architecture.md` 的版本号
- CI 会在 PR 阶段自动校验版本一致性

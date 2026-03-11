# OpenClaw 部署与沙箱环境配置指南

## 核心架构
- **Gateway & Bridge**: 基于 Docker 的隔离服务。
- **Node.js 工具**: `bin/openclaw-setup.js` 驱动自动化流程。

## 目录索引
- 部署配置: `docker-compose.yml`
- 自动化逻辑: `scripts/commands/`
- 环境检测: `scripts/commands/check-env.js`
- 变量初始化: `scripts/commands/init-env.js`
- 成本统计: `scripts/commands/stats.js`

## 开发规范
- **语言**: 中文强制 (注释/文档)。
- **运行**: 必须在项目根目录执行。
- **代码提交**: 禁止自动 `git commit`，修改后须询问用户。
- **逻辑实现**: 严禁 Shell 脚本，统一使用 Node.js (ESM)。

## Token 优化配置
- **压缩模式**: `agents.defaults.compaction.mode` (safeguard/default)。
- **触发阈值**: `agents.defaults.compaction.reserveTokensFloor` (默认 24k)。
- **工具裁剪**: `agents.defaults.contextPruning.softTrim.maxChars` (限制工具输出)。
- **Memory RAG**: 优先使用 `memorySearch` 减少 System Prompt 压力。

## 常用命令
```bash
npm run setup          # 完整安装
node bin/openclaw-setup.js stats  # 查看 Token 统计
node bin/openclaw-setup.js deploy # 单独部署
```

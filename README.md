# OpenClaw Docker 部署指南
本项目包含了用于在 Docker 沙箱模式 (Sandbox Mode) 下运行 OpenClaw 的配置与自动化部署工具。

## 快速开始

**重要提示：所有命令必须在项目根目录下执行。**

1. **安装环境与部署**：
   本项目提供了一个基于 Node.js 的自动化工具，可以一键检测环境、配置变量并启动服务。
   ```bash
   npm install
   npm run setup
   ```

2. **手动操作（可选）**：
   如果你想分步骤执行，可以使用以下命令：
   - 检测环境：`node bin/openclaw-setup.js check-env`
   - 初始化配置：`node bin/openclaw-setup.js init-env`
   - 执行部署：`node bin/openclaw-setup.js deploy`

3. **插件配置**：
   例如配置飞书插件：
   ```bash
   node bin/openclaw-setup.js feishu
   ```

## 常用运维命令

| 操作 | 命令 | 说明 |
| :--- | :--- | :--- |
| **启动服务** | `docker compose up -d` | 后台启动所有服务 |
| **停止并移除容器** | `docker compose down` | 停止服务并释放相关资源 |
| **停止容器** | `docker compose stop` | 仅停止运行，保留容器状态 |
| **重启服务** | `docker compose restart` | 快速重启所有容器 |
| **查看日志** | `docker compose logs -f` | 实时查看运行日志 |
| **查看状态** | `docker compose ps` | 检查各容器运行状态 |

## 目录结构

- `bin/`: 自动化脚本入口。
- `scripts/`: 自动化逻辑与工具类。
- `docker-compose.yml`: Docker 容器编排配置。
- `docs/`: 详细的使用指南与故障排除文档。

## 常见问题 (FAQ)

If you encounter any issues during deployment or use, please refer to:
- [Usage Guide (docs/usage.md)](docs/usage.md)
- [Troubleshooting Guide (docs/troubleshooting.md)](docs/troubleshooting.md)

## 参考指令
列举设备: docker compose exec openclaw-gateway openclaw devices list
绑定设备: docker compose exec openclaw-gateway openclaw devices approve <Request-ID>
飞书私聊机器人绑定: docker compose exec openclaw-gateway openclaw pairing approve feishu <Pairing-Code>

# OpenClaw 使用指南

在成功执行 `docker-compose up -d` 启动沙箱环境后，你可以按照以下指南开始使用 OpenClaw。

## 1. 检查服务是否启动成功

首次启动时，网关 (Gateway) 会进行初始化，你可以通过以下命令检查容器状态：

```bash
# 查看容器是否处于 Up 状态，且没有不断 Restarting
docker ps

# 查看 Gateway 的运行日志，确认是否有报错
docker logs openclaw-openclaw-gateway-1
```

## 2. 获取并进入 Web 后台 (Dashboard)

为了安全起见，OpenClaw 的控制面板需要携带 Token 才能访问。你可以通过以下命令生成并获取你的专属后台访问链接：

```bash
docker-compose run --rm openclaw-gateway node dist/index.js dashboard
```

命令执行后，终端会输出类似如下的链接：
```text
Dashboard URL: http://127.0.0.1:18789/#token=your_random_gateway_token_here
```
复制该链接在浏览器中打开，即可进入可视化控制面板。

*(注：如果在宿主机外访问，请将 `127.0.0.1` 替换为服务器的局域网或公网 IP，并确保已经参考故障排除指南将 `gateway.bind` 设置为 `lan`)*

## 3. 配置大模型与社交软件

你有两种方式来配置 API 密钥（如 OpenAI, Claude 等）和社交账号（如 Telegram, Discord, WhatsApp 等）：

### 方式一：通过 Web 控制面板（推荐）
进入上述获取的 Dashboard 链接后，在图形界面中可以直接绑定各种大模型的 API Key，并在 Channels 页面扫码或授权登录社交软件。

### 方式二：通过命令行 (CLI) 操作
如果你更习惯使用终端，可以通过以下子命令进行管理：

- **管理/登录社交渠道 (Channels)**：
  ```bash
  docker-compose run --rm openclaw-gateway node dist/index.js channels login
  ```
- **查看与配置大模型 (Models)**：
  ```bash
  docker-compose run --rm openclaw-gateway node dist/index.js models
  ```
- **配置系统参数与快捷管理 (Config)**：
  ```bash
  docker-compose run --rm openclaw-gateway node dist/index.js config
  ```


## 4. Token 成本优化与 Memory RAG

OpenClaw 提供了多层次的 Token 优化机制，可以通过以下配置进行优化：

### 自动上下文压缩 (Compaction)
当对话历史过长时，OpenClaw 会自动将旧消息摘要化。
- **配置级别**: 在 `npm run setup` 时选择 `high` 级别将启用更激进的压缩。
- **手动设置**:
  ```bash
  docker compose exec openclaw-gateway node dist/index.js config set agents.defaults.compaction.mode safeguard
  docker compose exec openclaw-gateway node dist/index.js config set agents.defaults.compaction.reserveTokensFloor 32000
  ```

### 工具输出限制
避免 Agent 调用工具（如抓取网页）返回过长内容。
- **软裁剪**: 自动保留头部和尾部，裁剪中间部分。
  ```bash
  docker compose exec openclaw-gateway node dist/index.js config set agents.defaults.contextPruning.softTrim.maxChars 2000
  ```

### 使用 Memory RAG 降低成本
相比于将所有背景资料放入 System Prompt，使用 Memory 索引可以按需检索，极大节省 Token。
- **初始化索引**:
  ```bash
  docker compose exec openclaw-gateway node dist/index.js memory reindex
  ```
- **开启内存检索**:
  ```bash
  docker compose exec openclaw-gateway node dist/index.js config set agents.defaults.memorySearch.provider local
  ```

### 实时监控消耗
项目内置了统计工具，可以查看各 Agent 的消耗：
```bash
node bin/openclaw-setup.js stats
```

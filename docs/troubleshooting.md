# OpenClaw 故障排除指南

## 1. 无法访问 Dashboard (Connection Refused)

**问题描述：**
使用 `docker-compose up -d` 启动后，获取到的 Dashboard URL（如 `http://127.0.0.1:18789/#token=...`）在浏览器中无法访问，提示连接被拒绝（Connection Refused）。

**原因：**
OpenClaw 默认将 Web 服务绑定到 `127.0.0.1`（本地回环地址）。在 Docker 容器内部，`127.0.0.1` 仅代表容器自身，导致宿主机和其他外部设备无法访问该端口。

**解决办法：**
需要修改 OpenClaw 的网关配置，使其监听所有网络接口（`lan` 模式或 `0.0.0.0`）。

1. 更改绑定模式为 `lan`：
   ```bash
   docker-compose run --rm openclaw-gateway node dist/index.js config set gateway.bind lan
   ```

2. 重启服务使配置生效：
   ```bash
   docker-compose restart
   ```

修改后，通过容器映射出的 `18789` 端口即可正常访问后台。如果需要跨设备访问，请将 URL 中的 `127.0.0.1` 替换为宿主机的局域网或公网 IP 地址。


如果提示需要配对:
docker-compose exec openclaw-gateway openclaw devices list --token your_random_gateway_token_here

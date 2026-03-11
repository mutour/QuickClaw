import { execa } from 'execa';
import chalk from 'chalk';
import ora from 'ora';
import * as dotenv from 'dotenv';
import { confirm } from '@inquirer/prompts';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pluginManager } from '../utils/plugin-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
async function getComposeCommand() {
  try {
    await execa('docker', ['compose', 'version']);
    return ['docker', 'compose'];
  } catch {
    try {
      await execa('docker-compose', ['--version']);
      return ['docker-compose'];
    } catch {
      return ['docker', 'compose'];
    }
  }
}

async function runCompose(composeCmd, args, options = {}) {
  const [file, ...baseArgs] = composeCmd;
  return execa(file, [...baseArgs, ...args], options);
}

async function isContainerRunning(composeCmd) {
  try {
    const { stdout } = await runCompose(composeCmd, ['ps', '--filter', 'status=running', '--quiet', 'openclaw-gateway']);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

async function waitForGateway(port, spinner, timeoutMs = 60000) {
  let isReady = false;
  while (!isReady) {
    const start = Date.now();
    spinner.start(`正在等待 Gateway 响应 (最长 ${timeoutMs / 1000}s)...`);
    let currentWaitSuccess = false;
    while (Date.now() - start < timeoutMs) {
      try {
        const response = await fetch(`http://localhost:${port}/health`).catch(() => null);
        if (response && response.ok) {
          currentWaitSuccess = true;
          break;
        }
      } catch {
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    if (currentWaitSuccess) {
      spinner.succeed(chalk.green('Gateway 已就绪。'));
      isReady = true;
      break;
    } else {
      spinner.warn(chalk.yellow('Gateway 响应超时。'));
      const shouldContinue = await confirm({
        message: 'Gateway 尚未就绪，可能由于 Docker 首次启动较慢。是否继续等待 (60s)？',
        default: true,
      });
      if (!shouldContinue) {
        return false;
      }
    }
  }
  return true;
}

export default {
  name: 'deploy',
  description: '部署 OpenClaw 服务并配置插件',
  dependencies: ['init-env'],
  action: async (options) => {
    dotenv.config();
    const composeCmd = await getComposeCommand();
    const port = process.env.OPENCLAW_GATEWAY_PORT || '18789';
    const token = process.env.OPENCLAW_GATEWAY_TOKEN;
    const listenIp = process.env.OPENCLAW_LISTEN_IP || '127.0.0.1';

    if (!token) {
      console.error(chalk.red('错误: 未在 .env 中找到 OPENCLAW_GATEWAY_TOKEN。请先运行 init-env。'));
      throw new Error('未找到 GATEWAY_TOKEN');
    }

    const isRunning = await isContainerRunning(composeCmd);
    if (isRunning && !options.force) {
      if (options.yes) {
        console.log(chalk.blue('OpenClaw Gateway 已在运行，跳过重新部署。'));
      } else {
        const shouldReRun = await confirm({
          message: 'OpenClaw Gateway 容器已在运行。是否要重新部署？',
          default: false,
        });
        if (!shouldReRun) {
          console.log(chalk.blue('已跳过部署。'));
          return;
        }
      }
    }

    const spinner = ora('正在准备 OpenClaw 镜像...').start();
    try {
      // 总是尝试拉取镜像以确保版本正确（特别是 latest 标签）
      await runCompose(composeCmd, ['pull']);
      spinner.text = '正在启动 OpenClaw 容器...';
      await runCompose(composeCmd, ['up', '-d']);
      spinner.succeed(chalk.green('容器启动指令已发送。'));
    } catch (error) {
      spinner.fail(chalk.red(`启动容器失败: ${error.message}`));
      throw error;
    }

    // 在等待就绪之前，强制执行一次配置注入（通过 docker exec，不依赖网络可达性）
    const forceConfig = async (args) => {
      try {
        await runCompose(composeCmd, ['exec', 'openclaw-gateway', 'node', 'dist/index.js', ...args]);
      } catch (e) {
        await runCompose(composeCmd, ['run', '--rm', 'openclaw-gateway', 'node', 'dist/index.js', ...args]);
      }
    };

    const configSpinner = ora('正在初始化容器内配置...').start();
    try {
      // 在 Docker 容器内，必须监听非 127.0.0.1 才能接收来自宿主机的映射流量。
      // 所以即使外部锁定为 127.0.0.1，容器内部依然建议使用 'lan' 或 'auto'。
      const bindMode = listenIp === '0.0.0.0' ? 'lan' : 'lan'; 
      await forceConfig(['config', 'set', 'gateway.bind', bindMode]);
      await forceConfig(['config', 'set', 'gateway.mode', 'local']);
      configSpinner.succeed(chalk.green(`基础配置初始化成功 (容器内绑定: ${bindMode})。正在重启容器以应用配置...`));
      await runCompose(composeCmd, ['restart', 'openclaw-gateway']);
    } catch (error) {
      configSpinner.fail(chalk.red(`初始化基础配置失败: ${error.message}`));
      throw error;
    }

    const isReady = await waitForGateway(port, ora());
    if (!isReady) {
      throw new Error('Gateway 响应超时');
    }

    const runInContainer = async (args, description) => {
      try {
        await runCompose(composeCmd, ['run', '--rm', 'openclaw-gateway', ...args]);
        process.stdout.write(chalk.green(`  ✔ ${description}\n`));
      } catch (error) {
        const output = (error.stdout || '') + (error.stderr || '');
        if (args.includes('install') && output.includes('plugin already exists')) {
          process.stdout.write(chalk.gray(`  - ${description} (已存在)\n`));
          return;
        }
        process.stdout.write(chalk.red(`  ✘ ${description} 失败: ${error.message}\n`));
        throw error;
      }
    };

    // 5. 发现并运行插件部署钩子 (优化后的逻辑)
    const pluginsDir = path.resolve(__dirname, '../plugins');
    await pluginManager.discover(pluginsDir);
    await pluginManager.runDeployHooks(runInContainer, process.env);
    
    // 6. 执行通用配置 (如 Onboarding)
    try {
      const isAutomated = process.env.BAILIAN_API_KEY && (options.yes || !options.force);
      console.log(chalk.green('\n所有服务配置已完成。'));
      
      if (!isAutomated) {
        console.log(chalk.cyan('\n开始执行 Onboarding (交互式)...\n'));
        try {
          await runCompose(composeCmd, ['run', '--rm', 'openclaw-gateway', 'node', 'dist/index.js', 'onboard'], { stdio: 'inherit' });
        } catch (error) {
          console.warn(chalk.yellow(`Onboarding 过程中断或失败: ${error.message}`));
        }
      } else {
        console.log(chalk.green('\n已根据环境变量自动完成配置，跳过交互式 Onboarding。'));
      }
    } catch (error) {
      console.error(chalk.red('\n部署过程中出现错误，已停止。'));
      throw error;
    }

    // 获取 Dashboard 链接 (修复 Issue 2)
    console.log(chalk.cyan('\n--- 访问地址 ---'));
    let finalDashboardUrl = '';
    try {
      let { stdout: dashboardUrl } = await runCompose(composeCmd, ['exec', 'openclaw-gateway', 'openclaw', 'dashboard', '--no-open']);
      dashboardUrl = dashboardUrl.trim();
      
      // 确保 URL 包含 token
      finalDashboardUrl = dashboardUrl.includes('token=') ? dashboardUrl : `${dashboardUrl}${dashboardUrl.includes('?') ? '&' : '?'}token=${token}`;
      
      console.log(chalk.green('Dashboard URL:'), chalk.blue.underline(finalDashboardUrl));
      console.log(chalk.gray('提示: 如果遇到 "too many failed authentication attempts"，请使用上述带令牌的 URL 访问。'));
    } catch (error) {
      const gatewayUrl = `http://localhost:${port}`;
      console.log(chalk.yellow(`无法自动获取 Dashboard 链接: ${error.message}`));
      console.log(chalk.cyan(`你可以尝试访问: ${gatewayUrl}`));
    }

    console.log(chalk.cyan('\n--- 状态检查与验证 ---'));
    const checkSpinner = ora('正在检查服务状态...').start();
    try {
      // 增加重试逻辑，解决部署后立即请求导致的 1006 错误
      let status = '';
      for (let i = 0; i < 3; i++) {
        try {
          const { stdout } = await runCompose(composeCmd, ['run', '--rm', 'openclaw-gateway', 'node', 'dist/index.js', 'gateway', 'status']);
          status = stdout;
          break;
        } catch (e) {
          if (i === 2) throw e;
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      checkSpinner.succeed(chalk.green('服务状态检查完成。'));
      console.log(status);

      console.log(chalk.cyan('\n--- 设备与绑定验证 ---'));
      const { stdout: devices } = await runCompose(composeCmd, ['exec', 'openclaw-gateway', 'openclaw', 'devices', 'list', '--token', token]);
      console.log(devices);

      // 自动提取 requestId 并尝试审批
      const requestIdMatch = devices.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      if (requestIdMatch) {
        const requestId = requestIdMatch[0];
        console.log(chalk.yellow(`检测到待审批设备请求: ${requestId}`));
        try {
          await runCompose(composeCmd, ['exec', 'openclaw-gateway', 'openclaw', 'devices', 'approve', requestId, '--token', token]);
          console.log(chalk.green(`✔ 已自动执行设备审批。`));
        } catch (approveError) {
          console.log(chalk.red(`\n必须手动执行此命令以完成设备审批:`));
          console.log(chalk.yellow(`docker compose exec openclaw-gateway openclaw devices approve ${requestId}`));
        }
      }

      // 检查是否提示 Pairing Required
      if (devices.includes('Pairing Required') || status.includes('Pairing Required') || !requestIdMatch) {
        console.log(chalk.yellow.bold('\n[提示] 尚未检测到待审批设备或需要配对。'));
        console.log(chalk.white('请执行以下操作以完成绑定:'));
        console.log(chalk.white(`  1. 请先在浏览器打开 Dashboard: `) + chalk.blue.underline(finalDashboardUrl || `http://localhost:${port}`));
        console.log(chalk.white('  2. 刷新页面后，在终端手动执行以下命令查看设备列表:'));
        console.log(chalk.cyan(`     docker compose exec openclaw-gateway openclaw devices list`));
        console.log(chalk.white('  3. 复制列表中的 Request ID (UUID)，执行审批命令:'));
        console.log(chalk.cyan(`     docker compose exec openclaw-gateway openclaw devices approve <Request ID> --token ${token}`));
      }
    } catch (error) {
      checkSpinner.fail(chalk.yellow(`状态验证过程中断 (非致命): ${error.message}`));
      console.log(chalk.gray('请稍后手动通过 Dashboard 或 `openclaw devices list` 命令检查。'));
    }
    console.log(chalk.green('\n部署完成！'));
  }
};

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execa } from 'execa';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { pluginManager } from '../utils/plugin-manager.js';
import chalk from 'chalk';
import ora from 'ora';
import * as dotenv from 'dotenv';
import { input, password, confirm } from '@inquirer/prompts';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getDockerGid() {
  try {
    const { stdout } = await execa('stat', ['-c', '%g', '/var/run/docker.sock']);
    return stdout.trim();
  } catch (error) {
    try {
      const { stdout } = await execa('stat', ['-f', '%g', '/var/run/docker.sock']);
      return stdout.trim();
    } catch (macError) {
      return '999';
    }
  }
}

export default {
  name: 'init-env',
  description: '初始化环境变量并生成配置文件',
  dependencies: ['check-env'],
  action: async (options) => {
    const envPath = path.resolve(process.cwd(), '.env');
    let existingConfig = {};
    let shouldProceed = true;

    if (fs.existsSync(envPath)) {
      existingConfig = dotenv.parse(fs.readFileSync(envPath));
      if (options.yes && !options.force) {
        shouldProceed = false;
      } else {
        console.log(chalk.yellow('.env 文件已存在。'));
        shouldProceed = await confirm({
          message: '是否要重新配置环境变量？(选择 "否" 将跳过此步骤)',
          default: false,
        });
      }
    }

    if (!shouldProceed) {
      console.log(chalk.blue('已跳过环境变量初始化。'));
      return;
    }

    console.log(chalk.cyan('\n开始配置 OpenClaw 环境变量...\n'));

    const gatewayToken = existingConfig.OPENCLAW_GATEWAY_TOKEN || crypto.randomBytes(32).toString('hex');

    const spinner = ora('正在获取 Docker GID...').start();
    const dockerGid = await getDockerGid();
    spinner.succeed(chalk.green(`Docker GID: ${dockerGid}`));

    const getVal = async (key, promptFn, promptOptions) => {
      const envVal = process.env[key];
      const configVal = existingConfig[key];
      const defaultVal = promptOptions.default;

      let currentVal = envVal || configVal || defaultVal;
      let sourceInfo = "";

      if (envVal) {
        sourceInfo = chalk.blue(' (来自: 系统环境)');
      } else if (configVal) {
        sourceInfo = chalk.magenta(' (来自: .env 文件)');
      } else if (defaultVal !== undefined) {
        sourceInfo = chalk.yellow(' (系统默认值)');
      } else {
        sourceInfo = chalk.red(' (待配置)');
      }

      if (options.yes && currentVal !== undefined && !options.force) return currentVal;

      const isPassword = !!promptOptions.mask;
      const maskedPlaceholder = isPassword && currentVal ? '****************' : undefined;
      const promptDefault = maskedPlaceholder || currentVal;

      const localOptions = { ...promptOptions };
      const originalValidate = localOptions.validate;
      delete localOptions.validate;

      const result = await (isPassword ? input : promptFn)({
        ...localOptions,
        message: `${promptOptions.message}${sourceInfo}`,
        default: promptDefault,
        transformer: isPassword ? (val) => {
          if (val === maskedPlaceholder) return chalk.cyan(maskedPlaceholder);
          return '*'.repeat(val.length);
        } : undefined,
      });

      const finalVal = (result === '' || result === undefined || result === maskedPlaceholder) ? currentVal : result;

      if (originalValidate) {
        const validationResult = originalValidate(finalVal);
        if (validationResult !== true) {
          console.error(chalk.red(`\n校验失败: ${validationResult}`));
          return getVal(key, promptFn, promptOptions);
        }
      }
      return finalVal || ''; // 确保不返回 undefined
    };

    const resolvePath = (p) => {
      if (!p) return '';
      const normalized = p.replace(/^~(?=$|\/|\\)/, os.homedir());
      return path.resolve(normalized);
    };

    const configDir = resolvePath(await getVal('OPENCLAW_CONFIG_DIR', input, {
      message: '请输入 OpenClaw 配置目录 (存放插件与配置):',
      default: existingConfig.OPENCLAW_CONFIG_DIR || path.join(os.homedir(), '.openclaw'),
    }));

    const workspaceDir = resolvePath(await getVal('OPENCLAW_WORKSPACE_DIR', input, {
      message: '请输入 OpenClaw 工作区目录 (存放 Agent 文件):',
      default: existingConfig.OPENCLAW_WORKSPACE_DIR || path.join(configDir, 'workspace'),
    }));

    const config = {
      OPENCLAW_GATEWAY_TOKEN: gatewayToken,
      DOCKER_GID: dockerGid,
      OPENCLAW_CONFIG_DIR: configDir,
      OPENCLAW_WORKSPACE_DIR: workspaceDir,
      OPENCLAW_VERSION: await getVal('OPENCLAW_VERSION', input, {
        message: '请输入 OpenClaw 版本 (例如 latest, 2026.3.11):',
        default: 'latest',
      }),
      OPENCLAW_LISTEN_IP: await getVal('OPENCLAW_LISTEN_IP', input, {
        message: '请输入服务监听 IP (127.0.0.1 仅本机, 0.0.0.0 允许局域网):',
        default: existingConfig.OPENCLAW_LISTEN_IP || '127.0.0.1',
        validate: (val) => ['127.0.0.1', '0.0.0.0'].includes(val) || '必须是 127.0.0.1 或 0.0.0.0',
      }),
      OPENCLAW_GATEWAY_PORT: await getVal('OPENCLAW_GATEWAY_PORT', input, {
        message: '请输入 OpenClaw Gateway 端口:',
        default: '18789',
      }),
      TOKEN_OPTIMIZATION_LEVEL: await getVal('TOKEN_OPTIMIZATION_LEVEL', input, {
        message: '请输入 Token 优化级别 (low, medium, high):',
        default: existingConfig.TOKEN_OPTIMIZATION_LEVEL || 'medium',
        validate: (val) => ['low', 'medium', 'high'].includes(val) || '必须是 low, medium 或 high',
      }),
      COMPACTION_MODE: await getVal('COMPACTION_MODE', input, {
        message: '请输入上下文压缩模式 (default, safeguard):',
        default: existingConfig.COMPACTION_MODE || 'default',
        validate: (val) => ['default', 'safeguard'].includes(val) || '必须是 default 或 safeguard',
      }),
      TOOL_OUTPUT_MAX_LENGTH: await getVal('TOOL_OUTPUT_MAX_LENGTH', input, {
        message: '请输入工具输出最大长度:',
        default: existingConfig.TOOL_OUTPUT_MAX_LENGTH || '2000',
        validate: (val) => !isNaN(val) || '必须是一个数字',
      }),
    };

    // 5. 动态加载插件环境变量需求 (优化后的逻辑)
    const pluginsDir = path.resolve(__dirname, '../plugins');
    await pluginManager.discover(pluginsDir);
    const pluginRequirements = pluginManager.getAllRequirements();
    
    for (const req of pluginRequirements) {
      const promptFn = req.type === 'password' ? password : input;
      config[req.key] = await getVal(req.key, promptFn, req);
    }
    // 4. 合并并写入 .env 文件, 过滤掉无效的 undefined 字符串
    const finalConfig = { ...existingConfig, ...config };
    const envContent = Object.entries(finalConfig)
      .map(([key, value]) => `${key}=${(value === undefined || value === null) ? '' : value}`)
      .join('\n');
    try {
      fs.writeFileSync(envPath, envContent + '\n', { mode: 0o600 });
      console.log(chalk.green('\n.env 文件已成功创建/更新，权限已设置为 600。'));
    } catch (error) {
      console.error(chalk.red(`写入 .env 文件失败: ${error.message}`));
      throw error;
    }
  }
};

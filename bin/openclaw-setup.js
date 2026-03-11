#!/usr/bin/env node

import { Command } from 'commander';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registry } from '../scripts/utils/registry.js';
import { orchestrator } from '../scripts/utils/orchestrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const program = new Command();

  program
    .name('openclaw-setup')
    .description('OpenClaw 自动化部署与配置工具')
    .version('1.0.0')
    .option('-y, --yes', '自动确认所有提示', false)
    .option('-f, --force', '强制重新配置/部署', false);

  // 1. 发现并注册所有命令
  const commandsDir = path.resolve(__dirname, '../scripts/commands');
  await registry.discover(commandsDir);
  
  // 2. 校验依赖合法性 (检查循环依赖和缺失依赖)
  registry.validateDependencies();

  // 3. 将注册表中的命令添加到 Commander
  const commands = registry.getAllCommands();
  for (const cmd of commands) {
    const programCmd = program.command(cmd.name)
      .description(cmd.description);
    
    programCmd.action(async (options) => {
      try {
        // 如果是直接运行某个命令，我们需要确保它的依赖项也运行了
        // 但是对于 'start' 命令，它内部已经调用了 orchestrator.run
        const allOptions = { ...program.opts(), ...options };
        if (cmd.name === 'start') {
          await cmd.action(allOptions);
        } else {
          await orchestrator.run(cmd.name, allOptions);
        }
      } catch (error) {
        // 错误通常已经在 orchestrator 或 action 内部打印过
        process.exit(1);
      }
    });
  }

  program.parse();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

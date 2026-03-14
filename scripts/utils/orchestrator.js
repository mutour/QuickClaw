import chalk from 'chalk';
import { registry } from './registry.js';

class Orchestrator {
  constructor() {
    this.executed = new Set();
  }

  async run(commandName, options = {}) {
    const order = registry.resolveOrder(commandName);
    
    for (const name of order) {
      if (this.executed.has(name)) {
        continue;
      }

      const command = registry.getCommand(name);
      if (!command) {
        throw new Error(`找不到命令: ${name}`);
      }

      console.log(chalk.cyan(`\n>>> 正在执行: ${command.description || name}`));
      try {
        if (typeof command.action !== 'function') {
          throw new Error(`命令 "${name}" 没有定义有效的 action 函数`);
        }
        await command.action(options);
        this.executed.add(name);
        console.log(chalk.green(`✔ ${command.description || name} 完成`));
      } catch (error) {
        console.error(chalk.red(`✘ ${command.description || name} 失败: ${error.message}`));
        throw error;
      }
    }
  }
}

export const orchestrator = new Orchestrator();
export default Orchestrator;

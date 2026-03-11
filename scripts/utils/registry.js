import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

class Registry {
  constructor() {
    this.commands = new Map();
  }

  async discover(commandsDir) {
    if (!fs.existsSync(commandsDir)) {
      return;
    }

    const files = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));
    
    for (const file of files) {
      const filePath = path.resolve(commandsDir, file);
      try {
        const { default: command } = await import(`file://${filePath}`);
        
        if (command && command.name) {
          this.commands.set(command.name, command);
        }
      } catch (error) {
        console.error(chalk.yellow(`警告: 无法加载命令文件 ${file}: ${error.message}`));
      }
    }
  }

  getCommand(name) {
    return this.commands.get(name);
  }

  getAllCommands() {
    return Array.from(this.commands.values());
  }

  validateDependencies() {
    const visited = new Set();
    const recStack = new Set();

    const check = (name, path = []) => {
      visited.add(name);
      recStack.add(name);
      const currentPath = [...path, name];

      const command = this.commands.get(name);
      if (!command) {
        console.error(chalk.red(`错误: 找不到依赖的命令 "${name}"。路径: ${path.join(' -> ')}`));
        process.exit(1);
      }

      if (command.dependencies) {
        for (const dep of command.dependencies) {
          if (!visited.has(dep)) {
            check(dep, currentPath);
          } else if (recStack.has(dep)) {
            const loop = [...currentPath, dep].join(' -> ');
            console.error(chalk.red(`错误: 检测到循环依赖: ${loop}`));
            process.exit(1);
          }
        }
      }

      recStack.delete(name);
    };

    for (const name of this.commands.keys()) {
      if (!visited.has(name)) {
        check(name);
      }
    }
  }

  resolveOrder(targetName) {
    const order = [];
    const visited = new Set();

    const visit = (name) => {
      if (visited.has(name)) return;
      visited.add(name);

      const command = this.commands.get(name);
      if (command && command.dependencies) {
        for (const dep of command.dependencies) {
          visit(dep);
        }
      }
      order.push(name);
    };

    if (targetName) {
      if (!this.commands.has(targetName)) {
        throw new Error(`找不到命令: ${targetName}`);
      }
      visit(targetName);
    } else {
      for (const name of this.commands.keys()) {
        visit(name);
      }
    }

    return order;
  }
}

export const registry = new Registry();
export default Registry;

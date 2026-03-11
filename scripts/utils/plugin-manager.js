import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';

class PluginManager {
  constructor() {
    this.plugins = [];
    this.categoryOrder = ['model', 'social', 'other'];
  }

  async discover(pluginsDir) {
    if (!fs.existsSync(pluginsDir)) return;
    
    const files = fs.readdirSync(pluginsDir).filter(file => file.endsWith('.js'));
    for (const file of files) {
      const filePath = path.resolve(pluginsDir, file);
      try {
        const { default: plugin } = await import(`file://${filePath}`);
        if (plugin && plugin.id) {
          // 检查是否已经加载过相同 ID 的插件，防止重复加载
          if (!this.plugins.find(p => p.id === plugin.id)) {
            this.plugins.push(plugin);
          }
        }
      } catch (error) {
        console.error(chalk.yellow(`警告: 无法加载插件 ${file}: ${error.message}`));
      }
    }
  }

  getSortedPlugins() {
    return [...this.plugins].sort((a, b) => {
      const orderA = this.categoryOrder.indexOf(a.category || 'other');
      const orderB = this.categoryOrder.indexOf(b.category || 'other');
      const catA = orderA === -1 ? 999 : orderA;
      const catB = orderB === -1 ? 999 : orderB;
      if (catA !== catB) return catA - catB;
      return (a.priority || 10) - (b.priority || 10);
    });
  }

  getAllRequirements() {
    const requirements = [];
    for (const plugin of this.plugins) {
      if (typeof plugin.getEnvRequirements === 'function') {
        requirements.push(...plugin.getEnvRequirements());
      }
    }
    return requirements;
  }

  async runDeployHooks(runInContainer, env) {
    const sortedPlugins = this.getSortedPlugins();
    if (sortedPlugins.length > 0) {
      console.log(chalk.cyan('\n正在执行插件配置...'));
      for (const plugin of sortedPlugins) {
        try {
          const deployHook = plugin.onDeploy || plugin.run;
          if (typeof deployHook === 'function') {
            await deployHook(runInContainer, env);
          }
        } catch (error) {
          console.error(chalk.red(`插件 ${plugin.name || plugin.id} 执行失败: ${error.message}`));
          throw error;
        }
      }
    }
  }

  async runAll(runInContainer, env) {
    return this.runDeployHooks(runInContainer, env);
  }
}

export const pluginManager = new PluginManager();
export default PluginManager;

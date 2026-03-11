import chalk from 'chalk';
import ora from 'ora';
import { execa } from 'execa';

async function runCompose(args) {
  try {
    const { stdout } = await execa('docker', ['compose', 'exec', 'openclaw-gateway', 'node', 'dist/index.js', ...args]);
    return JSON.parse(stdout);
  } catch (error) {
    // Try without 'exec' (run) if container is not running or other issues
    const { stdout } = await execa('docker', ['compose', 'run', '--rm', 'openclaw-gateway', 'node', 'dist/index.js', ...args]);
    return JSON.parse(stdout);
  }
}

export default {
  name: 'stats',
  description: '查看 OpenClaw Token 使用统计与成本分析',
  action: async () => {
    const spinner = ora('正在获取会话统计信息...').start();
    try {
      const result = await runCompose(['sessions', '--json']);
      spinner.succeed(chalk.green('统计信息获取成功。\n'));

      const sessions = result.sessions || [];
      if (sessions.length === 0) {
        console.log(chalk.yellow('当前没有活跃的会话。'));
        return;
      }

      console.log(chalk.cyan.bold('--- OpenClaw Token 消耗统计 ---'));
      console.log(chalk.gray(`统计时间: ${new Date().toLocaleString()}`));
      console.log('');

      let grandTotal = 0;

      sessions.forEach(session => {
        const sessionId = session.sessionId.slice(0, 8);
        const agent = session.agentId;
        const model = session.model;
        const tokens = session.totalTokens || 0;
        grandTotal += tokens;

        const color = tokens > 100000 ? chalk.red : (tokens > 50000 ? chalk.yellow : chalk.green);

        console.log(`${chalk.blue(`[${agent}]`)} ${chalk.gray(sessionId)}: ${color(tokens.toLocaleString().padStart(10))} tokens (${chalk.magenta(model)})`);
      });

      console.log(chalk.cyan('-------------------------------'));
      console.log(`${chalk.white.bold('总计消耗:')} ${chalk.green.bold(grandTotal.toLocaleString())} tokens`);
      
      const estimatedCost = (grandTotal / 1000000) * 0.2; // 假设 $0.2/1M tokens (Qwen3.5 Flash 估值)
      console.log(`${chalk.white.bold('预计成本:')} ${chalk.yellow(`≈ $${estimatedCost.toFixed(4)}`)}`);
      
      console.log(chalk.gray('\n提示: 使用 `openclaw sessions --json` 获取更详细的数据。'));
    } catch (error) {
      spinner.fail(chalk.red(`获取统计信息失败: ${error.message}`));
      console.log(chalk.gray('请确保 OpenClaw 容器正在运行且可以通过 docker compose 访问。'));
    }
  }
};

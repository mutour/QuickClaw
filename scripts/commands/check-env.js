import { execa } from 'execa';
import chalk from 'chalk';
import ora from 'ora';

export default {
  name: 'check-env',
  description: '检测自动化所需的环境 (Node.js, Docker, Docker Compose)',
  dependencies: [],
  action: async (options) => {
    const spinner = ora('正在检测环境...').start();
    let hasError = false;

    const nodeVersion = process.versions.node;
    const majorVersion = parseInt(nodeVersion.split('.')[0], 10);
    if (majorVersion < 18) {
      spinner.fail(chalk.red(`Node.js 版本过低: 需 >= 18, 当前为 ${nodeVersion}`));
      hasError = true;
    } else {
      spinner.succeed(chalk.green(`Node.js 版本检测通过: ${nodeVersion}`));
    }

    spinner.start('正在检测 Docker...');
    try {
      const { stdout } = await execa('docker', ['--version']);
      spinner.succeed(chalk.green(`Docker 检测通过: ${stdout.trim()}`));
    } catch (error) {
      spinner.fail(chalk.red('未检测到 Docker'));
      console.log(chalk.yellow('\n请安装 Docker Desktop: https://www.docker.com/products/docker-desktop/'));
      hasError = true;
    }

    spinner.start('正在检测 Docker Compose...');
    try {
      const { stdout } = await execa('docker', ['compose', 'version']);
      spinner.succeed(chalk.green(`Docker Compose 检测通过: ${stdout.trim()}`));
    } catch (error) {
      try {
        const { stdout } = await execa('docker-compose', ['--version']);
        spinner.succeed(chalk.green(`Docker Compose (legacy) 检测通过: ${stdout.trim()}`));
      } catch (fallbackError) {
        spinner.fail(chalk.red('未检测到 Docker Compose'));
        console.log(chalk.yellow('\n请确保 Docker Compose 已安装。如果是 Docker Desktop，它通常已内置。'));
        hasError = true;
      }
    }

    if (hasError) {
      console.log(chalk.red('\n环境检测未通过，请修复上述问题后重试。'));
      throw new Error('环境检测未通过');
    } else {
      console.log(chalk.green('\n所有环境检测通过！'));
    }
  }
};

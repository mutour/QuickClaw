import { orchestrator } from '../utils/orchestrator.js';

export default {
  name: 'start',
  description: '执行完整安装流程 (check-env -> init-env -> deploy)',
  dependencies: [],
  action: async (options) => {
    // start 命令的核心逻辑是运行部署命令，部署命令会自动触发其依赖 (init-env -> check-env)
    await orchestrator.run('deploy', options);
  }
};

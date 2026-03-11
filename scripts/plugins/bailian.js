export default {
  id: 'bailian',
  name: '百炼大模型',
  category: 'model',
  getEnvRequirements() {
    return [
      {
        key: 'BAILIAN_API_KEY',
        message: '请输入百炼 API Key:',
        type: 'password',
        mask: '*',
        validate: (val) => (val && val.toString().length > 0) || 'API Key 不能为空',
      },
      {
        key: 'BAILIAN_BASE_URL',
        message: '请输入百炼 Base URL:',
        default: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      },
      {
        key: 'BAILIAN_MODEL_NAME',
        message: '请输入百炼模型名称:',
        default: 'qwen3.5-flash-2026-02-23',
      },
    ];
  },
  async onDeploy(runInContainer, env) {
    if (!env.BAILIAN_API_KEY) return;

    const modelName = env.BAILIAN_MODEL_NAME || 'qwen3.5-flash-2026-02-23';
    const bailianProvider = {
      apiKey: env.BAILIAN_API_KEY,
      baseUrl: env.BAILIAN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      auth: 'api-key',
      api: 'openai-completions',
      models: [
        {
          id: modelName,
          name: modelName,
          api: 'openai-completions',
          reasoning: false,
          input: ['text'],
          cost: {
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0
          },
          contextWindow: 200000,
          maxTokens: 8192
        }
      ]
    };

    await runInContainer(['node', 'dist/index.js', 'config', 'set', 'models.providers.bailian', JSON.stringify(bailianProvider)], '配置百炼大模型集成');

    // 注入 Token 优化配置
    const optimizationLevel = env.TOKEN_OPTIMIZATION_LEVEL || 'medium';
    const compactionMode = env.COMPACTION_MODE || 'default';
    const toolOutputMax = parseInt(env.TOOL_OUTPUT_MAX_LENGTH || '2000', 10);

    const levelMap = {
      low: { floor: 16000, img: 1600 },
      medium: { floor: 24000, img: 1200 },
      high: { floor: 32000, img: 800 }
    };

    const settings = levelMap[optimizationLevel] || levelMap.medium;

    const configUpdates = [
      ['agents.defaults.compaction.mode', compactionMode],
      ['agents.defaults.compaction.reserveTokensFloor', settings.floor.toString()],
      ['agents.defaults.imageMaxDimensionPx', settings.img.toString()],
      ['agents.defaults.contextPruning.softTrim.maxChars', toolOutputMax.toString()],
      ['agents.defaults.contextPruning.mode', optimizationLevel === 'high' ? 'cache-ttl' : 'off']
    ];

    for (const [key, value] of configUpdates) {
      await runInContainer(['node', 'dist/index.js', 'config', 'set', key, value], `优化 Token 配置: ${key}=${value}`);
    }
  }
};

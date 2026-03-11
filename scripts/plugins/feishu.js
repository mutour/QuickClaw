export default {
  id: 'feishu',
  name: '飞书集成',
  category: 'social',
  getEnvRequirements() {
    return [
      {
        key: 'FEISHU_APP_ID',
        message: '请输入飞书 App ID:',
        default: '',
      },
      {
        key: 'FEISHU_APP_SECRET',
        message: '请输入飞书 App Secret:',
        type: 'password',
        mask: '*',
      },
      {
        key: 'FEISHU_VERIFICATION_TOKEN',
        message: '请输入飞书 Verification Token:',
        type: 'password',
        mask: '*',
      },
      {
        key: 'FEISHU_ENCRYPT_KEY',
        message: '请输入飞书 Encrypt Key:',
        type: 'password',
        mask: '*',
      },
      {
        key: 'FEISHU_BOT_NAME',
        message: '请输入飞书机器人名称:',
        default: 'OpenClawBot',
      },
    ];
  },
  async onDeploy(runInContainer, env) {
    if (!env.FEISHU_APP_ID) return;
    
    await runInContainer(['node', 'dist/index.js', 'plugins', 'enable', 'feishu'], '启用飞书插件');

    const feishuConfig = {
      appId: env.FEISHU_APP_ID,
      appSecret: (env.FEISHU_APP_SECRET && env.FEISHU_APP_SECRET !== 'undefined') ? env.FEISHU_APP_SECRET : undefined,
      verificationToken: (env.FEISHU_VERIFICATION_TOKEN && env.FEISHU_VERIFICATION_TOKEN !== 'undefined') ? env.FEISHU_VERIFICATION_TOKEN : undefined,
      encryptKey: (env.FEISHU_ENCRYPT_KEY && env.FEISHU_ENCRYPT_KEY !== 'undefined') ? env.FEISHU_ENCRYPT_KEY : undefined,
      botName: env.FEISHU_BOT_NAME || 'OpenClawBot',
      enabled: true,
      connectionMode: 'websocket',
      domain: 'feishu',
      groupPolicy: 'open',
    };

    // 移除未定义的键，避免在 JSON 中产生 null
    Object.keys(feishuConfig).forEach((key) => {
      if (feishuConfig[key] === undefined) delete feishuConfig[key];
    });

    await runInContainer(['node', 'dist/index.js', 'config', 'set', 'channels.feishu', JSON.stringify(feishuConfig)], '批量配置飞书集成参数');
  }
};

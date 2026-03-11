# Plugin System Abstraction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Abstract hardcoded configurations for Bailian and Feishu into a generic, declarative plugin-based system.

**Architecture:** A `PluginManager` discovers plugins that declare their environment requirements and deployment logic. `init-env` and `deploy` commands are refactored to be plugin-agnostic.

**Tech Stack:** Node.js (ESM), Inquirer (prompts), Execa (docker commands), Chalk/Ora (UI).

---

### Task 1: Update PluginManager Interface

**Files:**
- Modify: `scripts/utils/plugin-manager.js`
- Create: `tests/utils/plugin-manager.test.js`

**Step 1: Write failing tests for new methods**

```javascript
import test from 'node:test';
import assert from 'node:assert';
import { pluginManager } from '../../scripts/utils/plugin-manager.js';

test('PluginManager should aggregate requirements', async (t) => {
  // Mock plugins will be needed
});

test('PluginManager should run onDeploy hooks', async (t) => {
  // Mock runInContainer will be needed
});
```

**Step 2: Run test to verify it fails**

Run: `node tests/utils/plugin-manager.test.js`
Expected: FAIL (methods not defined)

**Step 3: Implement `getAllRequirements` and `runDeployHooks`**

```javascript
// In scripts/utils/plugin-manager.js
getAllRequirements() {
  const requirements = [];
  for (const plugin of this.plugins) {
    if (plugin.getEnvRequirements) {
      requirements.push(...plugin.getEnvRequirements());
    }
  }
  return requirements;
}

async runDeployHooks(runInContainer, env) {
  // Sort plugins first (existing logic)
  const sortedPlugins = this.getSortedPlugins(); 
  for (const plugin of sortedPlugins) {
    if (plugin.onDeploy) {
      await plugin.onDeploy(runInContainer, env);
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `node tests/utils/plugin-manager.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/utils/plugin-manager.js
git commit -m "feat: add getAllRequirements and runDeployHooks to PluginManager"
```

---

### Task 2: Refactor Bailian Plugin

**Files:**
- Modify: `scripts/plugins/bailian.js`

**Step 1: Implement `getEnvRequirements` and rename `run` to `onDeploy`**

```javascript
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
        type: 'input',
        default: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      },
      {
        key: 'BAILIAN_MODEL_NAME',
        message: '请输入百炼模型名称:',
        type: 'input',
        default: 'qwen-max',
      }
    ];
  },
  async onDeploy(runInContainer, env) {
    if (!env.BAILIAN_API_KEY) return;
    // ... existing logic
  }
};
```

**Step 2: Commit**

```bash
git add scripts/plugins/bailian.js
git commit -m "refactor: update bailian plugin to new interface"
```

---

### Task 3: Refactor Feishu Plugin

**Files:**
- Modify: `scripts/plugins/feishu.js`

**Step 1: Implement `getEnvRequirements` and rename `run` to `onDeploy`**

```javascript
export default {
  id: 'feishu',
  name: '飞书集成',
  category: 'social',
  getEnvRequirements() {
    return [
      { key: 'FEISHU_APP_ID', message: '请输入飞书 App ID:', type: 'input', default: '' },
      { key: 'FEISHU_APP_SECRET', message: '请输入飞书 App Secret:', type: 'password', mask: '*' },
      { key: 'FEISHU_VERIFICATION_TOKEN', message: '请输入飞书 Verification Token:', type: 'password', mask: '*' },
      { key: 'FEISHU_ENCRYPT_KEY', message: '请输入飞书 Encrypt Key:', type: 'password', mask: '*' },
      { key: 'FEISHU_BOT_NAME', message: '请输入飞书机器人名称:', type: 'input', default: 'OpenClawBot' }
    ];
  },
  async onDeploy(runInContainer, env) {
    if (!env.FEISHU_APP_ID) return;
    // ... existing logic
  }
};
```

**Step 2: Commit**

```bash
git add scripts/plugins/feishu.js
git commit -m "refactor: update feishu plugin to new interface"
```

---

### Task 4: Refactor `init-env.js`

**Files:**
- Modify: `scripts/commands/init-env.js`

**Step 1: Load plugins and loop through requirements**

```javascript
// In scripts/commands/init-env.js
import { pluginManager } from '../utils/plugin-manager.js';

// ... inside action
const pluginsDir = path.resolve(__dirname, '../plugins');
await pluginManager.discover(pluginsDir);

const pluginRequirements = pluginManager.getAllRequirements();
for (const req of pluginRequirements) {
  config[req.key] = await getVal(req.key, req.type === 'password' ? password : input, req);
}
```

**Step 2: Remove hardcoded Bailian/Feishu prompts**

**Step 3: Commit**

```bash
git add scripts/commands/init-env.js
git commit -m "refactor: make init-env plugin-aware and remove hardcoded prompts"
```

---

### Task 5: Refactor `deploy.js`

**Files:**
- Modify: `scripts/commands/deploy.js`

**Step 1: Use `pluginManager.runDeployHooks`**

```javascript
// In scripts/commands/deploy.js
// Remove hardcoded feishu/bailian logic
// Use:
await pluginManager.runDeployHooks(runInContainer, process.env);
```

**Step 2: Commit**

```bash
git add scripts/commands/deploy.js
git commit -m "refactor: use plugin deploy hooks and remove hardcoded logic"
```

---

### Task 6: Final Verification

**Step 1: Run `npm run setup` (or `node bin/openclaw-setup.js init-env`)**
Verify that prompts for Bailian and Feishu still appear and work correctly.

**Step 2: Run `node bin/openclaw-setup.js deploy`**
Verify that plugins are configured correctly in the container.

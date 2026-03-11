# Token Optimization Configuration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add configuration prompts for token optimization to the environment initialization script.

**Architecture:** Modify the `init-env` command to include new environment variables in the `config` object using the existing `getVal` helper.

**Tech Stack:** Node.js, @inquirer/prompts, chalk

---

### Task 1: Add TOKEN_OPTIMIZATION_LEVEL to init-env.js

**Files:**
- Modify: `scripts/commands/init-env.js`

**Step 1: Implement TOKEN_OPTIMIZATION_LEVEL prompt**

Add the following to the `config` object in `scripts/commands/init-env.js`:

```javascript
TOKEN_OPTIMIZATION_LEVEL: await getVal('TOKEN_OPTIMIZATION_LEVEL', input, {
  message: '请输入 Token 优化级别 (low, medium, high):',
  default: existingConfig.TOKEN_OPTIMIZATION_LEVEL || 'medium',
  validate: (val) => ['low', 'medium', 'high'].includes(val) || '必须是 low, medium 或 high',
}),
```

**Step 2: Verify manually**

Run: `node bin/openclaw-setup.js init-env`
Expected: Prompt for `TOKEN_OPTIMIZATION_LEVEL` appears with default `medium`.

**Step 3: Commit**

```bash
git add scripts/commands/init-env.js
git commit -m "feat: add TOKEN_OPTIMIZATION_LEVEL to init-env"
```

### Task 2: Add COMPACTION_MODE to init-env.js

**Files:**
- Modify: `scripts/commands/init-env.js`

**Step 1: Implement COMPACTION_MODE prompt**

Add the following to the `config` object in `scripts/commands/init-env.js`:

```javascript
COMPACTION_MODE: await getVal('COMPACTION_MODE', input, {
  message: '请输入上下文压缩模式 (safeguard, auto, summarize):',
  default: existingConfig.COMPACTION_MODE || 'auto',
  validate: (val) => ['safeguard', 'auto', 'summarize'].includes(val) || '必须是 safeguard, auto 或 summarize',
}),
```

**Step 2: Verify manually**

Run: `node bin/openclaw-setup.js init-env`
Expected: Prompt for `COMPACTION_MODE` appears with default `auto`.

**Step 3: Commit**

```bash
git add scripts/commands/init-env.js
git commit -m "feat: add COMPACTION_MODE to init-env"
```

### Task 3: Add TOOL_OUTPUT_MAX_LENGTH to init-env.js

**Files:**
- Modify: `scripts/commands/init-env.js`

**Step 1: Implement TOOL_OUTPUT_MAX_LENGTH prompt**

Add the following to the `config` object in `scripts/commands/init-env.js`:

```javascript
TOOL_OUTPUT_MAX_LENGTH: await getVal('TOOL_OUTPUT_MAX_LENGTH', input, {
  message: '请输入工具输出最大长度:',
  default: existingConfig.TOOL_OUTPUT_MAX_LENGTH || '2000',
  validate: (val) => !isNaN(val) || '必须是一个数字',
}),
```

**Step 2: Verify manually**

Run: `node bin/openclaw-setup.js init-env`
Expected: Prompt for `TOOL_OUTPUT_MAX_LENGTH` appears with default `2000`.

**Step 3: Commit**

```bash
git add scripts/commands/init-env.js
git commit -m "feat: add TOOL_OUTPUT_MAX_LENGTH to init-env"
```

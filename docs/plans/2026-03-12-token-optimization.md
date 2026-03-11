# Token Cost Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a multi-layered Token cost optimization system including auto-compaction, tool message limiting, RAG indexing, and a monitoring dashboard.

**Architecture:** 
- Enhance `init-env.js` and `bailian.js` to support high-granularity Token optimization configs.
- Implement `stats.js` command for real-time cost auditing via OpenClaw API.
- Refactor `AGENTS.md` to a token-efficient structural format.

**Tech Stack:** Node.js, OpenClaw CLI, Docker, chalk, ora.

---

### Task 1: Enhance init-env.js with Optimization Flags

**Files:**
- Modify: `scripts/commands/init-env.js`

**Step 1: Add optimization prompts to init-env.js**
- Add `TOKEN_OPTIMIZATION_LEVEL` (low, medium, high).
- Add `COMPACTION_MODE` (safeguard, auto, summarize).
- Add `TOOL_OUTPUT_MAX_LENGTH` (default 2000).

**Step 2: Commit**
```bash
git add scripts/commands/init-env.js
git commit -m "feat: add token optimization flags to init-env"
```

---

### Task 2: Update bailian.js to Inject Optimization Configs

**Files:**
- Modify: `scripts/plugins/bailian.js`

**Step 1: Inject compaction and tool limits into the container**
- Update `onDeploy` to set `agents.defaults.compaction` based on `.env`.
- Update `onDeploy` to set `agents.defaults.toolOutput.maxLength`.

**Step 2: Commit**
```bash
git add scripts/plugins/bailian.js
git commit -m "feat: inject token optimizations via bailian plugin"
```

---

### Task 3: Implement Token Monitoring Script

**Files:**
- Create: `scripts/commands/stats.js`

**Step 1: Write stats logic**
- Fetch session stats using `docker compose exec openclaw-gateway node dist/index.js sessions list --json`.
- Summarize token usage per agent.
- Display using `chalk` in a pretty table.

**Step 2: Register command in bin/openclaw-setup.js**
- Add `node bin/openclaw-setup.js stats`.

**Step 3: Commit**
```bash
git add scripts/commands/stats.js bin/openclaw-setup.js
git commit -m "feat: add stats command for token monitoring"
```

---

### Task 4: Memory RAG Configuration

**Files:**
- Modify: `docs/usage.md`

**Step 1: Add section on enabling Memory RAG**
- Document how to run `openclaw memory reindex` and set `agents.defaults.memory.enabled: true`.

**Step 2: Commit**
```bash
git add docs/usage.md
git commit -m "docs: add Memory RAG configuration guide"
```

---

### Task 5: Optimize AGENTS.md Template

**Files:**
- Modify: `AGENTS.md`

**Step 1: Rewrite AGENTS.md for Token Efficiency**
- Replace prose with bullet points.
- Use shorter identifiers.
- Remove redundant system context.

**Step 2: Commit**
```bash
git add AGENTS.md
git commit -m "perf: optimize AGENTS.md for token usage"
```

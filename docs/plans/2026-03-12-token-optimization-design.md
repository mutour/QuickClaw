# Design Doc: Enhance init-env.js with Optimization Flags

**Date:** 2026-03-12
**Topic:** Token Optimization Configuration

## Overview
This design adds configuration prompts for token optimization to the `init-env.js` script. These flags will allow users to control how OpenClaw manages token usage and context compaction.

## Requirements
1. Add `TOKEN_OPTIMIZATION_LEVEL` (choices: low, medium, high).
2. Add `COMPACTION_MODE` (choices: safeguard, auto, summarize).
3. Add `TOOL_OUTPUT_MAX_LENGTH` (default: 2000).
4. Ensure these are saved to the `.env` file via the existing `getVal` and `config` object logic.

## Implementation Details
The changes will be made in `scripts/commands/init-env.js` within the `action` function.

### New Configuration Fields
The following fields will be added to the `config` object:

- **TOKEN_OPTIMIZATION_LEVEL**:
  - Prompt: `请输入 Token 优化级别 (low, medium, high):`
  - Default: `medium`
  - Validation: Must be one of `low`, `medium`, `high`.

- **COMPACTION_MODE**:
  - Prompt: `请输入上下文压缩模式 (safeguard, auto, summarize):`
  - Default: `auto`
  - Validation: Must be one of `safeguard`, `auto`, `summarize`.

- **TOOL_OUTPUT_MAX_LENGTH**:
  - Prompt: `请输入工具输出最大长度:`
  - Default: `2000`
  - Validation: Must be a valid number.

## Verification Plan
1. Run `node bin/openclaw-setup.js init-env` and verify the new prompts appear.
2. Verify that the selected values are correctly written to the `.env` file.
3. Verify that existing environment variables are preserved.

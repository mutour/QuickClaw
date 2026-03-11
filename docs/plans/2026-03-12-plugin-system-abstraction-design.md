# Design Doc: Plugin System Abstraction

**Date:** 2026-03-12
**Status:** Approved

## Overview
Abstract hardcoded configurations for Bailian and Feishu from `init-env.js` and `deploy.js` into a generic, declarative plugin-based system.

## Architecture
The system consists of a `PluginManager` that discovers plugins in `scripts/plugins/`. Each plugin defines its environment requirements and deployment logic.

### Plugin Interface
```javascript
export default {
  id: 'string',
  name: 'string',
  category: 'model' | 'social' | 'other',
  priority: number,
  getEnvRequirements(): Array<{
    key: string,
    message: string,
    type: 'input' | 'password',
    default?: string,
    mask?: string,
    validate?: (val: any) => boolean | string
  }>,
  async onDeploy(runInContainer: Function, env: Object): Promise<void>
}
```

## Components

### PluginManager (`scripts/utils/plugin-manager.js`)
- `discover(dir)`: Loads plugins from the specified directory.
- `getAllRequirements()`: Aggregates requirements from all loaded plugins.
- `runDeployHooks(runInContainer, env)`: Executes `onDeploy` for all plugins in order.

### Init-Env Command (`scripts/commands/init-env.js`)
- Loads plugins via `PluginManager`.
- Iterates through aggregated requirements.
- Uses existing `getVal` helper to prompt user for each requirement.
- Saves results to `.env`.

### Deploy Command (`scripts/commands/deploy.js`)
- Removes hardcoded Bailian/Feishu logic.
- Calls `pluginManager.runDeployHooks` to handle plugin-specific container configuration.

## Data Flow
1. `init-env` -> `PluginManager.discover` -> `PluginManager.getAllRequirements` -> User Prompts -> `.env`.
2. `deploy` -> `PluginManager.discover` -> `PluginManager.runDeployHooks` -> `plugin.onDeploy` -> `docker exec/run`.

## Error Handling
- Plugin loading errors are logged but don't stop the process.
- Requirement validation is handled by the existing `getVal` logic.
- Deployment hook failures will stop the deployment process to ensure consistency.

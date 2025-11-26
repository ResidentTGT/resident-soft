# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Resident Soft is a multi-chain automation framework for blockchain operations. It supports EVM chains, Solana (SVM), and various DeFi protocols, centralized exchanges, and Web3 projects. The application consists of a Node.js backend with a React frontend UI for configuration editing.

## Build & Run Commands

### Backend
- **Build backend**: `npm run bundle:backend` - Uses esbuild to bundle TypeScript to `dist/index.js`
- **Start backend**: `npm run start:backend` - Bundles and runs the backend
- **Restart backend**: `npm run restart:backend` - Runs already bundled backend from `build/index.js`
- **Type check**: `npm run typecheck` - Run TypeScript compiler without emitting files

### Frontend
- **Start frontend dev server**: `npm run start:frontend` - Runs Vite dev server on port 3000
- **Build frontend**: `npm run build:frontend` - Builds production frontend

### Code Quality
- **Lint**: `npm run lint` - Run ESLint with config from `configs/eslint.config.mjs`
- **Lint fix**: `npm run lint-fix` - Auto-fix ESLint issues
- **Format check**: `npm run prettier` - Check formatting
- **Format fix**: `npm run prettier-fix` - Auto-format files
- **Secret scan**: `npm run secretlint` - Scan for exposed secrets

### Advanced
- **Single Executable Application (SEA)**: `npm run sea_build` - Create standalone executables for Windows/Linux/Mac
- **Dependency graph**: `npm run depcruise` - Generate dependency visualization
- **Premium encryption**: `npm run encrypt_premium` - Encrypt premium features
- **Premium decryption**: `npm run decrypt_premium` - Decrypt premium features for development

## Architecture

### Entry Point & Flow
The application starts from `index.ts`, which:
1. Loads network and token configurations from `networks.jsonc` and `tokens.jsonc`
2. Starts HTTP server (port 3000) for the frontend config editor
3. Enters main loop waiting for user to select action via terminal or UI
4. Reads `launchParams.jsonc` (execution settings) and `functionParams.jsonc` (action-specific params)
5. Verifies license if premium features are requested
6. Executes the selected action via `actionMode()`

### Core Configuration Files
- **launchParams.jsonc**: Controls execution behavior (threads, delays, account selection, proxy settings, encryption)
- **functionParams.jsonc**: Action-specific parameters organized by group (e.g., `Common.CheckBalances`, `Evm.Swap`)
- **networks.jsonc**: Network definitions and RPC endpoints
- **tokens.jsonc**: Token addresses for each chain
- **secrets/accounts/**: Account data (wallets, CEX credentials, proxies, browser profiles)
- **secrets/secretStorage/**: API keys, Telegram config, RPC endpoints

### Actions System
Actions are organized in `src/actions/`:
- **Action Groups**: Collections of related actions (e.g., `Common`, `Evm`, `Okx`, `Twitter`)
- **Action Types**: Each action is either `isolated` (runs per account in parallel) or `joint` (runs once across all accounts)
- **Actions Registry**: `src/actions/index.ts` exports `ACTIONS` array with all groups
- Action groups are split into:
  - `src/actions/groups/free/`: Free tier actions
  - `src/actions/groups/premium/`: Premium actions (require license)

### Handlers System
Handlers implement the business logic for action groups:
- **Base Handler**: `src/utils/handler.ts` defines `BaseHandler` abstract class
- **Free Handlers**: Registered in `src/free/handlersList.ts`
- **Premium Handlers**: Loaded dynamically from `src/premium/handlersList.ts` (if decrypted)
- Each handler implements:
  - `executeIsolated()`: For per-account actions (parallel execution with thread control)
  - `executeJoint()`: For actions that operate on all accounts together
- Handlers use `actionModeParams` containing accounts, launch params, function params, and secret storage

### Modules & Scenarios
- **Modules** (`src/free/modules/`, `src/premium/modules/`): Reusable blockchain interaction functions (e.g., swap on DEX, bridge, claim)
- **Scenarios** (`src/free/scenarios/`, `src/premium/scenarios/`): Complex multi-step workflows composed from modules

### Utilities (`src/utils/`)
- **Network**: `Network` class manages chain configs, RPC providers, tokens
- **Account**: Type definitions for wallets, CEX accounts, proxies, browser profiles
- **Browser**: Puppeteer-based browser automation with AdsPower/Vision antidetect support
- **State**: Tracks success/failure per account for retries
- **Logger**: Centralized logging with Telegram notification support
- **Encryption**: AES encryption for accounts and secrets
- **Task Manager**: Tracks task execution for UI/telemetry

### TypeScript Path Aliases
The project uses path aliases defined in `tsconfig.json`:
- `@src/*`: Maps to `src/*`
- `@utils/*`: Maps to `src/utils/*`
- `@freeModules/*`: Maps to `src/free/modules/*`
- `@freeScenarios/*`: Maps to `src/free/scenarios/*`
- `@freeHandlers/*`: Maps to `src/free/handlers/*`
- `@premiumModules/*`: Maps to `src/premium/modules/*`
- `@premiumScenarios/*`: Maps to `src/premium/scenarios/*`
- `@premiumHandlers/*`: Maps to `src/premium/handlers/*`

Always use these aliases instead of relative imports.

### Premium Features
Premium features are encrypted in `src/premium.zip`. To develop premium features:
1. Run `npm run decrypt_premium` with the decryption key
2. Work in the decrypted `src/premium/` folder
3. Run `npm run encrypt_premium` before committing

### Account Processing
The handler executes accounts with:
- **Thread control**: `NUMBER_OF_THREADS` parallel workers
- **Retry logic**: `ATTEMPTS_UNTIL_SUCCESS` retry attempts for failed accounts
- **Delays**: `DELAY_BETWEEN_ACCS_IN_S` between accounts, `DELAY_AFTER_ERROR_IN_S` after errors
- **Proxy support**: Optional proxy rotation per account
- **State persistence**: Success/failure tracking in `states/` directory

## Adding New Actions

1. **Define the action** in appropriate group file under `src/actions/groups/free/` or `src/actions/groups/premium/`
2. **Add function params schema** to `functionParams.jsonc` under the group key
3. **Implement handler logic** in the corresponding handler file (or create new handler if needed)
4. **Add modules/scenarios** as needed in `src/free/` or `src/premium/`
5. **Register handler** in `src/free/handlersList.ts` or `src/premium/handlersList.ts`

## Working with Accounts

Accounts are stored as Excel/CSV files in `secrets/accounts/`. Each account file contains columns defined in `src/utils/account/models/csvSheets.ts`:
- **Wallet columns**: name, evm private key, solana private key, etc.
- **CEX columns**: exchange name, API key, API secret, passphrase
- **Proxy columns**: proxy URL, rotate URL
- **Browser columns**: AdsPower/Vision profile IDs
- **Social columns**: Twitter credentials

The `JOB_ACCOUNTS` array in `launchParams.jsonc` specifies which account files and row ranges to process.

## Networks & Tokens

- **Chain IDs**: Use string format (e.g., "1" for Ethereum, "8453" for Base)
- **Network config**: Located in `networks.jsonc`, includes RPC URLs, explorers, native token
- **Token config**: Located in `tokens.jsonc`, maps token symbol → address per chain
- **Access**: Use `Network.getNetworkByChainId(chainId)` and `Network.getTokenBySymbol(chainId, symbol)`
- **Validation**: Always validate chain IDs with `Network.checkChainId(id)` in handlers

## Browser Automation

The project uses Puppeteer with antidetect browsers:
- **Supported browsers**: AdsPower, Vision
- **Browser utility**: `src/utils/browser.ts` provides `getBrowser()` to launch profiles
- **Extensions**: Automatically handles Metamask, Rabby, Phantom, Petra, Backpack, Argent wallet restoration
- **Captcha solving**: Integrated 2Captcha support

## Common Pitfalls

- **Path aliases**: Always use `@src/*`, `@utils/*`, etc. instead of relative imports
- **Chain IDs**: Use string format, not numbers
- **Async/await**: Most blockchain operations are async; always await properly
- **Error handling**: Handlers automatically catch errors and track failures; don't swallow errors
- **Encryption**: When `USE_ENCRYPTION: true`, accounts and secrets are AES-encrypted; decryption happens in `actionMode()`
- **Premium check**: Premium actions require license verification via `verifyLicense()`

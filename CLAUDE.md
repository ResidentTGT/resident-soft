# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**Resident Soft** (v0.8.1) is a multi-chain blockchain automation framework supporting:
- **EVM Chains**: Ethereum, BSC, Arbitrum, Base, Optimism, Polygon, Avalanche, zkSync, Scroll, Linea, 40+ more
- **Non-EVM**: Solana, Eclipse, Starknet, Aptos, Sui
- **DeFi**: DEX aggregators (Odos, 1inch), bridges, staking protocols
- **CEX**: OKX, Binance, Bitget, Bybit, KuCoin
- **Web3 Projects**: Twitter, Berachain, Polymarket, OpenSea, Abstract, 15+ more
- **Browser Automation**: Puppeteer with AdsPower, Vision, Afina antidetect browsers

**Stack**: Node.js/TypeScript backend (188 files) + React frontend (58 files)

**Statistics**: 27 action groups (8 free, 19 premium), 150+ actions, 8 free handlers, 50+ chains, 10+ DEXs, 7+ bridges

---

## Quick Start

### Run a Task
1. Edit `launchParams.jsonc` → set `ACTION_PARAMS: {group, action}`
2. Edit `functionParams.jsonc` → configure action parameters
3. `npm run start:backend`

### Add New Action
1. Add enums to `src/actions/types/action.types.ts` (ActionsGroupName, ActionName)
2. Create `src/actions/groups/free/<group>.actions.ts` and register in `src/actions/index.ts`
3. Create `src/free/handlers/<group>.ts` and register in `src/free/handlersList.ts`
4. Create `src/free/modules/<group>.ts` (optional - business logic)
5. Add types to `src/utils/types/functionParams.type.ts` and `functionParamsTemplate.ts`
6. Add examples to `functionParams.jsonc`
7. Run `npm run typecheck`

### Debug
- **Logs**: Console + `states/<state_name>.log` file
- **Frontend**: `npm run start:frontend` → real-time logs at http://localhost:3000
- **State**: `states/<group>_<action>_<timestamp>.json`

---

## Build & Run Commands

### Backend
- `npm run bundle:backend` - Build with esbuild to dist/index.js
- `npm run start:backend` - Bundle and run backend on port 3000
- `npm run restart:backend` - Run existing build/index.js
- `npm run typecheck` - TypeScript validation

### Frontend
- `npm run start:frontend` - Vite dev server on port 3000
- `npm run build:frontend` - Production build to frontend/dist

### Code Quality
- `npm run lint` / `npm run lint-fix` - ESLint
- `npm run prettier` / `npm run prettier-fix` - Format code
- `npm run secretlint` - Scan for exposed secrets
- `npm run check_all` - Full validation (typecheck + lint + prettier + build + secretlint)

### Advanced
- `npm run sea_build` - Create standalone executables (Windows/Linux/macOS)
- `npm run encrypt_premium` - Encrypt src/premium/ to src/premium.zip
- `npm run decrypt_premium` - Decrypt src/premium.zip for development

---

## Architecture

### Entry Point Flow

**File**: `index.ts`

**Startup Sequence**:
1. `setupUnhandledRejectionHandler()` - Prevent crashes
2. `failAllProcessStates()` - Mark interrupted tasks as failed
3. `Network.loadNetworksAndTokensConfigs()` - Load networks.jsonc, tokens.jsonc
4. `startHttpServer()` - Express on port 3000
5. `validateAndFixFunctionParams()`, `validateAndFixAccountFiles()` - Validate configs
6. `terminalInterface()` - Wait for ENTER key
7. Read launchParams.jsonc, functionParams.jsonc
8. Prompt for AES key if USE_ENCRYPTION: true
9. Verify license if premium
10. `executeTask()` → `actionMode()` - Execute action

### Core Configuration Files

**launchParams.jsonc** - Execution settings:
- `ACTION_PARAMS`: {group, action}
- `SHUFFLE_ACCOUNTS`, `TAKE_STATE`, `STATE_NAME`
- `JOB_ACCOUNTS`: [{file, start, end, include, exclude}]
- `DELAY_BETWEEN_ACCS_IN_S`, `DELAY_AFTER_ERROR_IN_S`, `ATTEMPTS_UNTIL_SUCCESS`
- `NUMBER_OF_THREADS`, `NUMBER_OF_EXECUTIONS`
- `PROXY`, `ROTATE_PROXY`, `USE_ENCRYPTION`, `LICENSE`

**functionParams.jsonc** - Action-specific params organized by group/action

**networks.jsonc** - Chain configs (chainId, name, nativeCoin, rpc[], explorer, type0)

**tokens.jsonc** - Token addresses per chain {chainId: {symbol: address}}

**secrets/accounts/** - Excel/CSV with 7 sheets: Account, Wallets, Cexs, Extensions, Twitter, Discord, Mail

**secrets/secretStorage/secretStorage.jsonc** - API keys (CMC, Etherscan, 2Captcha), Telegram config, custom RPCs

---

## Actions System

Actions are organized into **Action Groups**, each containing multiple **Actions**.

**Registry**: `src/actions/index.ts` exports `ACTIONS` array (27 groups)

**Action Types**:
- **isolated: true** - Per-account execution (parallel, controlled by NUMBER_OF_THREADS). Handler: `executeIsolated()`
- **isolated: false** - Joint execution (runs once for all accounts). Handler: `executeJoint()`

### Free Action Groups (9)

| Group | Handler | Purpose | Key Actions |
|-------|---------|---------|-------------|
| Common | CommonHandler | Core utilities | CheckBalances, GenerateWallets, GetAccounts |
| Evm | EvmHandler | EVM operations | SendToken, Wrap, Unwrap, Approve, MakeTransaction, CheckNft |
| Svm | SvmHandler | Solana/Eclipse | SendToken, SendTokenToMany |
| CexDex | CexDexHandler | Exchanges | WithdrawOkx, WithdrawBinance, OdosSwap, 1inchSwap |
| Bridges | BridgesHandler | Cross-chain | Stargate, GasZip, RelayLink, Orbiter, Bungee, Owlto |
| Symbiotic | SymbioticHandler | Symbiotic protocol | Deposit, Withdraw, Claim |
| Morpho | MorphoHandler | Morpho vaults | DepositVault, WithdrawVault |
| Checkers | CheckersHandler | Validation | CheckProxies, CheckCexBalances |
| TEST | TestHandler | Development | Test actions |

### Premium Action Groups (19)

Twitter, CommonUi (wallet restoration), Berachain, Opensea, Shape, Sophon, Superchain, Abstract, Polymarket, Meteora, ZksyncLite, Hemi, Plasma, Towns, Eclipse, AdsPower, Vision, Afina, TEST_PREMIUM

**Notable Premium**: Twitter (login, post, like, retweet, follow), OpenSea (NFT trading), Polymarket (prediction markets), CommonUi (Metamask/Rabby/Phantom/Petra/Backpack/Argent restoration)

---

## Handlers System

**Base Class**: `src/utils/handler.ts` - `BaseHandler` abstract class

**Registries**:
- Free: `src/free/handlersList.ts` → `FREE_HANDLERS` Map
- Premium: `src/premium/handlersList.ts` → `PREMIUM_HANDLERS` Map (encrypted)

**Abstract Methods**:
```typescript
abstract executeIsolated(params: IsolatedHandlerParams): Promise<{ skipDelay?: boolean }>;
abstract executeJoint(params: ActionModeParams): Promise<void>;
```

### Thread Pool Execution

`BaseHandler.actionIsolated()` orchestrates per-account execution:

1. **Thread Pool**: Processes accounts with NUMBER_OF_THREADS parallel workers using Promise.race()
2. **Retry Logic**: Failed accounts retry up to ATTEMPTS_UNTIL_SUCCESS times
3. **Proxy Setup**: Rotates proxy if ROTATE_PROXY: true
4. **State Tracking**: Updates state file after each account (successes/fails arrays)
5. **Delays**: Random DELAY_BETWEEN_ACCS_IN_S between accounts, DELAY_AFTER_ERROR_IN_S after errors
6. **Task Cancellation**: Checks checkTaskCancellation() before each account

**Algorithm**: Initialize pool with first N accounts → Wait for any to complete → Remove from pool → Add next from queue → Repeat

---

## Modules & Scenarios

### Core Modules

**Location**: `src/free/modules/`

| Module | File | Key Functions | Notes |
|--------|------|---------------|-------|
| **EVM** | `evm.ts` | getBalance, getDecimals, getAllowance, approve, sendToken, sendNative, wrap, unwrap, makeTransaction, waitForTransaction, estimateGas, getGasPrice | Type0 networks (BSC, Scroll, Arbitrum Nova, Harmony, Fuse, Core) use legacy transactions |
| **SVM** | `svmApi.ts` | getBalance, sendToken, sendSol, getTokenAccount, createAssociatedTokenAccount | Solana/Eclipse support |
| **Exchanges** | `exchanges/` | OKX, Binance, Bitget, Bybit, KuCoin (withdraw, getBalance, getDepositAddress); Odos, 1inch, Bebop, SyncSwap, Sushiswap, Velodrome (swap, quote) | CEX withdrawals + DEX swaps |
| **Bridges** | Various | Stargate, Orbiter, Bungee, Owlto, Router Nitro, Relay, GasZip | bridge, refuel functions |
| **Utilities** | Various | EvmScan (explorer API), CoinMarketCap (price feeds), Cursor (ghost cursor), Symbiotic | Helper modules |

### Scenarios

**Location**: `src/free/scenarios/`

Key scenarios: checkBalances (multi-chain + USD pricing), deployContract, refuelFromOneToMany (disperse ETH), odosSwapAllTokensToEth, lombardUnstake, stgUnstake, syncswapWithdrawLP, svm/sendTokenFromOneToMany, evm/makeAnyEvmTransaction, evm/checkNft

---

## Network Management

**File**: `src/utils/network/network.ts`

**Key Methods**:
- `static async loadNetworksAndTokensConfigs()` - Load configs from disk
- `static async getNetworkByChainId(chainId)` - Get network instance
- `static isEvm(chainId)` / `static isSvm(chainId)` - Check chain type
- `static getTokens(chainId)` / `static getTokenBySymbol(chainId, symbol)` - Token queries
- `static checkChainId(id)` - Validate chain ID (throws if invalid)
- `async getProvider()` - Get or create ethers.JsonRpcProvider

**Chain IDs**: ALWAYS strings! Examples: "1" (Ethereum), "56" (BSC), "8453" (Base), "Solana", "Eclipse"

**RPC Selection**: Tests each RPC with getBlockNumber(), selects first working, caches provider

**Custom RPCs**: Override in secretStorage.jsonc under `rpcs: { [chainId]: [urls] }`

---

## Account Management

**Account Structure**: `src/utils/account/models/account.type.ts`

**Properties**: name, wallets (evm, solana, eclipse, starknet, aptos, sui), cexs (okx, binance, bitget, bybit, kucoin), extensions (metamask, rabby, phantom, petra, backpack, argent), proxy, socials (twitter, discord), browserProfile (adsPower, vision, afina), mail, github

**Sheet Structure** (`csvSheets.ts`): 7 sheets per file
1. Account: Browser profiles, proxy, GitHub token
2. Wallets: EVM, Solana, Eclipse, Starknet, Aptos, Sui (seeds, private keys, addresses)
3. Cexs: Exchange API credentials
4. Extensions: Wallet extension data
5. Twitter: Social credentials
6. Discord: Social credentials
7. Mail: Email details

**Location**: `secrets/accounts/encrypted/` or `secrets/accounts/decrypted/`

**Processing**: `getAllAccounts()` → Parse Excel/CSV → Filter by start/end/include/exclude → Decrypt if USE_ENCRYPTION → Shuffle if SHUFFLE_ACCOUNTS

**Encryption**: AES-256-CBC with PBKDF2 key derivation

---

## Browser Automation

**Technology**: rebrowser-puppeteer-core, puppeteer-extra, ghost-cursor, puppeteer-extra-plugin-recaptcha

**Browsers**: AdsPower, Vision, Afina (antidetect browsers for fingerprint management)

**Main Functions** (`src/utils/browsers/index.ts`):
- `getBrowser(browserType, account, secretStorage)` - Open browser and launch profile
- `getPage(browser)` - Get page from browser
- `waitForElement(page, selector, timeout)` - Wait for element
- `safeClosePage(page)` - Safe close with error handling
- `clearCache/Cookies/LocalStorage(page)` - Clear browser data

**Wallet Restoration** (Premium): Metamask, Rabby, Phantom, Petra, Backpack, Argent

**CAPTCHA**: 2Captcha integration via puppeteer-extra-plugin-recaptcha (API key in secretStorage)

**Human-Like Behavior**: Ghost cursor with Bezier curves, random speeds, natural clicks

---

## State Management

**Location**: `src/utils/state/`

**StateStorage**: JSON-on-disk in `states/` directory with thread-safe writes

**StandardState Interface**:
- `status`: Idle | Process | Finish | Fail
- `successes`: string[] - Successful account names
- `fails`: string[] - Failed account names
- `info`: Error messages or additional info
- `launchParams`, `actionFunctionParams`: Execution snapshots
- `createdAt`: ISO timestamp

**Lifecycle**:
1. **Creation**: Initialize with Process status, empty successes/fails
2. **Updates**: Push account names to successes/fails after each completion
3. **Finalization**: Mark as Finish or Fail
4. **Resume**: Set TAKE_STATE: true, STATE_NAME: "..." to resume

**Files**: `states/<group>_<action>_<timestamp>.json`, `states/<state_name>.log`

---

## Logging System

**File**: `src/utils/logger.ts` - Singleton Logger class

**Message Types**: Fatal, Error, Warn, Info, Notice, Debug, Trace

**Outputs**:
1. **Console**: Colored ANSI output, format `[HH:MM:SS] [TYPE] Message`
2. **File**: Appended to `states/<stateName>.log`, thread-safe
3. **Telegram**: Via Grammy bot (botToken, chatId in secretStorage)
4. **SSE**: Real-time broadcast to frontend via `/api/events`

**Usage**: `await logger.log('Message', MessageType.Info)`

---

## HTTP Server & Frontend

**Backend**: Express v5 on port 3000 (`src/utils/server/server.ts`)

**API Routes**:
- `/api/events` - Server-Sent Events (log, taskStarted, taskFinished, taskCancelled, accountSuccess, accountFailed)
- `/api/configs` - GET/PUT launchParams.jsonc, functionParams.jsonc
- `/api/tasks` - POST execute, POST cancel, GET active
- `/api/accsfiles` - List/get/update account files
- `/api/process/states` - List/get/delete states, get logs
- `/api/secrets` - GET/PUT secretStorage.jsonc
- `/api/metadata` - GET actions, networks, tokens

**Frontend**: React 19 + Vite + TypeScript (`frontend/src/`)

**Features**: Config editor, task control, account management (Handsontable), state viewer, real-time SSE updates, secret management

---

## TypeScript Path Aliases

**Configuration**: `tsconfig.json`

**Aliases**:
- `@src/*` → `src/*`
- `@utils/*` → `src/utils/*`
- `@freeModules/*` → `src/free/modules/*`
- `@freeScenarios/*` → `src/free/scenarios/*`
- `@freeHandlers/*` → `src/free/handlers/*`
- `@premiumModules/*` → `src/premium/modules/*`
- `@premiumScenarios/*` → `src/premium/scenarios/*`
- `@premiumHandlers/*` → `src/premium/handlers/*`

**ALWAYS use path aliases, NEVER relative imports!**

```typescript
// ✅ CORRECT
import { Network } from '@utils/network';
import { Evm } from '@freeModules/evm';

// ❌ WRONG
import { Network } from '../../utils/network';
```

---

## Premium Features

**Encryption**: Premium features in `src/premium.zip` (2.3MB encrypted)

**Structure** (when decrypted): `src/premium/` with handlersList.ts, handlers/, modules/, scenarios/

**Access Control**:
1. User provides LICENSE in launchParams.jsonc
2. `verifyLicense()` called in actionMode()
3. Sends telemetry, validates license
4. Loads premium handlers if valid via `loadPremiumHandlers()`

**Development Workflow**:
1. `npm run decrypt_premium` (enter key)
2. Develop in src/premium/
3. Test with LICENSE: "key" in launchParams
4. `npm run encrypt_premium` before commit
5. Never commit decrypted src/premium/ (gitignored)

---

## Adding New Actions

**Process**: 9 steps - 3 new files, 6 updates

### 1. Add Enums (`src/actions/types/action.types.ts`)
- Add group to `ActionsGroupName` enum: `Evm = 'Evm'`
- Add actions to `ActionName` enum: `SendToken`, `Wrap`, `Unwrap`

### 2. Create Action Group (`src/actions/groups/free/<group>.actions.ts`)
- Export `ActionsGroup` object with group name, actions array
- Set `isolated: true` (per-account parallel) or `false` (joint execution)

### 3. Register Action Group (`src/actions/index.ts`)
- Import: `import { evmActions } from './groups/free/evm.actions';`
- Add to `ACTIONS` array: `evmActions,`

### 4. Create Handler (`src/free/handlers/<group>.ts`)
- Extend `BaseHandler`
- Implement `executeIsolated()` with `switch (actionParams.action)` statement
- Call module methods with `await Module.method(account, functionParams.param1, ...)`
- Use `this.unsupportedAction()` in default case
- Return `{ skipDelay: false }`
- Implement `executeJoint()` (return empty if no joint actions)

### 5. Register Handler (`src/free/handlersList.ts`)
- Import: `import { EvmHandler } from './handlers/evm';`
- Add to `FREE_HANDLERS` Map: `[ActionsGroupName.Evm, new EvmHandler(ActionsGroupName.Evm)]`

### 6. Create Module (`src/free/modules/<group>.ts`) - Optional
- Use `export abstract class` with `static` methods
- Validate required fields: `if (!account.wallets?.evm?.private) throw new MissingFieldError('wallets.evm.private');`
- Get network: `const network = await Network.getNetworkByChainId(chainId);`
- Find token: `const tokenObj = network.tokens.find((t) => t.symbol === token); if (!tokenObj) throw new Error('Token not found');`
- Use `Logger.getInstance()` for logging
- Use `Evm` helper functions: `getBalance`, `getDecimals`, `sendToken`, `makeTransaction`

### 7. Add TypeScript Interface (`src/utils/types/functionParams.type.ts`)
```typescript
Evm?: {
  SendToken?: {
    fromChainId: ChainId;
    token: string;
    amount: [number, number];  // Range [min, max]
    minBalanceToKeep: [number, number];
    minAmountToSend: number;
    to: string;  // Address or 'evm'
  };
};
```

### 8. Add Template (`src/utils/types/functionParamsTemplate.ts`)
```typescript
Evm: {
  SendToken: {
    fromChainId: ChainId.BNB,  // Use enum, not string "56"
    token: 'USDC',
    amount: [0.001, 0.001],  // [min, max] range
    minBalanceToKeep: [0.0001, 0.0001],
    minAmountToSend: 0.000001,
    to: 'evm',  // Sends to own EVM address
  },
},
```

### 9. Update Config (`functionParams.jsonc`)
```jsonc
"Evm": {
  "SendToken": {
    "fromChainId": "56",  // String in JSON
    "token": "USDC",
    "amount": [0.001, 0.001],
    "minBalanceToKeep": [0.0001, 0.0001],
    "minAmountToSend": 0.000001,
    "to": "evm"
  }
}
```

### File Tree
```
src/
├── actions/
│   ├── types/action.types.ts          # 1. Enums
│   ├── groups/free/<group>.actions.ts # 2. Definition (NEW)
│   └── index.ts                       # 3. Register
├── free/
│   ├── handlers/<group>.ts            # 4. Handler (NEW)
│   ├── handlersList.ts                # 5. Register handler
│   └── modules/<group>.ts             # 6. Module (NEW, optional)
└── utils/types/
    ├── functionParams.type.ts         # 7. Interface
    └── functionParamsTemplate.ts      # 8. Template
functionParams.jsonc                   # 9. Config
```

### Complete Example
```typescript
// Handler (src/free/handlers/evm.ts)
import { ActionName } from '@src/actions';
import { BaseHandler, IsolatedHandlerParams } from '@src/utils/handler';
import { Evm } from '@freeModules/evm';
import { Network } from '@src/utils/network';
import { MissingFieldError } from '@src/utils/errors';
import { resolveAdresses } from '@src/utils/resolveAddresses';
import { ethers } from 'ethers';
import Random from '@src/utils/random';

export class EvmHandler extends BaseHandler {
  async executeIsolated(params: IsolatedHandlerParams) {
    const { account, functionParams, actionParams } = params;

    switch (actionParams.action) {
      case ActionName.SendToken: {
        if (!account.wallets?.evm?.private) throw new MissingFieldError('wallets.evm.private');

        const network = await Network.getNetworkByChainId(functionParams.fromChainId);
        const token = network.tokens.find((t) => t.symbol === functionParams.token);
        if (!token) throw new Error(`No ${functionParams.token} in ${network.name}`);

        const toAddr = resolveAdresses(account, functionParams.to);
        const decimals = await Evm.getDecimals(network, token);
        const wallet = new ethers.Wallet(account.wallets.evm.private);
        const bal = +ethers.formatUnits(await Evm.getBalance(network, wallet.address, token.symbol), decimals);

        const amount = Random.float(functionParams.amount[0], functionParams.amount[1]).toFixed(decimals);
        if (bal <= +amount || +amount <= 0) throw new Error(`Insufficient balance: ${bal} ${token.symbol}`);

        if (functionParams.token === network.nativeCoin)
          await Evm.sendNative(account.wallets.evm.private, network, toAddr, amount);
        else
          await Evm.sendToken(account.wallets.evm.private, network, toAddr, functionParams.token, amount);

        break;
      }

      default:
        this.unsupportedAction(actionParams.action);
    }

    return { skipDelay: false };
  }

  async executeJoint() { return; }
}
```

**Validation**: `npm run typecheck` → `npm run start:backend`

---
## Common Pitfalls & Best Practices

### ❌ WRONG → ✅ CORRECT

**Path Aliases**:
```typescript
❌ import { Network } from '../../utils/network';
✅ import { Network } from '@utils/network';
```

**Chain IDs**:
```typescript
❌ const chainId: number = 1;
✅ const chainId: string = '1';
✅ if (chainId === ChainId.Ethereum) { }
```

**Async/Await**:
```typescript
❌ const balance = Evm.getBalance(wallet, token, network);
✅ const balance = await Evm.getBalance(wallet, token, network);
✅ await tx.wait();
```

**Error Handling**:
```typescript
❌ catch (error) { console.log('Error'); } // Swallows error
✅ await operation(); // Let error propagate, BaseHandler catches it
✅ catch (error) { await logger.log(error.message, MessageType.Error); throw error; }
```

**Network Validation**:
```typescript
❌ const network = await Network.getNetworkByChainId(chainId);
✅ Network.checkChainId(chainId); // Throws if invalid
✅ const network = await Network.getNetworkByChainId(chainId);
```

**Token Lookup**:
```typescript
❌ const token = '0xA0b86991...'; // Hardcoded
✅ const token = Network.getTokenBySymbol(chainId, 'USDC');
✅ if (!token) throw new Error('Token not found');
```

**Encryption**:
```typescript
❌ const accounts = await readAccountFile('secrets/accounts/decrypted/accs.xlsx');
✅ const accounts = await getEncryptedOrDecryptedAccounts(aesKey);
```

---

## Key Dependencies

| Category | Key Packages | Versions |
|----------|-------------|----------|
| **Blockchain** | ethers, @solana/web3.js, starknet, @aptos-labs/ts-sdk, @mysten/sui, @1inch/fusion-sdk, @polymarket/clob-client | 6.15.0, 2.0.0-rc.4, 7.6.4, 4.0.0, 1.37.1, 2.3.6, 5.1.2 |
| **Browser** | rebrowser-puppeteer-core, puppeteer-extra, ghost-cursor, @2captcha/captcha-solver | 24.8.1, 3.3.6, 1.4.1, 1.3.0 |
| **Server** | express, axios | 5.1.0, 1.11.0 |
| **Utilities** | exceljs, grammy, crypto-js, bip39, jsonc-parser, uuid, https-proxy-agent, socks-proxy-agent | 4.4.0, 1.37.0, 4.2.0, 3.1.0, 3.3.1, 11.1.0, 7.0.6, 8.0.5 |
| **Frontend** | react, vite, Material-UI, Handsontable | 19.1.1, latest |
| **Dev** | typescript, esbuild, tsc-alias, eslint, prettier, secretlint, postject | 5.9.2, 0.25.8, 1.8.16, 9.32.0, 3.6.2, 10.2.2, 1.0.0-alpha.6 |

---

## Build & Deployment

**Backend Build**: `npm run bundle:backend` (esbuild → dist/index.js, CommonJS, path aliases resolved)

**Frontend Build**: `npm run build:frontend` (Vite → frontend/dist/, optimized React)

**SEA**: `npm run sea_build` creates standalone executables (Windows/Linux/macOS) with embedded Node.js runtime

**CI/CD**: `.github/workflows/build-release.yml` triggered by git tags `v*`, builds for 3 platforms (Node 24.5.0), uploads to GitHub Releases

---

## Advanced Topics

**Gas Pricing**: EIP-1559 (maxFeePerGas, maxPriorityFeePerGas) vs Type0 (gasPrice, type: 0). Check `network.type0`

**Proxy Formats**: http://user:pass@ip:port, https://..., socks4://..., socks5://... Set proxy_rotateUrl for rotation

**RPC Fallback**: Tests all RPCs with getBlockNumber(), selects first working, caches provider

**Account Order**: Default sequential, SHUFFLE_ACCOUNTS: true randomizes, include/exclude for filtering

**State Recovery**: failAllProcessStates() at startup marks interrupted as failed. TAKE_STATE: true resumes execution

**Task Cancellation**: checkTaskCancellation(taskId) before each account, throws if cancelled

**Telemetry**: Sent on task start (premium only) and license validation (license, action, timestamp, version)

---

## Troubleshooting

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Action doesn't exist" | Missing enum or registration | Check ActionsGroupName/ActionName enums, group file, src/actions/index.ts |
| "Network not found" | Invalid chain ID | Chain ID must be string, check networks.jsonc |
| "Token not found" | Token not in config | Check tokens.jsonc, use Network.getTokenBySymbol() |
| "Insufficient funds" | Low balance | Check balance, account for gas, verify minBalanceToKeep |
| "License invalid" | Expired or wrong license | Check launchParams.jsonc LICENSE field, verify active, contact support |
| "Cannot decrypt" | Wrong AES key or corrupted file | Verify AES key matches encryption key, check encrypted/ folders exist |
| "Proxy error" | Invalid proxy format or dead proxy | Verify format: `http://user:pass@ip:port`, test connection |
| "RPC error" | RPC node down or rate limited | Try alternative RPC from networks.jsonc, add custom to secretStorage |

### Debug & Performance

- **Debug**: Use `MessageType.Debug`/`Trace`, view logs in console + `states/<state>.log` file + frontend
- **Performance**: Increase `NUMBER_OF_THREADS`, reduce `DELAY_BETWEEN_ACCS_IN_S` (risk: rate limiting)

---

## Quick Reference

| Category | Key Info |
|----------|----------|
| **Entry Point** | `index.ts` → Network.loadConfigs() → startHttpServer() → executeTask() → actionMode() |
| **Core Files** | Actions: `src/actions/index.ts`, Handlers: `src/free/handlersList.ts`, Modules: `src/free/modules/evm.ts`, Network: `src/utils/network/network.ts`, State: `src/utils/state/` |
| **Actions** | isolated: true (per-account parallel), isolated: false (joint execution once) |
| **Handlers** | Extend BaseHandler, implement executeIsolated()/executeJoint(), thread pool with NUMBER_OF_THREADS |
| **Config Files** | launchParams.jsonc (execution settings), functionParams.jsonc (action params), networks.jsonc (chains), tokens.jsonc (token addresses), secretStorage.jsonc (API keys) |
| **Must Know** | ✅ Path aliases (@utils/*, not ../../), ✅ Chain IDs as strings ('1', not 1), ✅ Use Logger.getInstance(), ✅ Let errors propagate to BaseHandler |
| **Premium** | src/premium.zip encrypted, decrypt with `npm run decrypt_premium`, requires LICENSE in launchParams |
| **Docs** | https://resident.gitbook.io/resident-soft |

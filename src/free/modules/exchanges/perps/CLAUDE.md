# Perps Arbitrage Module

Cross-exchange perpetual futures arbitrage system for Backpack and Extended exchanges.

## Overview

This module implements a delta-neutral arbitrage strategy that exploits price discrepancies between perpetual futures exchanges. When the same asset trades at different prices on Backpack vs Extended, the system opens opposite positions (long on cheap exchange, short on expensive) to capture the spread.

**Key Features:**
- Real-time WebSocket orderbook monitoring
- Automatic opportunity detection with fee-adjusted profit calculation
- Parallel order execution with rollback on failure
- Exit monitoring until spread convergence
- P&L tracking with fee accounting

## Roadmap / TODO

- [ ] **Унификация точности позиции** - привести quantity к единому формату до размещения ордеров (сейчас каждая биржа округляет по-своему: Backpack по `stepSize`, Extended по `minOrderSizeChange`)
- [ ] **Агрегация объёма по стакану** - собирать максимальный volume не только с лучшего bid/ask, а проходить по уровням стакана пока спред >= targetProfitPercent (сейчас берётся только `min(bestAsk.qty, bestBid.qty)`)
- [ ] **Логирование данных в файлы** - сохранять полный orderbook и все сделки (open/close) в JSON для анализа и дебага

## Directory Structure

```
perps/
├── arbitrage/                    # Main arbitrage orchestration
│   ├── arbitrage.ts             # Arbitrage class - main entry point
│   ├── calculator.ts            # Profit/loss and fee calculations
│   ├── chart.ts                 # Chart rendering utilities (optional)
│   ├── adapters/
│   │   ├── index.ts             # Adapter exports
│   │   ├── backpack.adapter.ts  # Backpack exchange adapter
│   │   └── extended.adapter.ts  # Extended exchange adapter
│   └── models/
│       ├── index.ts             # Model exports
│       ├── exchange.enum.ts     # Exchange enum (Backpack, Extended)
│       ├── adapter.interface.ts # ExchangeAdapter interface
│       ├── config.interface.ts  # ExchangesConfig (credentials)
│       ├── orderbook.interface.ts # UnifiedOrderbook
│       ├── opportunity.interface.ts # ArbitrageOpportunity, ArbitrageConfig
│       ├── execution.interface.ts # ExecutionResult, OpenedPosition, etc.
│       └── chart.interface.ts   # Chart data types
├── backpack/                     # Backpack exchange client
│   ├── backpack.ts              # REST API + WebSocket methods
│   └── models/                  # Backpack-specific types
│       ├── credentials.interface.ts
│       ├── balance.interface.ts
│       ├── ticker.interface.ts
│       ├── orderbook.interface.ts
│       ├── order.interface.ts
│       ├── position.interface.ts
│       └── market.interface.ts
└── extended/                     # Extended (X10) exchange client
    ├── extended.ts              # REST API + WebSocket + StarkNet signing
    └── models/                  # Extended-specific types
        ├── credentials.interface.ts
        ├── balance.interface.ts
        ├── markPrice.interface.ts
        ├── orderbook.interface.ts
        ├── order.interface.ts
        ├── position.interface.ts
        └── market.interface.ts
```

## Architecture

### Adapter Pattern

The system uses an adapter pattern to unify different exchange APIs into a common interface:

```
┌────────────────────┐
│    Arbitrage       │  Main orchestrator
└─────────┬──────────┘
          │
          ▼
┌─────────────────────────────────────┐
│        ExchangeAdapter              │  Unified interface
├─────────────────────────────────────┤
│ • subscribeOrderbook()              │
│ • placeMarketOrder()                │
│ • closePosition()                   │
│ • getPosition()                     │
│ • getAvailableBalance()             │
│ • subscribeOrderUpdates()           │
└─────────┬───────────────────┬───────┘
          │                   │
          ▼                   ▼
┌─────────────────┐  ┌─────────────────┐
│ BackpackAdapter │  │ ExtendedAdapter │
└────────┬────────┘  └────────┬────────┘
         │                    │
         ▼                    ▼
┌─────────────────┐  ┌─────────────────┐
│    Backpack     │  │    Extended     │
│    (ED25519)    │  │   (StarkNet)    │
└─────────────────┘  └─────────────────┘
```

### Class Responsibilities

| Class | File | Responsibility |
|-------|------|----------------|
| `Arbitrage` | `arbitrage.ts` | Main orchestrator: monitors orderbooks, detects opportunities, executes trades |
| `BackpackAdapter` | `backpack.adapter.ts` | Translates Backpack API to unified interface |
| `ExtendedAdapter` | `extended.adapter.ts` | Translates Extended API to unified interface |
| `Backpack` | `backpack.ts` | Low-level Backpack REST/WS client with ED25519 signing |
| `Extended` | `extended.ts` | Low-level Extended REST/WS client with StarkNet WASM signing |

## Data Models

### Core Interfaces

**UnifiedOrderbook** - Normalized orderbook data from any exchange:
```typescript
interface UnifiedOrderbook {
  exchange: Exchange;          // 'Backpack' | 'Extended'
  symbol: string;              // e.g., 'BTC_USDC_PERP'
  bestBid: { price: number; quantity: number };
  bestAsk: { price: number; quantity: number };
  timestamp: number;           // milliseconds
}
```

**ArbitrageOpportunity** - Detected trading opportunity:
```typescript
interface ArbitrageOpportunity {
  timestamp: number;
  buyExchange: Exchange;       // Where to buy (has lower ask)
  sellExchange: Exchange;      // Where to sell (has higher bid)
  buySymbol: string;           // Symbol on buy exchange
  sellSymbol: string;          // Symbol on sell exchange
  buyPrice: number;            // Ask price (we buy at this)
  sellPrice: number;           // Bid price (we sell at this)
  volume: number;              // min(buyQty, sellQty)
  netSpread: number;           // sellPrice - buyPrice - totalFees (per unit)
  netSpreadPercent: number;    // (netSpread / buyPrice) * 100
  profitUsd: number;           // netSpread * volume
  totalFees: number;           // 4x taker fees for full cycle
}
```

**ArbitrageConfig** - Configuration for monitoring:
```typescript
interface ArbitrageConfig {
  timeWindowMs: number;              // Max timestamp diff between exchanges (e.g., 500)
  targetProfitPercent: number;       // Min NET profit after 4x fees (e.g., 0.05)
  maxExecutions?: number;            // Stop after N trades (undefined = unlimited)
  maxTradeInPercentOfBalance: number; // Max % of balance per trade (e.g., 50)
  minTradeUsd: number;               // Minimum trade size in USD
}
```

**ExecutionResult** - Result of opening positions:
```typescript
interface ExecutionResult {
  opportunity: ArbitrageOpportunity;
  buyPosition: OpenedPosition;   // LONG position details
  sellPosition: OpenedPosition;  // SHORT position details
  openedAt: number;              // Timestamp when positions opened
}

interface OpenedPosition {
  exchange: Exchange;
  symbol: string;
  side: 'long' | 'short';
  quantity: string;
  entryPrice: string;
  orderId: string;
}
```

**UnifiedOrderUpdate** - WebSocket order status updates:
```typescript
interface UnifiedOrderUpdate {
  exchange: Exchange;
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  status: 'new' | 'partiallyFilled' | 'filled' | 'cancelled' | 'rejected' | 'expired';
  quantity: string;
  filledQuantity: string;
  avgPrice: string;
  timestamp: number;
}
```

## monitorAndExecute() - Complete Flow

The main method `monitorAndExecute()` orchestrates the entire arbitrage cycle. Below is a detailed breakdown of each phase.

### Phase 0: Initialization

**Location**: `arbitrage.ts:388-437`

```
┌─────────────────────────────────────────────────────────────┐
│                     INITIALIZATION                           │
├─────────────────────────────────────────────────────────────┤
│ 1. Reset execution counter (_executionCount = 0)            │
│                                                              │
│ 2. Warmup Extended adapter (if configured):                 │
│    • Initialize StarkNet WASM module                        │
│    • Cache all markets (name → Market)                      │
│    • Cache all fees (market → Fees)                         │
│                                                              │
│ 3. Warmup Backpack adapter (if configured):                 │
│    • Cache all markets (symbol → BackpackMarket)            │
│                                                              │
│ 4. Update balances (_updateBalances):                       │
│    • Fetch USDC balance from each exchange                  │
│    • Store in _balances Map<Exchange, number>               │
│    • Retry up to 3 times on failure                         │
│                                                              │
│ 5. Subscribe to orderbook streams:                          │
│    • Backpack: bookTicker.{symbol} (best bid/ask)           │
│    • Extended: orderbooks/{market}?depth=1                  │
│    • On each message: update _latestOrderbooks, check opps  │
│                                                              │
│ 6. Subscribe to private order streams:                      │
│    • Backpack: account.orderUpdate.{symbol} (signed)        │
│    • Extended: /stream/account (API key header)             │
│    • Store updates in _orderEvents buffer (TTL 60s)         │
└─────────────────────────────────────────────────────────────┘
```

**Code snippet**:
```typescript
// Warmup sequence
const extendedAdapter = this._adapters.get(Exchange.Extended);
if (extendedAdapter) await extendedAdapter.warmup();

const backpackAdapter = this._adapters.get(Exchange.Backpack);
if (backpackAdapter) await backpackAdapter.warmup();

await this._updateBalances();

// Subscribe to market data
const subs = this.subscribe(symbols, (orderbook) => {
  this._latestOrderbooks.set(orderbook.exchange, orderbook);
  this._checkAndExecute(config, subs);
}, onError);

// Subscribe to private order updates
this.subscribeOrderStreams(symbols, onError);
```

### Phase 1: Monitoring Orderbooks

**Location**: `arbitrage.ts:440-478`

The system continuously receives orderbook updates via WebSocket. On each update:

```
┌─────────────────────────────────────────────────────────────┐
│                   ORDERBOOK MONITORING                       │
├─────────────────────────────────────────────────────────────┤
│ On every WebSocket message:                                  │
│                                                              │
│ 1. Update cache: _latestOrderbooks.set(exchange, orderbook) │
│                                                              │
│ 2. Call _checkAndExecute():                                 │
│    • Skip if _isExecuting (position already open)           │
│    • Skip if < 2 orderbooks cached                          │
│                                                              │
│ 3. For each pair of exchanges (i, j):                       │
│    • Check timestamp freshness:                             │
│      |orderbook[i].timestamp - orderbook[j].timestamp|      │
│      must be <= config.timeWindowMs                         │
│                                                              │
│ 4. Calculate opportunities both directions:                 │
│    • opp1 = calculateOpportunityWithClosingFees(ob[i], ob[j])│
│    • opp2 = calculateOpportunityWithClosingFees(ob[j], ob[i])│
│                                                              │
│ 5. If netSpreadPercent >= targetProfitPercent:              │
│    • Log opportunity details                                 │
│    • Execute via _executeOpportunity()                      │
└─────────────────────────────────────────────────────────────┘
```

### Phase 2: Detection (Opportunity Calculation)

**Location**: `calculator.ts:47-87`

When checking for opportunities, the calculator performs:

```
┌─────────────────────────────────────────────────────────────┐
│                   OPPORTUNITY DETECTION                      │
├─────────────────────────────────────────────────────────────┤
│ Inputs:                                                      │
│   buy.bestAsk  = price to buy on "cheap" exchange           │
│   sell.bestBid = price to sell on "expensive" exchange      │
│                                                              │
│ Step 1: Gross Spread                                        │
│   grossSpread = sell.bestBid.price - buy.bestAsk.price      │
│   If grossSpread <= 0 → return null (no opportunity)        │
│                                                              │
│ Step 2: Fee Calculation (4x taker fees)                     │
│   buyFee  = EXCHANGES_FEES[buy.exchange].taker              │
│   sellFee = EXCHANGES_FEES[sell.exchange].taker             │
│   avgPrice = (buyPrice + sellPrice) / 2                     │
│                                                              │
│   totalFees = (buyFee + sellFee) * avgPrice * 2             │
│   ├── Open buy fee:   buyPrice * buyFee                     │
│   ├── Open sell fee:  sellPrice * sellFee                   │
│   ├── Close sell fee: ~avgPrice * buyFee                    │
│   └── Close buy fee:  ~avgPrice * sellFee                   │
│                                                              │
│ Step 3: Net Spread                                          │
│   netSpread = grossSpread - totalFees                       │
│   netSpreadPercent = (netSpread / buyPrice) * 100           │
│   If netSpread <= 0 → return null                           │
│                                                              │
│ Step 4: Volume & Profit                                     │
│   volume = min(buy.bestAsk.quantity, sell.bestBid.quantity) │
│   profitUsd = netSpread * volume                            │
│                                                              │
│ Return ArbitrageOpportunity if profitable                   │
└─────────────────────────────────────────────────────────────┘
```

**Fee Constants** (`calculator.ts:5-8`):
```typescript
EXCHANGES_FEES = {
  Backpack: { maker: 0.0002, taker: 0.0005 },  // 0.05% taker
  Extended: { maker: 0,      taker: 0.00025 }, // 0.025% taker
}
```

### Phase 3: Opening Positions (_openPositions)

**Location**: `arbitrage.ts:550-619`

```
┌─────────────────────────────────────────────────────────────┐
│                    OPENING POSITIONS                         │
├─────────────────────────────────────────────────────────────┤
│ Input: ArbitrageOpportunity with buyExchange, sellExchange  │
│                                                              │
│ Step 1: Validate adapters and order streams                 │
│   • Check both adapters exist                               │
│   • Check _orderSubscriptions has both exchanges            │
│                                                              │
│ Step 2: Calculate trade volume                              │
│   minBalance = min(buyBalance, sellBalance)                 │
│   maxFromBalance = (minBalance * maxTradePercent) / buyPrice│
│   finalVolume = min(maxFromBalance, opportunity.volume)     │
│   If finalVolume * price < minTradeUsd → throw Error        │
│                                                              │
│ Step 3: Place orders in parallel                            │
│   Promise.allSettled([                                      │
│     buyAdapter.placeMarketOrder(symbol, 'buy', volume, price)│
│     sellAdapter.placeMarketOrder(symbol, 'sell', volume, price)│
│   ])                                                         │
│                                                              │
│ Step 4: Handle REST failures                                │
│   If either promise rejected:                               │
│   • Log "[ROLLBACK] Order failed..."                        │
│   • Call _closeAllPositions() to clean up                   │
│   • Throw error with failure details                        │
│                                                              │
│ Step 5: Wait for WebSocket confirmation                     │
│   Promise.all([                                             │
│     _waitForOrder(buyOrderId, 10000)                        │
│     _waitForOrder(sellOrderId, 10000)                       │
│   ])                                                         │
│                                                              │
│   _waitForOrder() polls _orderEvents buffer for:            │
│   • 'filled' status → return order details                  │
│   • 'cancelled'/'rejected'/'expired' → return null          │
│   • Timeout after 10s → return null                         │
│                                                              │
│ Step 6: Handle WSS failures                                 │
│   If either order not confirmed:                            │
│   • Log "[ROLLBACK] WSS confirmation failed..."             │
│   • Call _closeAllPositions()                               │
│   • Throw error                                             │
│                                                              │
│ Return: ExecutionResult with both positions                 │
└─────────────────────────────────────────────────────────────┘
```

**Position Types After Opening**:
- **buyPosition**: LONG position on buyExchange (bought asset)
- **sellPosition**: SHORT position on sellExchange (sold asset)

### Phase 4: Exit Monitoring (_monitorAndClosePositions)

**Location**: `arbitrage.ts:621-666`

```
┌─────────────────────────────────────────────────────────────┐
│                    EXIT MONITORING                           │
├─────────────────────────────────────────────────────────────┤
│ Infinite loop checking spread every tick (~immediate):      │
│                                                              │
│ while (true) {                                              │
│   buyOrderbook = _latestOrderbooks.get(buyPosition.exchange)│
│   sellOrderbook = _latestOrderbooks.get(sellPosition.exchange)│
│                                                              │
│   if (both orderbooks present):                             │
│     check = shouldClosePositions(opp, buyOB, sellOB)        │
│                                                              │
│     currentSpread = sellOB.bestBid - buyOB.bestAsk          │
│                                                              │
│     Every 5 seconds: log current spread and hold duration   │
│                                                              │
│     if (currentSpread <= 0):                                │
│       >>> EXIT CONDITION TRIGGERED                          │
│       • Close both positions                                │
│       • Calculate P&L                                       │
│       • Update balances                                     │
│       • Return net P&L                                      │
│                                                              │
│   await setImmediate (yield to event loop)                  │
│ }                                                           │
│                                                              │
│ Exit Logic (calculator.ts:110-123):                         │
│   shouldClose = currentSpread <= 0                          │
│   (Spread converged or reversed = profit locked in)         │
└─────────────────────────────────────────────────────────────┘
```

### Phase 5: Closing Positions

**Location**: `arbitrage.ts:522-548, 674-697`

```
┌─────────────────────────────────────────────────────────────┐
│                   CLOSING POSITIONS                          │
├─────────────────────────────────────────────────────────────┤
│ _closeAllPositions() - unified close for both exchanges:    │
│                                                              │
│ Promise.all([                                               │
│   _closePositionWithRetry(buyAdapter, buySymbol)            │
│   _closePositionWithRetry(sellAdapter, sellSymbol)          │
│ ])                                                          │
│                                                              │
│ _closePositionWithRetry() (max 10 attempts):                │
│ for (attempt = 1; attempt <= 10; attempt++):                │
│   1. Get current position: adapter.getPosition(symbol)      │
│      • If no position → return null (already closed)        │
│                                                              │
│   2. Close position: adapter.closePosition(position)        │
│      • LONG close: place SELL order (reduceOnly)            │
│      • SHORT close: place BUY order (reduceOnly)            │
│                                                              │
│   3. Wait for WSS confirmation: _waitForOrder(orderId, 10s) │
│      • If confirmed → return OrderFillResult                │
│      • If not → retry                                       │
│                                                              │
│   4. On exception: log warning, continue retry loop         │
│                                                              │
│ Return: [buyCloseResult, sellCloseResult]                   │
└─────────────────────────────────────────────────────────────┘
```

### Phase 6: P&L Calculation

**Location**: `arbitrage.ts:703-736`

```
┌─────────────────────────────────────────────────────────────┐
│                   P&L CALCULATION                            │
├─────────────────────────────────────────────────────────────┤
│ _calculatePnL(positions, buyCloseResult, sellCloseResult):  │
│                                                              │
│ LONG P&L (buyPosition - we bought, now selling):            │
│   closePrice = buyCloseResult.avgPrice                      │
│   entryPrice = buyPosition.entryPrice                       │
│   quantity = buyPosition.quantity                           │
│   buyPnl = (closePrice - entryPrice) * quantity             │
│                                                              │
│   Log: "LONG P&L: (close - entry) * qty = $X.XX"           │
│                                                              │
│ SHORT P&L (sellPosition - we sold, now buying back):        │
│   closePrice = sellCloseResult.avgPrice                     │
│   entryPrice = sellPosition.entryPrice                      │
│   quantity = sellPosition.quantity                          │
│   sellPnl = (entryPrice - closePrice) * quantity            │
│                                                              │
│   Log: "SHORT P&L: (entry - close) * qty = $X.XX"          │
│                                                              │
│ TOTAL:                                                      │
│   grossPnl = buyPnl + sellPnl                               │
│   totalFees = opportunity.totalFees (calculated at open)    │
│   netPnl = grossPnl - totalFees                             │
│                                                              │
│   Log: "Gross: $X, Fees: $X, Net: $X"                      │
│                                                              │
│ After P&L calculation:                                      │
│   _updateBalances() - refresh cached balances               │
│                                                              │
│ Return: netPnl                                              │
└─────────────────────────────────────────────────────────────┘
```

**P&L Formula Summary**:
```
LONG P&L  = (closePrice - entryPrice) * quantity
SHORT P&L = (entryPrice - closePrice) * quantity
Gross P&L = LONG P&L + SHORT P&L
Net P&L   = Gross P&L - totalFees
```

## Calculator Functions

**File**: `calculator.ts`

| Function | Purpose |
|----------|---------|
| `checkPairOpportunities(ob1, ob2, target)` | Checks both directions, returns profitable opportunities |
| `calculateOpportunityWithClosingFees(buy, sell)` | Calculates net spread after 4x fees |
| `shouldClosePositions(opp, buyOB, sellOB)` | Returns `{ shouldClose, currentSpread, currentSpreadPercent }` |

**Exit Condition**:
```typescript
shouldClose = currentSpread <= 0
// Where: currentSpread = sellOrderbook.bestBid - buyOrderbook.bestAsk
```

## Exchange Clients

### Backpack (backpack.ts)

**Authentication**: ED25519 signatures (Solana-style)

**Key Methods**:
| Method | Description |
|--------|-------------|
| `warmup()` | Cache all markets |
| `getMarket(symbol)` | Get market config (cached) |
| `placeMarketOrder(symbol, side, quantity)` | Place market order (rounds to stepSize) |
| `getPosition(symbol)` | Get current position |
| `closePosition(positionInfo)` | Close with reduceOnly=true |
| `subscribeOrderbook(symbol, onMessage)` | bookTicker stream |
| `subscribeOrderUpdates(symbol, onMessage)` | Private account.orderUpdate stream |

**Signing**:
```typescript
// ED25519 PKCS8 signing
_sign(message: string): string {
  const pkcs8Header = Buffer.from('302e020100300506032b657004220420', 'hex');
  const pkcs8Key = Buffer.concat([pkcs8Header, privateKeyBytes]);
  return crypto.sign(null, Buffer.from(message), privateKey).toString('base64');
}
```

### Extended (extended.ts)

**Authentication**: StarkNet signatures via WASM module

**Key Methods**:
| Method | Description |
|--------|-------------|
| `warmup()` | Init WASM, cache markets & fees |
| `getMarket(market)` | Get market config (cached) |
| `getFees(market)` | Get fee rates (cached) |
| `placeMarketOrder(symbol, side, qty, price)` | Place order with StarkNet signing |
| `getPositions(market)` | Get current positions |
| `closePosition(positionInfo)` | Close position |
| `subscribeOrderbook(market, full, onMessage)` | Orderbook stream |
| `subscribeAccount(onMessage)` | Private account stream |

**Order Signing** (StarkNet):
```typescript
// 1. Build order params (baseAmount, quoteAmount, feeAmount with resolutions)
// 2. Compute hash via WASM: get_order_msg(...)
// 3. Sign via WASM: sign_message(privateKey, hash)
// 4. Include signature in order request
```

**WASM Initialization**:
```typescript
import initWasm, { get_order_msg, sign_message } from '@x10xchange/stark-crypto-wrapper-wasm';
// Loads .wasm file from node_modules at runtime
```

## Configuration

**ExchangesConfig** - Credentials for exchanges:
```typescript
interface ExchangesConfig {
  backpack?: BackpackCredentials;
  extended?: ExtendedCredentials;
}

interface BackpackCredentials {
  apiKey: string;
  apiSecret: string;  // Base64-encoded ED25519 private key
}

interface ExtendedCredentials {
  apiKey: string;
  starkPrivateKey: string;
  starkPublicKey: string;
  vaultId: string;
}
```

**ArbitrageConfig** - Runtime settings:
```typescript
{
  timeWindowMs: 500,              // Max 500ms between exchange timestamps
  targetProfitPercent: 0.05,      // Min 0.05% profit after all fees
  maxExecutions: 10,              // Stop after 10 trades
  maxTradeInPercentOfBalance: 50, // Use max 50% of balance
  minTradeUsd: 100                // Minimum $100 per trade
}
```

## Risk Management

### Rollback Mechanism

If either order fails during opening:
1. Log `[ROLLBACK] Order failed...`
2. Call `_closeAllPositions()` to close any opened position
3. Log `[ROLLBACK] === ROLLBACK COMPLETE ===`
4. Throw error (execution marked failed)

### Volume Limits

```typescript
minBalance = min(buyBalance, sellBalance)
maxVolume = (minBalance * maxTradePercent) / buyPrice
finalVolume = min(maxVolume, orderbookVolume)

if (finalVolume * price < minTradeUsd) throw Error
```

### Exit Conditions

- **Primary**: `currentSpread <= 0` (spread converged/reversed)
- Positions are closed when the arbitrage opportunity disappears

### Retry Logic

- **Balance fetch**: 3 retries with 1s delay
- **Position close**: 10 retries with WSS confirmation

## Exchange Comparison

| Feature | Backpack | Extended |
|---------|----------|----------|
| **Blockchain** | Solana | StarkNet |
| **Signing** | ED25519 | StarkNet WASM |
| **Taker Fee** | 0.05% | 0.025% |
| **Maker Fee** | 0.02% | 0% |
| **Market Order** | Pure market | Market with 5% slippage price |
| **Warmup** | Market cache | WASM + markets + fees |
| **Order Stream** | account.orderUpdate.{symbol} | /stream/account |
| **Orderbook Stream** | bookTicker.{symbol} | orderbooks/{market}?depth=1 |

## Usage Example

```typescript
import { Arbitrage, Exchange } from '@freeModules/exchanges/perps/arbitrage';

const arb = new Arbitrage({
  backpack: { apiKey: '...', apiSecret: '...' },
  extended: { apiKey: '...', starkPrivateKey: '...', starkPublicKey: '...', vaultId: '...' }
});

const symbols = new Map<Exchange, string>([
  [Exchange.Backpack, 'BTC_USDC_PERP'],
  [Exchange.Extended, 'BTC-USD']
]);

const { subs, completed } = await arb.monitorAndExecute(symbols, {
  timeWindowMs: 500,
  targetProfitPercent: 0.05,
  maxExecutions: 10,
  maxTradeInPercentOfBalance: 50,
  minTradeUsd: 100
});

// Wait for maxExecutions or manually close
await completed;
// or: arb.close(subs);
```

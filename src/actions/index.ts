/**
 * Central actions registry
 * This file aggregates all action groups and exports them for use throughout the application
 */

// Re-export types
export * from './types/action.types';

// Import all action groups
// Free actions
import { commonActions } from './groups/free/common.actions';
import { evmActions } from './groups/free/evm.actions';
import { svmActions } from './groups/free/svm.actions';
import { okxActions } from './groups/free/okx.actions';
import { bitgetActions } from './groups/free/bitget.actions';
import { binanceActions } from './groups/free/binance.actions';
import { gateActions } from './groups/free/gate.actions';
import { bybitActions } from './groups/free/bybit.actions';
import { exchangesActions } from './groups/free/exchanges.actions';
import { odosActions } from './groups/free/odos.actions';
import { checkersActions } from './groups/free/checkers.actions';
import { testActions } from './groups/free/TEST.actions';

// Premium actions
import { twitterActions } from './groups/premium/twitter.actions';
import { commonUiActions } from './groups/premium/commonUi.actions';
import { berachainActions } from './groups/premium/berachain.actions';
import { openseaActions } from './groups/premium/opensea.actions';
import { shapeActions } from './groups/premium/shape.actions';
import { sophonActions } from './groups/premium/sophon.actions';
import { superchainActions } from './groups/premium/superchain.actions';
import { abstractActions } from './groups/premium/abstract.actions';
import { polymarketActions } from './groups/premium/polymarket.actions';
import { meteoaActions } from './groups/premium/meteora.actions';
import { zksyncLiteActions } from './groups/premium/zksyncLite.actions';
import { hemiActions } from './groups/premium/hemi.actions';
import { plasmaActions } from './groups/premium/plasma.actions';
import { townsActions } from './groups/premium/towns.actions';
import { eclipseActions } from './groups/premium/eclipse.actions';
import { adsPowerActions } from './groups/premium/adsPower.actions';
import { visionActions } from './groups/premium/vision.actions';
import { testPremiumActions } from './groups/premium/TEST_PREMIUM.actions';
import { afinaActions } from './groups/premium/afina.actions';

import type { ActionsGroup } from './types/action.types';

/**
 * Master list of all available actions grouped by category
 *
 * Groups are organized as follows:
 * - Core: Common, EVM, SVM
 * - Exchanges: OKX, Bitget, Binance, Gate, Bybit, Generic Exchanges
 * - DeFi: Odos
 * - Social: Twitter
 * - UI: Common UI operations
 * - Projects: Various blockchain projects (Berachain, Opensea, Shape, etc.)
 * - Tools: AdsPower, Vision, Checkers
 * - Test: Development and testing actions
 */
export const ACTIONS: ActionsGroup[] = [
	// Core blockchain operations
	commonActions,
	evmActions,
	svmActions,

	// Social platforms
	twitterActions,

	// Centralized exchanges
	okxActions,
	bitgetActions,
	binanceActions,
	gateActions,
	bybitActions,
	exchangesActions,

	// DeFi protocols
	odosActions,

	// Blockchain projects
	berachainActions,
	openseaActions,
	shapeActions,
	sophonActions,
	superchainActions,
	abstractActions,
	polymarketActions,
	meteoaActions,
	zksyncLiteActions,
	hemiActions,
	plasmaActions,
	townsActions,
	eclipseActions,

	// UI operations
	commonUiActions,

	// Tools and utilities
	checkersActions,
	adsPowerActions,
	visionActions,
	afinaActions,

	// Test actions (disabled by default)
	testActions,
	testPremiumActions,
];

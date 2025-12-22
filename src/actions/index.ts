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
import { cexDexActions } from './groups/free/cexDex.actions';
import { checkersActions } from './groups/free/checkers.actions';
import { testActions } from './groups/free/TEST.actions';
import { symbioticActions } from './groups/free/symbiotic.actions';

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
import { bridgesActions } from './groups/free/bridges.actions';

export const ACTIONS: ActionsGroup[] = [
	commonActions,
	evmActions,
	svmActions,
	twitterActions,
	cexDexActions,
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
	symbioticActions,
	commonUiActions,
	checkersActions,
	adsPowerActions,
	visionActions,
	afinaActions,
	testActions,
	testPremiumActions,
	bridgesActions,
];

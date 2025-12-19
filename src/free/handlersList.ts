import { ActionsGroupName } from '@src/actions';
import { BaseHandler } from '@src/utils/handler';
import { TestHandler } from './handlers/test';
import { CommonHandler } from './handlers/common';
import { EvmHandler } from './handlers/evm';
import { SvmHandler } from './handlers/svm';

import { CheckersHandler } from './handlers/checkers';

import { CexDexHandler } from './handlers/cexDex';
import { BridgesHandler } from './handlers/bridges';
import { SymbioticHandler } from './handlers/symbiotic';

export const FREE_HANDLERS = new Map<ActionsGroupName, BaseHandler>([
	[ActionsGroupName.TEST, new TestHandler(ActionsGroupName.TEST)],
	[ActionsGroupName.Common, new CommonHandler(ActionsGroupName.Common)],
	[ActionsGroupName.Evm, new EvmHandler(ActionsGroupName.Evm)],
	[ActionsGroupName.Svm, new SvmHandler(ActionsGroupName.Svm)],
	[ActionsGroupName.Checkers, new CheckersHandler(ActionsGroupName.Checkers)],
	[ActionsGroupName.CexDex, new CexDexHandler(ActionsGroupName.CexDex)],
	[ActionsGroupName.Bridges, new BridgesHandler(ActionsGroupName.Bridges)],
	[ActionsGroupName.Symbiotic, new SymbioticHandler(ActionsGroupName.Symbiotic)],
]);

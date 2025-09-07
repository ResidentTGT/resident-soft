import { ActionsGroupName } from '@src/actions';
import { BaseHandler } from '@src/utils/handler';
import { TestHandler } from './handlers/test';
import { CommonHandler } from './handlers/common';
import { EvmHandler } from './handlers/evm';
import { SvmHandler } from './handlers/svm';
import { OkxHandler } from './handlers/okx';
import { OdosHandler } from './handlers/odos';
import { BitgetHandler } from './handlers/bitget';
import { BinanceHandler } from './handlers/binance';
import { GateHandler } from './handlers/gate';
import { CheckersHandler } from './handlers/checkers';
import { BybitHandler } from './handlers/bybit';

export const FREE_HANDLERS = new Map<ActionsGroupName, BaseHandler>([
	[ActionsGroupName.TEST, new TestHandler(ActionsGroupName.TEST)],
	[ActionsGroupName.Common, new CommonHandler(ActionsGroupName.Common)],
	[ActionsGroupName.Evm, new EvmHandler(ActionsGroupName.Evm)],
	[ActionsGroupName.Svm, new SvmHandler(ActionsGroupName.Svm)],
	[ActionsGroupName.Odos, new OdosHandler(ActionsGroupName.Odos)],
	[ActionsGroupName.Okx, new OkxHandler(ActionsGroupName.Okx)],
	[ActionsGroupName.Bitget, new BitgetHandler(ActionsGroupName.Bitget)],
	[ActionsGroupName.Binance, new BinanceHandler(ActionsGroupName.Binance)],
	[ActionsGroupName.Gate, new GateHandler(ActionsGroupName.Gate)],
	[ActionsGroupName.Bybit, new BybitHandler(ActionsGroupName.Bybit)],
	[ActionsGroupName.Checkers, new CheckersHandler(ActionsGroupName.Checkers)],
]);

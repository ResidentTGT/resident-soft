import { ChainId } from '@src/utils/network';
import { Binance } from './binance';
import { Bitget } from './bitget/bitget';
import { Bybit } from './bybit/bybit';
import { Gate } from './gate';
import { Okx } from './okx';
import { SecretStorage } from '@src/utils/secretStorage.type';
import { MissingFieldError } from '@src/utils/errors';

const EXCHANGES_LIST = ['Bybit', 'Okx', 'Bitget', 'Binance', 'Gate'];

export async function withdraw(
	secretStorage: SecretStorage,
	exchanges: string[],
	to: string,
	tokenSymbol: string,
	toChainId: ChainId,
	amount: number,
): Promise<void> {
	if (!exchanges || !exchanges.length) throw new Error('Exchanges is required!');
	for (const exchange of exchanges)
		if (!EXCHANGES_LIST.includes(exchange))
			throw new Error(`Exchange "${exchange}" is not supported! Supported: ${EXCHANGES_LIST.join(', ')}`);

	const exchange = exchanges.shuffle()[0];
	switch (exchange) {
		case 'Bybit':
			if (!secretStorage.mainBybitAccount) throw new MissingFieldError('mainBybitAccount', false);
			await new Bybit(secretStorage.mainBybitAccount).withdraw(to, tokenSymbol, amount, toChainId);
			break;
		case 'Okx':
			if (!secretStorage.mainOkxAccount) throw new MissingFieldError('mainOkxAccount', false);
			await new Okx(secretStorage.mainOkxAccount).withdraw(to, tokenSymbol, false, amount, toChainId);
			break;
		case 'Bitget':
			if (!secretStorage.mainBitgetAccount) throw new MissingFieldError('mainBitgetAccount', false);
			await new Bitget(secretStorage.mainBitgetAccount).withdraw(to, tokenSymbol, false, amount, toChainId);
			break;
		case 'Binance':
			if (!secretStorage.mainBinanceAccount) throw new MissingFieldError('mainBinanceAccount', false);
			await new Binance(secretStorage.mainBinanceAccount).withdraw(tokenSymbol, to, toChainId, amount);
			break;
		case 'Gate':
			if (!secretStorage.mainGateAccount) throw new MissingFieldError('mainGateAccount', false);
			await new Gate(secretStorage.mainGateAccount).withdraw(to, tokenSymbol, toChainId, amount);
			break;
	}
}

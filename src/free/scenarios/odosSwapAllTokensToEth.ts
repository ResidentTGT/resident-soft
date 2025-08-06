import { ethers } from 'ethers';
import { Account } from '@utils/account';
import { Logger } from '@utils/logger';
import { Evm } from '@src/free/modules/evm';
import { Network } from '@utils/network';
import Random from '@utils/random';
import { delay } from '@utils/delay';
import { Odos } from '@freeModules/exchanges';
import { MissingFieldError } from '@src/utils/errors';

interface SwapResult {
	swappedTokens: string[];
	sentNative: boolean;
	error?: string;
}

const CONSTANTS = {
	MIN_DELAY_SEC: 10,
	MAX_DELAY_SEC: 30,
	FINAL_DELAY_MIN_SEC: 400,
	FINAL_DELAY_MAX_SEC: 1000,
	MIN_ETH_THRESHOLD: 0.00015,
	MIN_KEEP_ETH: 0.0001,
	MAX_KEEP_ETH: 0.00013,
} as const;

async function swapTokenToEth(account: Account, network: Network, token: string): Promise<boolean> {
	if (!account.wallets?.evm?.private) throw new MissingFieldError('wallets.evm.private');
	try {
		const wal = new ethers.Wallet(account.wallets.evm.private);

		const balance = await Evm.getBalance(network, wal.address, token);
		if (balance > BigInt(0)) {
			await Odos.swap(account.wallets.evm.private, network, token, 'ETH');
			await delay(Random.int(CONSTANTS.MIN_DELAY_SEC, CONSTANTS.MAX_DELAY_SEC));
			return true;
		}
		return false;
	} catch (error) {
		await Logger.getInstance().log(`Failed to swap ${token}: ${error instanceof Error ? error.message : String(error)}`);
		return false;
	}
}

async function sendNativeToExchange(account: Account, network: Network): Promise<boolean> {
	if (!account.wallets?.evm?.private) throw new Error('There is no account.wallets.evm.private in wallet!');
	try {
		const address = account.wallets?.evm?.address;
		if (!address) {
			throw new Error('EVM wallet address not found');
		}

		const ethBalance = +ethers.formatEther(await Evm.getBalance(network, address, 'ETH'));
		if (ethBalance > CONSTANTS.MIN_ETH_THRESHOLD && account.cexs?.bitget?.evmDepositAddress) {
			const keepAmount = Random.float(CONSTANTS.MIN_KEEP_ETH, CONSTANTS.MAX_KEEP_ETH);
			const sendAmount = (ethBalance - keepAmount).toFixed(10);

			await Evm.sendNative(account.wallets.evm.private, network, account.cexs.bitget.evmDepositAddress, sendAmount);
			return true;
		}
		return false;
	} catch (error) {
		await Logger.getInstance().log(`Failed to send native token: ${error instanceof Error ? error.message : String(error)}`);
		return false;
	}
}

export async function odosSwapAllTokensToEth(
	account: Account,
	network: Network,
	sendNativeToBitget: boolean,
	tokens?: string[],
): Promise<SwapResult> {
	const result: SwapResult = {
		swappedTokens: [],
		sentNative: false,
	};

	try {
		const tokensToSwap = tokens ?? network.tokens.filter((t) => t.symbol !== network.nativeCoin).map((a) => a.symbol);

		// Perform token swaps
		for (const token of tokensToSwap) {
			const swapped = await swapTokenToEth(account, network, token);
			if (swapped) {
				result.swappedTokens.push(token);
			}
		}

		// Handle native token transfer if requested
		if (sendNativeToBitget) {
			result.sentNative = await sendNativeToExchange(account, network);
		}

		// Apply final delay if any operations were performed
		if (result.swappedTokens.length > 0 || result.sentNative) {
			const finalDelay = Random.int(CONSTANTS.FINAL_DELAY_MIN_SEC, CONSTANTS.FINAL_DELAY_MAX_SEC);
			await Logger.getInstance().log(`Waiting ${finalDelay} s. ...`);
			await delay(finalDelay);
		}

		return result;
	} catch (error) {
		result.error = error instanceof Error ? error.message : String(error);
		return result;
	}
}

import { TransactionResponse, ethers } from 'ethers';
import { Logger, MessageType } from '@utils/logger';
import { Evm } from '@src/free/modules/evm';
import { ChainId, Network } from '@utils/network';
import Random from '@utils/random';
import { delay } from '@utils/delay';
import bs58 from 'bs58';
import { getStandardState } from '@utils/state';

const CONTRACT_ADDRESS = '0x391E7C679d29bD940d63be94AD22A25d25b5A604';

//https://dev.gas.zip/gas/chain-support/outbound
const OUTBOUND_CHAIN_IDS = new Map<ChainId, number>([
	[ChainId.Aptos, 348],
	[ChainId.Arbitrum, 57],
	[ChainId.AvalancheC, 15],
	[ChainId.Base, 54],
	[ChainId.Blast, 96],
	[ChainId.Bsc, 14],
	[ChainId.Ethereum, 255],
	[ChainId.Sonic, 389],
	[ChainId.Linea, 59],
	[ChainId.Optimism, 55],
	[ChainId.Polygon, 17],
	[ChainId.Solana, 245],
	[ChainId.Eclipse, 328],
	[ChainId.Sui, 347],
	[ChainId.ZksyncEra, 51],
	[ChainId.Zora, 56],
	[ChainId.Scroll, 41],
	[ChainId.Berachain, 143],
	[ChainId.Unichain, 362],
	[ChainId.Shape, 327],
	[ChainId.Lisk, 238],
	[ChainId.Unichain, 362],
	[ChainId.Mode, 73],
	[ChainId.Ink, 392],
	[ChainId.World, 269],
	[ChainId.Soneium, 414],
]);

export class GasZip {
	static async refuel(
		privateKey: string,
		network: Network,
		toChainIds: ChainId[],
		to: string,
		value: string,
	): Promise<TransactionResponse> {
		try {
			await Logger.getInstance().log(`Start refuel ${network.nativeCoin} from ${network.name} to ${toChainIds} to ${to}`);

			const gasZipChainIds = toChainIds.map((c) => {
				const chain = OUTBOUND_CHAIN_IDS.get(c);
				if (!chain) throw new Error(`Couldnt find chain for ${c}!`);
				return chain;
			});

			const data = encodeTransactionInput(to, gasZipChainIds);

			const provider = network.getProvider();

			const transaction = await Evm.generateTransactionRequest(
				provider,
				privateKey,
				CONTRACT_ADDRESS,
				ethers.parseEther(value),
				data,
			);

			const resp = await Evm.makeTransaction(provider, privateKey, transaction);

			return resp;
		} catch (e: any) {
			const errorMsg = e.response?.data?.message;
			throw new Error(`Refuel ${value} ${network.nativeCoin} to ${to} failed.\n${errorMsg ?? e}`);
		}
	}

	static async refuelManyWalletsFromOneWallet(
		fromPrivateKey: string,
		network: Network,
		toChainIds: ChainId[],
		toAddrs: string[],
		amount: number[], // [1,2]
		delayBetweenAccs: number[], //[1,2]
	): Promise<any> {
		const stateName = `refuelManyWalletsFromOneWallet/${new Date().toISOString().split('.')[0].replaceAll(':', '-')}`;
		for (let i = 0; i < toAddrs.length; i++) {
			try {
				await Logger.getInstance().log(`Starting ${i + 1} of ${toAddrs.length} ...`);
				await GasZip.refuel(
					fromPrivateKey,
					network,
					toChainIds,
					toAddrs[i],
					Random.float(amount[0], amount[1]).toFixed(6),
				);

				const STATE = getStandardState(stateName);
				STATE.successes.push(toAddrs[i]);
				STATE.fails = STATE.fails.filter((f: string) => f !== toAddrs[i]);
				STATE.save();

				if (delayBetweenAccs[1] && i !== toAddrs.length - 1) {
					const waiting = Random.int(delayBetweenAccs[0], delayBetweenAccs[1]);
					await Logger.getInstance().log(`Waiting ${waiting} s. ...`);
					await delay(waiting);
				}
			} catch (e) {
				await Logger.getInstance().log(`Error: ${e}`, MessageType.Error);
				const STATE = getStandardState(stateName);
				if (!STATE.fails.includes(toAddrs[i])) {
					STATE.fails.push(toAddrs[i]);
					STATE.save();
				}
				await delay(5);
			}
		}
	}
}
function isEVMAddress(address: string): boolean {
	return address.length === 42;
}

function isSolanaAddress(address: string): boolean {
	return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

// Helper functions for address encoding
function encodeEVMAddress(address: string): string {
	return '02' + address.slice(2);
}

function encodeSolanaAddress(address: string): string {
	const decoded = bs58.decode(address);
	return '03' + Buffer.from(decoded).toString('hex');
}

function encodeChainIds(shorts: number[]): string {
	return shorts.reduce((acc, short) => acc + short.toString(16).padStart(4, '0'), '');
}

const encodeTransactionInput = (to: string, shorts: number[]): string => {
	let data = '0x';

	if (isEVMAddress(to)) data += encodeEVMAddress(to);
	else if (isSolanaAddress(to)) {
		data += encodeSolanaAddress(to);
	} else {
		throw new Error(`Invalid address: ${to}`);
	}

	return data + encodeChainIds(shorts);
};

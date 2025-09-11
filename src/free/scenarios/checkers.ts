import { Account } from '@utils/account';
import { Logger, MessageType } from '@utils/logger';
import { ChainId, Network, Token } from '@utils/network';
import { delay } from '@utils/delay';
import { ethers } from 'ethers';
import { State, StateStorage } from '@utils/state';
import { Workbook } from 'exceljs';
import { MissingFieldError } from '@src/utils/errors';
import { Evm } from '../modules/evm';

export async function checkLinea(accounts: Account[]) {
	const logger = Logger.getInstance();
	const network = await Network.getNetworkByChainId(ChainId.Linea);

	const contractAddr = '0x87bAa1694381aE3eCaE2660d97fe60404080Eb64';
	const contract = new ethers.Contract(
		contractAddr,
		[
			{
				inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
				name: 'calculateAllocation',
				outputs: [{ internalType: 'uint256', name: 'tokenAllocation', type: 'uint256' }],
				stateMutability: 'view',
				type: 'function',
			},
		],
		network.getProvider(),
	);

	const state = StateStorage.load<{ airdrop: { account: string; address: string; tokens: number }[] }>('LineaAirdrop', {
		defaultState: { airdrop: [] },
		readable: true,
		fileExt: '.json',
	});

	let sum = 0;

	for (const account of accounts) {
		if (!account.name) throw new MissingFieldError(`account.name`);
		if (!account.wallets?.evm?.address) throw new MissingFieldError('wallets.evm.address');

		while (true) {
			try {
				const airdropBn = await contract.calculateAllocation(account.wallets.evm.address);
				const airdrop = +(+ethers.formatEther(airdropBn)).toFixed();

				sum += airdrop;
				await logger.log(`${account.name}: ${account.wallets.evm.address} - ${airdrop}`);
				state.airdrop.push({
					account: account.name,
					address: account.wallets.evm.address,
					tokens: airdrop,
				});
				state.save();
				break;
			} catch (e) {
				await Logger.getInstance().log(`Error: ${e}. Trying again...`, MessageType.Warn);
				await delay(5);
			}
		}
	}

	await saveToExcel(state, 'LineaAirdrop');

	await logger.log(`Total: ${sum}` + `\nData saved to states/LineaAirdrop.json`, MessageType.Notice);
}

export async function claimLinea(account: Account, network: Network) {
	if (!account.wallets?.evm?.private) throw new Error('There is no account.wallets.evm.private!');
	const wal = new ethers.Wallet(account.wallets.evm.private);
	const logger = Logger.getInstance();

	const contractAddr = '0x87bAa1694381aE3eCaE2660d97fe60404080Eb64';
	//await Evm.waitBalance(contractAddr, network.chainId, 'LINEA', 10000000);
	const contract = new ethers.Contract(
		contractAddr,
		[
			{
				inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
				name: 'calculateAllocation',
				outputs: [{ internalType: 'uint256', name: 'tokenAllocation', type: 'uint256' }],
				stateMutability: 'view',
				type: 'function',
			},
			{ inputs: [], name: 'claim', outputs: [], stateMutability: 'nonpayable', type: 'function' },
			{
				inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
				name: 'hasClaimed',
				outputs: [{ internalType: 'bool', name: 'claimed', type: 'bool' }],
				stateMutability: 'view',
				type: 'function',
			},
		],
		network.getProvider(),
	);

	const allocationBn = await contract.calculateAllocation(wal.address);
	const allocation = +ethers.formatEther(allocationBn);

	if (allocation > 0) {
		const claimed = await contract.hasClaimed(wal.address);
		if (claimed) {
			await logger.log(`${allocation} LINEA already claimed`);
		} else {
			await logger.log(`Claiming ${allocation} LINEA...`);
			const tr = await Evm.generateTransactionRequest(
				network.getProvider(),
				account.wallets.evm.private,
				contractAddr,
				BigInt(0),
				'0x4e71d92d',
			);

			await Evm.makeTransaction(network.getProvider(), account.wallets.evm.private, tr);
			await Evm.waitBalance(wal.address, network.chainId, 'LINEA', allocation);
		}

		const bal = await Evm.getBalance(network, wal.address, 'LINEA');
		await logger.log(`Balance on wallet: ${ethers.formatEther(bal)} LINEA`);
		if (bal > BigInt(0)) {
			if (!account.cexs?.bitget?.evmDepositAddress) throw new Error('There is no account.cexs.bitget.evmDepositAddress!');

			await Evm.sendToken(account.wallets.evm.private, network, account.cexs?.bitget?.evmDepositAddress, 'LINEA');
		}
	} else {
		await logger.log(`No LINEA allocation`);
	}
}

async function saveToExcel(state: State<{ airdrop: { account: string; address: string; tokens: number }[] }>, stateName: string) {
	const workbook = new Workbook();
	const worksheet = workbook.addWorksheet('Aidrop');
	worksheet.columns = [
		{ header: 'Account', key: 'account', width: 18 },
		{ header: 'Wallet', key: 'address', width: 30 },
		{ header: 'LINEA', key: 'tokens', width: 15 },
	];

	state.airdrop.forEach((p: any) => {
		worksheet.addRow(p);
	});
	const sumRaw = worksheet.addRow({
		account: 'SUM',
		tokens: state.airdrop.reduce((a, b) => a + b.tokens, 0),
	});

	worksheet.eachRow((row) => {
		row.font = { name: 'Calibri', size: 11 };
	});
	sumRaw.font.color = { argb: 'FF800080' };
	worksheet.getRow(1).font.bold = true;

	const path = `states/${stateName}.xlsx`;
	await workbook.xlsx.writeFile(path);
}

export interface TokenBalance {
	token: Token;
	balance: string;
	balanceInUsd: string;
}

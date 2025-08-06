import { Account } from '@utils/account';
import { Logger, MessageType } from '@utils/logger';
import { ethers } from 'ethers';
import { ERC721_ABI } from '@utils/abi/erc721abi';
import Excel from 'exceljs';
import { ChainId, Network } from '@src/utils/network';
import { delay } from '@src/utils/delay';

export async function checkNft(accounts: Account[], chainId: ChainId, nftContract: string) {
	const objBals: { count: number; name: string; address: string }[] = [];
	const logger = await Logger.getInstance();
	for (const account of accounts) {
		while (true) {
			try {
				const provider = Network.getNetworkByChainId(chainId).getProvider();
				const contract = new ethers.Contract(nftContract, ERC721_ABI, provider);
				if (!account.wallets?.evm?.address) throw new Error('There is no account.wallets.evm.address!');
				const balance = await contract.balanceOf(account.wallets?.evm?.address);
				objBals.push({ count: +balance.toString(), name: account.name ?? '', address: account.wallets.evm.address });
				await logger.log(`${account.name} Amount: ${balance}`);
				break;
			} catch (e) {
				await Logger.getInstance().log(`Error: ${e}. Trying again...`, MessageType.Warn);
				await delay(5);
			}
		}
	}

	const workbook = new Excel.Workbook();
	const worksheet = workbook.addWorksheet('Nft');
	worksheet.columns = [
		{ header: 'Name', key: 'name', width: 15 },
		{ header: 'Wallet', key: 'address', width: 15 },
		{ header: 'Count', key: 'count', width: 15 },
	];

	objBals.forEach((p) => worksheet.addRow(p));

	worksheet.getRow(1).font = { bold: true };

	const path = `states/nft.xlsx`;
	await workbook.xlsx.writeFile(path);
}

import { Account } from '@utils/account';
import { Logger, MessageType } from '@utils/logger';
import { Evm } from '@src/free/modules/evm';
import { ChainId, Network } from '@utils/network';
import Random from '@utils/random';

enum EvmTransaction {
	SelfSend = 1,
	Approve = 2,
	Wrap = 3,
	BungeeRefuel = 4,
}

const EVM_TRANSACTIONS = [EvmTransaction.SelfSend, EvmTransaction.Approve, EvmTransaction.Wrap, EvmTransaction.BungeeRefuel];

export async function makeAnyEvmTransaction(account: Account, network: Network) {
	if (!account.wallets?.evm?.private) throw new Error(`There is no account.wallets.evm.private in wallet!`);
	if (!account.wallets?.evm?.address) throw new Error();

	const action = EVM_TRANSACTIONS[Random.int(1, 4) - 1];

	const contractForApprove = getContractAddressForApprove(network.chainId);

	await Logger.getInstance().log(`Starting ${EvmTransaction[action]} ...`);
	try {
		switch (action) {
			case EvmTransaction.SelfSend:
				await Evm.sendNative(
					account.wallets.evm.private,
					network,
					account.wallets?.evm?.address,
					Random.float(0.00001, 0.00003).toFixed(8),
				);
				break;
			case EvmTransaction.Approve:
				await Evm.approve(
					network,
					account.wallets.evm.private,
					contractForApprove,
					Random.choose(['USDC', 'USDT', 'DAI', 'WETH']),
					Random.float(0.0001, 0.0008).toFixed(6),
				);
				break;
			case EvmTransaction.Wrap:
				await Evm.wrap(network, account.wallets.evm.private, Random.float(0.00001, 0.00003).toFixed(8));
				break;
		}
		await Logger.getInstance().log(`${EvmTransaction[action]} finished.`);
	} catch (e) {
		await Logger.getInstance().log(`Error during ${EvmTransaction[action]}\nError: ${e}`, MessageType.Error);
		throw e;
	}
}

function getContractAddressForApprove(chainId: ChainId) {
	let contractForApprove = '';

	switch (chainId) {
		case ChainId.Ethereum:
			contractForApprove = '0x1111111254EEB25477B68fb85Ed929f73A960582'; //1inch v5: Aggregation Router
			break;
		case ChainId.Arbitrum:
			contractForApprove = '0xa669e7A0d4b3e4Fa48af2dE86BD4CD7126Be4e13'; //OdosRouterV2
			break;
		case ChainId.Optimism:
			contractForApprove = '0xca423977156bb05b13a2ba3b76bc5419e2fe9680'; //OdosRouterV2
			break;
		case ChainId.Polygon:
			contractForApprove = '0x4e3288c9ca110bcc82bf38f09a7b425c095d92bf'; //OdosRouterV2
			break;
		case ChainId.Bsc:
			contractForApprove = '0x89b8aa89fdd0507a99d334cbe3c808fafc7d850e'; //OdosRouterV2
			break;
		default:
			throw new Error(`There is no contract address for network ${chainId}!`);
	}

	return contractForApprove;
}

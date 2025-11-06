import { ChainId, Network } from '@utils/network';
import { Account } from '@utils/account';

const EXPLORER_URLS = new Map<ChainId, string>()
	.set(ChainId.Ethereum, `https://etherscan.io/`)
	.set(ChainId.Arbitrum, `https://arbiscan.io/`)
	.set(ChainId.Optimism, `https://optimistic.etherscan.io/`)
	.set(ChainId.Bsc, `https://bscscan.com/`)
	.set(ChainId.Linea, `https://lineascan.build/`)
	.set(ChainId.ZksyncEra, `https://era.zksync.network/`)
	.set(ChainId.Starknet, `https://starkscan.co/`)
	.set(ChainId.Base, `https://basescan.org/`)
	.set(ChainId.Aptos, `https://explorer.aptoslabs.com/`)
	.set(ChainId.Zora, `https://explorer.zora.energy/`)
	.set(ChainId.Celo, `https://celoscan.io/`)
	.set(ChainId.Scroll, `https://scrollscan.com/`)
	.set(ChainId.Harmony, `https://explorer.harmony.one/`)
	.set(ChainId.Moonbeam, `https://moonscan.io/`)
	.set(ChainId.ArbitrumNova, `https://nova.arbiscan.io/`)
	.set(ChainId.Gnosis, `https://gnosisscan.io/`)
	.set(ChainId.Fuse, `https://explorer.fuse.io/`)
	.set(ChainId.MantaPacific, `https://pacific-explorer.manta.network/`)
	.set(ChainId.Core, `https://scan.coredao.org/`)
	.set(ChainId.Polygon, `https://polygonscan.com/`)
	.set(ChainId.AvalancheC, `https://snowtrace.io/`)
	.set(ChainId.Blast, `https://blastscan.io/`)
	.set(ChainId.EthereumSepolia, `https://sepolia.etherscan.io/`)
	.set(ChainId.HemiSepolia, `https://testnet.explorer.hemi.xyz/`)
	.set(ChainId.Hemi, `https://explorer.hemi.xyz/`)
	.set(ChainId.FhenixHelium, `https://explorer.helium.fhenix.zone/`)
	.set(ChainId.Solana, `https://solscan.io/`)
	.set(ChainId.Eclipse, `https://eclipsescan.xyz/`)
	.set(ChainId.Soneium, 'https://soneium.blockscout.com/')
	.set(ChainId.Berachain, 'https://berascan.com/')
	.set(ChainId.Sonic, 'https://sonicscan.org/')
	.set(ChainId.Ronin, 'https://app.roninchain.com/')
	.set(ChainId.Flow, 'https://evm.flowscan.io/')
	.set(ChainId.Shape, 'https://shapescan.xyz/')
	.set(ChainId.Abstract, 'https://abscan.org/')
	.set(ChainId.Sophon, 'https://explorer.sophon.xyz/')
	.set(ChainId.Lisk, 'https://blockscout.lisk.com/')
	.set(ChainId.Ink, 'https://explorer.inkonchain.com/')
	.set(ChainId.World, 'https://worldchain-mainnet.explorer.alchemy.com/')
	.set(ChainId.Mode, 'https://explorer.mode.network/')
	.set(ChainId.Unichain, 'https://unichain.blockscout.com/');

export function getExplorerUrl(chainId: ChainId, account?: Account, transactionHash?: string): string {
	let url = ``;
	const baseUrl = EXPLORER_URLS.get(chainId);
	if (!baseUrl) url = `There is no explorer for ${chainId}!`;
	else {
		if (Network.isEvm(chainId))
			url = `${baseUrl}${transactionHash ? 'tx/' + transactionHash : 'address/' + account?.wallets?.evm?.address}`;
		else if (chainId === ChainId.Starknet)
			url = `${baseUrl}${transactionHash ? 'tx/' + transactionHash : 'contract/' + account?.wallets?.starknet?.address}`;
		else if (chainId === ChainId.Aptos)
			url = `${baseUrl}${
				transactionHash ? 'txn/' + transactionHash : 'account/' + account?.wallets?.aptos?.address
			}?network=mainnet`;
		else if (Network.isSvm(chainId))
			url = `${baseUrl}${transactionHash ? 'tx/' + transactionHash : 'account/' + account?.wallets?.solana?.address}`;
	}

	return url;
}

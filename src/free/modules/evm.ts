import { Logger, MessageType } from '@utils/logger';
import { ethers } from 'ethers';
import { ERC20_ABI, ERC721_ABI, WRAP_ABI } from '@utils/abi';
import { delay } from '@utils/delay';
import { getExplorerUrl } from '@utils/getExplorerUrl';
import { ChainId, Network, Token } from '@utils/network';

export class Evm {
	static Type0Networks = [ChainId.Bsc, ChainId.Scroll, ChainId.ArbitrumNova, ChainId.Harmony, ChainId.Fuse, ChainId.Core];

	static async approve(network: Network, privateKey: string, spender: string, tokenSymbol: string, amount: string) {
		const token = network.tokens.find((t) => t.symbol === tokenSymbol);
		if (!token) throw new Error(`There is no ${tokenSymbol} in tokens list in ${network.name}`);

		if (tokenSymbol === network.nativeCoin) {
			await Logger.getInstance().log(`There is no need to approve native coin ${tokenSymbol}`);
		} else {
			try {
				const provider = network.getProvider();
				const decimals = await this.getDecimals(network, token);

				const amountBn = ethers.parseUnits(amount, decimals);

				const tokenContract = new ethers.Interface(ERC20_ABI);
				const ethersWallet = new ethers.Wallet(privateKey);
				const allowance = await this.getAllowance(provider, ethersWallet.address, spender, token.address);

				if (allowance < amountBn) {
					await Logger.getInstance().log(`Start approving ${amount} ${tokenSymbol} for ${spender} ...`);

					const data = tokenContract.encodeFunctionData('approve', [spender, amountBn]);

					const transaction = await Evm.generateTransactionRequest(
						provider,
						privateKey,
						token.address,
						BigInt(0),
						data,
					);

					await this.makeTransaction(provider, privateKey, transaction);

					await Logger.getInstance().log(`Approved ${amount} ${tokenSymbol} for ${spender}`);
				} else {
					await Logger.getInstance().log(
						`Allowance (${ethers.formatUnits(
							allowance,
							decimals,
						)} ${tokenSymbol}) is more or equal than amount (${amount} ${tokenSymbol})`,
					);
				}
			} catch (e: any) {
				if (e.toString().includes('too many decimals for format'))
					throw new Error(`Wrong amount (${amount}) for approve. Too many decimals.\n${e}`);

				throw e;
			}
		}
	}

	static async approveErc21Nft(privateKey: string, network: Network, nftContract: string, spender: string, tokenId: string) {
		await Logger.getInstance().log(`Start approving  NFT (${nftContract}) with Id ${tokenId} for ${spender} ...`);
		const provider = network.getProvider();

		const tokenContract = new ethers.Contract(nftContract, ERC721_ABI, network.getProvider());

		const data = tokenContract.interface.encodeFunctionData('approve', [spender, tokenId]);

		const transaction = await Evm.generateTransactionRequest(provider, privateKey, nftContract, BigInt(0), data);

		await this.makeTransaction(provider, privateKey, transaction);

		await Logger.getInstance().log(`Approved.`);
	}

	static async setApprovalForAllErc21Nft(
		privateKey: string,
		network: Network,
		nftContract: string,
		operator: string,
		approved: boolean,
	) {
		const provider = network.getProvider();
		const wallet = new ethers.Wallet(privateKey);
		const tokenContract = new ethers.Contract(nftContract, ERC721_ABI, network.getProvider());
		const isApprovedForAll = await tokenContract.isApprovedForAll(wallet.address, operator);
		if (!isApprovedForAll) {
			await Logger.getInstance().log(`Start approving  NFT (${nftContract}) for ${operator} ...`);
			const data = tokenContract.interface.encodeFunctionData('setApprovalForAll', [operator, approved]);

			const transaction = await Evm.generateTransactionRequest(provider, privateKey, nftContract, BigInt(0), data);

			await this.makeTransaction(provider, privateKey, transaction);

			await Logger.getInstance().log(`Approved.`);
		}
	}

	static async getTokenIds(address: string, network: Network, nftContract: string): Promise<number[]> {
		const contract = new ethers.Contract(nftContract, ERC721_ABI, network.getProvider());
		const totalSupply = +(await contract.totalSupply()).toString();
		const sizeOfIteration = 20000;
		const iterations = Math.ceil(totalSupply / sizeOfIteration);
		const tokenIdsArray: bigint[] = [];

		for (let i = 0; i < iterations; i++) {
			while (true) {
				const start = sizeOfIteration * i;
				const finish = i === iterations - 1 ? totalSupply : sizeOfIteration * (i + 1) - 1;
				try {
					const tokensIds = await contract.tokensOfOwnerIn(address, BigInt(start), BigInt(finish));

					tokenIdsArray.push(...tokensIds);
					break;
				} catch (e) {
					await Logger.getInstance().log(`Couldnt get tokensIds from ${start} to ${finish}. ${e}`, MessageType.Warn);
					await delay(1);
				}
			}
		}

		return (tokenIdsArray as bigint[]).map((id) => +id.toString());
	}

	static async getOwnedTokensInterval(
		address: string,
		network: Network,
		nftContract: string,
		firstIteration = 0,
	): Promise<number[]> {
		const contract = new ethers.Contract(nftContract, ERC721_ABI, network.getProvider());
		const totalSupply = +(await contract.totalSupply()).toString();
		const sizeOfIteration = 10000;
		const iterations = Math.ceil(totalSupply / sizeOfIteration);
		const tokenIdsArray: bigint[] = [];

		for (let i = firstIteration; i < iterations; i++) {
			while (true) {
				const start = sizeOfIteration * i;
				const finish = i === iterations - 1 ? totalSupply : sizeOfIteration * (i + 1) - 1;
				try {
					const tokensIds = (await contract.getOwnedTokensInterval(address, BigInt(start), BigInt(finish))).filter(
						(id: bigint) => id !== BigInt(0),
					);

					tokenIdsArray.push(...tokensIds);
					break;
				} catch (e) {
					await Logger.getInstance().log(`Couldnt get tokensIds from ${start} to ${finish}. ${e}`, MessageType.Warn);
					await delay(1);
				}
			}
		}

		return (tokenIdsArray as bigint[]).map((id) => +id.toString());
	}

	static async getAllowance(provider: ethers.Provider, owner: string, spender: string, tokenContract: string) {
		const contract = new ethers.Contract(tokenContract, ERC20_ABI, provider);
		const allowance = await contract.allowance(owner, spender);

		return allowance;
	}

	static async getDecimals(network: Network, token: Token): Promise<number> {
		let decimals = 18;

		if (token.symbol !== network.nativeCoin) {
			const contract = new ethers.Contract(token.address, ERC20_ABI, network.getProvider());
			decimals = Number(await contract.decimals());
		}

		if (!decimals) {
			throw new Error();
		}

		return decimals;
	}

	static async calculateOptimismTransactionFee(
		provider: ethers.Provider,
		wallet: ethers.Wallet,
		transaction: ethers.TransactionRequest,
	): Promise<bigint> {
		const l2ExecutionFee = BigInt(transaction.gasPrice ?? 0) * BigInt(transaction.gasLimit ?? 0);

		const contract = new ethers.Contract(
			'0x420000000000000000000000000000000000000F',
			[
				{
					inputs: [{ internalType: 'bytes', name: '_data', type: 'bytes' }],
					name: 'getL1Fee',
					outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
					stateMutability: 'view',
					type: 'function',
				},
			],
			provider,
		);

		const sign = await wallet.signTransaction(transaction);

		const l1Fee = await contract.getL1Fee(sign);

		return l1Fee + l2ExecutionFee;
	}

	static async sendNative(privateKey: string, network: Network, to: string, amount?: string) {
		const ethersWallet = new ethers.Wallet(privateKey, network.getProvider());
		await Logger.getInstance().log(
			`Start sending ${amount ?? 'all'} ${network.nativeCoin} from ${ethersWallet.address} to ${to} ...`,
		);

		const ethBalance = await network.getProvider().getBalance(ethersWallet.address);

		const transaction = await Evm.generateTransactionRequest(network.getProvider(), privateKey, to, BigInt(0));

		if (!transaction.gasLimit) throw new Error('There is no transaction.gasLimit!');
		if (network.chainId !== ChainId.Optimism && !this.Type0Networks.includes(network.chainId)) {
			if (!transaction.maxFeePerGas) throw new Error('There is no transaction.maxFeePerGas!');
		}

		let transactionFee;
		if (network.chainId === ChainId.Optimism)
			transactionFee = await Evm.calculateOptimismTransactionFee(network.getProvider(), ethersWallet, transaction);
		else if (this.Type0Networks.includes(network.chainId))
			transactionFee = BigInt(transaction.gasLimit) * BigInt(transaction.gasPrice ?? 0) + ethers.parseEther('0.000001');
		else {
			transactionFee =
				BigInt(transaction.gasLimit) *
				(BigInt(transaction.maxFeePerGas ?? 0) + BigInt(transaction.maxPriorityFeePerGas ?? 0));
		}

		if (ethBalance < transactionFee) {
			throw new Error(`There is not enough gas (fee: ${ethers.formatUnits(transactionFee, 18)} ETH) for transaction`);
		}

		let amountBigNumber = undefined;

		if (amount) {
			amountBigNumber = ethers.parseEther(amount);
			if (ethBalance - amountBigNumber - transactionFee < 0) {
				throw new Error(
					`There is not enough balance (balance: ${ethers.formatUnits(
						ethBalance,
						18,
					)} ETH) for transaction such amount (${ethers.formatUnits(amountBigNumber, 18)} ETH)`,
				);
			}
		} else {
			amountBigNumber = ethBalance - transactionFee;
		}

		transaction.value = amountBigNumber;

		await this.makeTransaction(network.getProvider(), privateKey, transaction);

		await Logger.getInstance().log(
			`${ethers.formatEther(amountBigNumber)} ${network.nativeCoin} sent from ${ethersWallet.address} to ${to} .`,
		);
	}

	static async sendToken(privateKey: string, network: Network, to: string, tokenName: string, amount?: string) {
		await Logger.getInstance().log(`Start sending ${amount ?? 'all'} ${tokenName} to ${to} ...`);

		const token = network.tokens.find((t) => t.symbol === tokenName);
		if (!token) {
			throw new Error(`There is no token ${tokenName} in tokens list of network ${network.name}`);
		}

		const wallet = new ethers.Wallet(privateKey, network.getProvider());

		const tokenContract = new ethers.Contract(token.address, ERC20_ABI, network.getProvider());
		const currentTokenBalance = BigInt(await tokenContract.balanceOf(wallet.address));
		const decimals = await this.getDecimals(network, token);

		let amountBigNumber;
		if (amount) {
			amountBigNumber = ethers.parseUnits(amount, decimals);

			if (currentTokenBalance < amountBigNumber) {
				throw new Error(
					`Current balance of token ${tokenName} (${ethers.formatUnits(
						currentTokenBalance,
						decimals,
					)}) is less than you want to send (${ethers.formatUnits(amountBigNumber, decimals)}).`,
				);
			}
		} else {
			amountBigNumber = currentTokenBalance;

			if (currentTokenBalance <= 0) {
				throw new Error(`Amount of token ${tokenName} is 0`);
			}
		}

		const contractInterface = new ethers.Interface(ERC20_ABI);
		const data = await contractInterface.encodeFunctionData('transfer', [to, amountBigNumber]);

		const transaction = await Evm.generateTransactionRequest(
			network.getProvider(),
			privateKey,
			token.address,
			BigInt(0),
			data,
		);

		const transactionFee =
			network.chainId === ChainId.Optimism
				? await this.calculateOptimismTransactionFee(network.getProvider(), wallet, transaction)
				: BigInt(transaction.gasLimit ?? 0) * BigInt(transaction.maxFeePerGas ?? 0);

		const ethBalance = await network.getProvider().getBalance(wallet.address);

		if (ethBalance < transactionFee) {
			throw new Error(`There is not enough gas (fee: ${ethers.formatUnits(transactionFee, 18)} ETH) for transaction`);
		}

		await this.makeTransaction(network.getProvider(), privateKey, transaction);

		await Logger.getInstance().log(`${ethers.formatUnits(amountBigNumber, decimals)} ${tokenName} sent to ${to} .`);
	}

	static async makeTransaction(
		provider: ethers.Provider,
		privateKey: string,
		transaction: ethers.TransactionRequest,
	): Promise<ethers.TransactionResponse> {
		const wallet = new ethers.Wallet(privateKey, provider);

		await Logger.getInstance().log(
			`Transaction params:
		  nonce: ${transaction.nonce}
		  gas price: ${ethers.formatUnits(transaction.maxFeePerGas ?? transaction.gasPrice ?? 0, 'gwei')} gwei
		  gas limit: ${transaction.gasLimit?.toString()}
		  from: ${wallet.address}
		  to: ${transaction.to},
		  value: ${transaction.value ? ethers.formatEther(transaction.value) : 0}`,
		);

		const transactionResponse = await wallet.sendTransaction(transaction);
		const transactionReceipt = await provider.waitForTransaction(transactionResponse.hash, 1, 300_000);
		//const transactionReceipt = await transactionResponse.wait();

		if (transactionReceipt) {
			const fee = ethers.formatEther(transactionReceipt.fee);
			const explorerUrl = getExplorerUrl(
				(await provider.getNetwork()).chainId.toString() as ChainId,
				undefined,
				transactionReceipt?.hash,
			);
			if (transactionReceipt.status === 1) {
				await Logger.getInstance().log(`Transaction succeed. Fee: ${fee}.  Hash: ${explorerUrl}`);
			} else {
				throw new Error(`Transaction was reverted. Fee: ${fee}. Hash: ${explorerUrl}`);
			}
		} else {
			throw new Error(`Something went wrong during sending transaction. ${transactionResponse}`);
		}

		return transactionResponse;
	}

	static async generateTransactionRequest(
		provider: ethers.Provider,
		privateKey: string,
		toAddress: string,
		value: bigint,
		data?: string,
		gasLimit?: number,
	): Promise<ethers.TransactionRequest> {
		const network = (await provider.getNetwork()).chainId;
		const wallet = new ethers.Wallet(privateKey, provider);
		const nonce = await provider.getTransactionCount(wallet.address);

		const transactionRequest: ethers.TransactionRequest = {
			to: toAddress,
			from: wallet.address,
			nonce: nonce,
			value,
			chainId: network,
		};

		if (data) {
			transactionRequest.data = data;
		}

		const _gasLimit = gasLimit ?? (await wallet.estimateGas(transactionRequest));

		transactionRequest.gasLimit = _gasLimit;

		const feeData = await provider.getFeeData();

		if (this.Type0Networks.map((n) => BigInt(n)).includes(network)) {
			transactionRequest.type = 0;
			transactionRequest.gasPrice = feeData.gasPrice;
		} else {
			transactionRequest.type = 2;
			transactionRequest.maxFeePerGas = feeData.maxFeePerGas;
			transactionRequest.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
			if (feeData.maxFeePerGas) {
				if (network === BigInt(ChainId.Ethereum) && feeData.gasPrice) {
					transactionRequest.maxFeePerGas = ethers.parseEther(
						(+ethers.formatEther(feeData.maxFeePerGas) * 1.1).toFixed(18),
					);
					if (feeData.maxPriorityFeePerGas)
						transactionRequest.maxPriorityFeePerGas = ethers.parseEther(
							(+ethers.formatEther(feeData.maxPriorityFeePerGas) * 1.1).toFixed(18),
						);
				}
				if (network === BigInt(ChainId.Polygon)) {
					transactionRequest.maxFeePerGas = ethers.parseEther(
						(+ethers.formatEther(feeData.maxFeePerGas) * 1.2).toFixed(18),
					);
					if (feeData.maxPriorityFeePerGas)
						transactionRequest.maxPriorityFeePerGas = ethers.parseEther(
							(+ethers.formatEther(feeData.maxPriorityFeePerGas) * 1.2).toFixed(18),
						);
				}
				if (network === BigInt(ChainId.Berachain)) {
					transactionRequest.maxFeePerGas = ethers.parseEther(
						(+ethers.formatEther(feeData.maxFeePerGas) * 2).toFixed(18),
					);
					if (feeData.maxPriorityFeePerGas)
						transactionRequest.maxPriorityFeePerGas = ethers.parseEther(
							(+ethers.formatEther(feeData.maxPriorityFeePerGas) * 2).toFixed(18),
						);
				}
				if (network === BigInt(ChainId.Base)) {
					transactionRequest.maxFeePerGas = ethers.parseEther(
						(+ethers.formatEther(feeData.maxFeePerGas) * 1.2).toFixed(18),
					);
					if (feeData.maxPriorityFeePerGas)
						transactionRequest.maxPriorityFeePerGas = ethers.parseEther(
							(+ethers.formatEther(feeData.maxPriorityFeePerGas) * 1.2).toFixed(18),
						);
				}
				if (network === BigInt(ChainId.Hemi) && feeData.gasPrice) {
					transactionRequest.maxFeePerGas = ethers.parseEther((+ethers.formatEther(feeData.gasPrice) * 2).toFixed(18));
					if (feeData.maxPriorityFeePerGas)
						transactionRequest.maxPriorityFeePerGas = ethers.parseEther(
							(+ethers.formatEther(feeData.maxPriorityFeePerGas) * 2).toFixed(18),
						);
				}
				// if (network === BigInt(ChainId.Shape) && feeData.gasPrice) {
				// 	transactionRequest.maxFeePerGas = ethers.parseEther((+ethers.formatEther(feeData.gasPrice) * 2).toFixed(18));
				// 	if (feeData.maxPriorityFeePerGas)
				// 		transactionRequest.maxPriorityFeePerGas = ethers.parseEther(
				// 			(+ethers.formatEther(feeData.maxPriorityFeePerGas) * 2).toFixed(18),
				// 		);
				// }
			}
		}

		return transactionRequest;
	}

	static async generateAndMakeTransaction(
		provider: ethers.Provider,
		privateKey: string,
		contractAddress: string,
		value = BigInt(0),
		data?: string,
		gasLimit?: number,
	): Promise<ethers.TransactionResponse> {
		const transaction = await Evm.generateTransactionRequest(provider, privateKey, contractAddress, value, data, gasLimit);

		const tr = await Evm.makeTransaction(provider, privateKey, transaction);
		return tr;
	}

	static async getBalance(network: Network, address: string, tokenSymbol?: string): Promise<bigint> {
		let balance;
		const provider = network.getProvider();
		if (tokenSymbol && tokenSymbol !== network.nativeCoin) {
			const token = network.tokens.find((t) => t.symbol === tokenSymbol);
			if (!token) throw new Error(`There is no ${tokenSymbol} in ${network.name}!`);
			const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
			balance = await contract.balanceOf(address);
		} else {
			balance = await provider.getBalance(address);
		}

		return balance;
	}

	static async wrap(network: Network, privateKey: string, amount: string) {
		await Logger.getInstance().log(`Start wrapping ${amount} ${network.nativeCoin} ...`, MessageType.Info);
		const provider = network.getProvider();

		const amt = ethers.parseEther(amount);

		const data = new ethers.Interface(WRAP_ABI).encodeFunctionData('deposit');

		const contractAddress = network.tokens.find((t) => t.symbol === `W${network.nativeCoin}`)?.address;
		if (!contractAddress) throw new Error(`There is no contractAddress for W${network} in network ${network.chainId}`);

		const transaction = await Evm.generateTransactionRequest(provider, privateKey, contractAddress, amt, data);

		await this.makeTransaction(provider, privateKey, transaction);

		await Logger.getInstance().log(`${amount} ${network.nativeCoin} wrapped`, MessageType.Info);
	}

	static async unwrap(network: Network, privateKey: string, amount?: string) {
		await Logger.getInstance().log(
			`Start unwrapping ${amount ? amount : 'max'} W${network.nativeCoin} ...`,
			MessageType.Info,
		);
		const provider = network.getProvider();
		const wallet = new ethers.Wallet(privateKey);
		const amt = amount ? ethers.parseEther(amount) : await this.getBalance(network, wallet.address, `W${network.nativeCoin}`);

		if (amt > BigInt(0)) {
			const data = new ethers.Interface(WRAP_ABI).encodeFunctionData('withdraw', [amt]);

			const contractAddress = network.tokens.find((t) => t.symbol === `W${network.nativeCoin}`)?.address;
			if (!contractAddress) throw new Error(`There is no contractAddress for W${network} in network ${network.chainId}`);

			const transaction = await Evm.generateTransactionRequest(provider, privateKey, contractAddress, BigInt(0), data);

			await this.makeTransaction(provider, privateKey, transaction);

			await Logger.getInstance().log(`${ethers.formatEther(amt)} W${network.nativeCoin} unwrapped`);
		} else {
			await Logger.getInstance().log(`No W${network.nativeCoin} to unwrap`);
		}
	}

	static async getBalanceMulticall(network: Network, address: string) {
		const provider = network.getProvider();

		const MULTICALL_ADDRESS = '0x83cb147c13cBA4Ba4a5228BfDE42c88c8F6881F6';

		const contract = new ethers.Contract(MULTICALL_ADDRESS, MULTICALL_ABI, provider);

		const tokenContractAddress1 = network.tokens.find((t) => t.symbol === `WBNB`)?.address;
		const tokenContractAddress2 = network.tokens.find((t) => t.symbol === `USDC`)?.address;
		if (!tokenContractAddress1 || !tokenContractAddress2)
			throw new Error(`There is no contractAddress for USDC in network ${network.chainId}`);
		const tokenContract1 = new ethers.Contract(tokenContractAddress1, ERC20_ABI, provider);
		const tokenContract2 = new ethers.Contract(tokenContractAddress2, ERC20_ABI, provider);

		const data1 = tokenContract1.interface.encodeFunctionData('balanceOf', [address]);
		const data2 = tokenContract2.interface.encodeFunctionData('balanceOf', [address]);

		const resp = await contract.call([tokenContractAddress1, tokenContractAddress2], [data1, data2]);
		console.log(resp.map((r: any) => ethers.formatEther(r[1])));
	}

	static async waitBalance(
		address: string,
		chainId: ChainId,
		tokenSymbol: string,
		waitingBalance: number,
		delayInS = 10,
		attemptsBeforeError = Number.MAX_SAFE_INTEGER,
	): Promise<bigint> {
		const network = await Network.getNetworkByChainId(chainId);

		let normBalance;
		let balanceBn = BigInt(0);
		let attempts = 0;
		while (!normBalance && attempts < attemptsBeforeError) {
			attempts++;
			try {
				balanceBn = await Evm.getBalance(network, address, tokenSymbol);
				const token = network.tokens.find((t) => t.symbol === tokenSymbol);
				if (!token) throw new Error('Couldnt get token!');

				const decimals = await Evm.getDecimals(network, token);
				const currentBalance = +ethers.formatUnits(balanceBn, decimals);

				if (currentBalance >= waitingBalance) {
					normBalance = true;
				} else {
					if (attempts >= attemptsBeforeError) {
						throw new Error(
							`Couldnt wait ${waitingBalance} ${tokenSymbol} on ${network.name} on (${address}) with ${attempts} attempts!`,
						);
					} else {
						await Logger.getInstance().log(
							`Balance on (${address}): ${currentBalance} ${tokenSymbol}. Waiting for ${waitingBalance} ${tokenSymbol} on ${
								network.name
							}...`,
						);
						await delay(delayInS);
					}
				}
			} catch (e) {
				if (attempts >= attemptsBeforeError) {
					throw new Error(
						`Couldnt wait ${waitingBalance} ${tokenSymbol} on ${network.name} on (${address}) with ${attempts} attempts!`,
					);
				} else {
					await Logger.getInstance().log(`Something went wrong! ${e} Trying again...`);
					await delay(delayInS);
				}
			}
		}

		return balanceBn;
	}
}

const MULTICALL_ABI = [
	{
		inputs: [
			{ internalType: 'address[]', name: 'contracts', type: 'address[]' },
			{ internalType: 'bytes[]', name: 'data', type: 'bytes[]' },
			{ internalType: 'uint256', name: 'gas', type: 'uint256' },
		],
		name: 'call',
		outputs: [
			{
				components: [
					{ internalType: 'bool', name: 'success', type: 'bool' },
					{ internalType: 'bytes', name: 'data', type: 'bytes' },
				],
				internalType: 'struct BalanceScanner.Result[]',
				name: 'results',
				type: 'tuple[]',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address[]', name: 'contracts', type: 'address[]' },
			{ internalType: 'bytes[]', name: 'data', type: 'bytes[]' },
		],
		name: 'call',
		outputs: [
			{
				components: [
					{ internalType: 'bool', name: 'success', type: 'bool' },
					{ internalType: 'bytes', name: 'data', type: 'bytes' },
				],
				internalType: 'struct BalanceScanner.Result[]',
				name: 'results',
				type: 'tuple[]',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'address[]', name: 'addresses', type: 'address[]' }],
		name: 'etherBalances',
		outputs: [
			{
				components: [
					{ internalType: 'bool', name: 'success', type: 'bool' },
					{ internalType: 'bytes', name: 'data', type: 'bytes' },
				],
				internalType: 'struct BalanceScanner.Result[]',
				name: 'results',
				type: 'tuple[]',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address[]', name: 'addresses', type: 'address[]' },
			{ internalType: 'address', name: 'token', type: 'address' },
		],
		name: 'tokenBalances',
		outputs: [
			{
				components: [
					{ internalType: 'bool', name: 'success', type: 'bool' },
					{ internalType: 'bytes', name: 'data', type: 'bytes' },
				],
				internalType: 'struct BalanceScanner.Result[]',
				name: 'results',
				type: 'tuple[]',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'owner', type: 'address' },
			{ internalType: 'address[]', name: 'contracts', type: 'address[]' },
		],
		name: 'tokensBalance',
		outputs: [
			{
				components: [
					{ internalType: 'bool', name: 'success', type: 'bool' },
					{ internalType: 'bytes', name: 'data', type: 'bytes' },
				],
				internalType: 'struct BalanceScanner.Result[]',
				name: 'results',
				type: 'tuple[]',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
];

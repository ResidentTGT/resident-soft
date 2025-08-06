import { Logger } from '@utils/logger';
import { Network } from '@utils/network';
import {
	Account as SolanaAccount,
	Address,
	address,
	createKeyPairSignerFromBytes,
	createSolanaRpc,
	getBase58Encoder,
	sendAndConfirmTransactionFactory,
	Rpc,
	createTransactionMessage,
	pipe,
	setTransactionMessageFeePayer,
	setTransactionMessageLifetimeUsingBlockhash,
	signTransactionMessageWithSigners,
	createSolanaRpcSubscriptions,
	getSignatureFromTransaction,
	RpcSubscriptions,
	SolanaRpcSubscriptionsApi,
	KeyPairSigner,
	appendTransactionMessageInstructions,
	IInstruction,
	IAccountMeta,
	IAccountLookupMeta,
} from '@solana/web3.js';
import {
	fetchMint,
	findAssociatedTokenPda,
	getCloseAccountInstruction,
	getCreateAssociatedTokenInstruction,
	getInitializeAccount3Instruction,
	getTransferInstruction,
	Mint,
} from '@solana-program/token';
import { getTransferSolInstruction } from '@solana-program/system';
import { ethers } from 'ethers';
import { getExplorerUrl } from '@utils/getExplorerUrl';
import { Token } from '@utils/network';

//https://solana.com/ru/docs/clients/javascript-reference
export class SvmApi {
	private readonly _rpc;
	private readonly _wss;
	private readonly _network;

	constructor(network: Network) {
		if (!network.rpc) throw new Error('Couldnt create Api instance due to lack of rpc!');
		this._network = network;
		this._rpc = createSolanaRpc(network.rpc);
		this._wss = createSolanaRpcSubscriptions(network.rpc.replace('https://', 'wss://'));
	}

	getNetwork(): Network {
		return this._network;
	}

	getRpc(): Rpc<any> {
		return this._rpc;
	}

	getWss(): RpcSubscriptions<SolanaRpcSubscriptionsApi> {
		return this._wss;
	}

	async getSlot() {
		const slot = await this._rpc.getSlot(); // getting the most recent slot number
		console.log('The latest slot number is', slot);
	}

	getKeypairFromPrivate = async (privateKey: string) =>
		await createKeyPairSignerFromBytes(getBase58Encoder().encode(privateKey));

	async getBalance(addr: string, tokenSymbol?: string): Promise<bigint> {
		let balance;
		if (tokenSymbol && tokenSymbol !== this._network.nativeCoin) {
			const token = this._network.tokens.find((t) => t.symbol === tokenSymbol);
			if (!token) throw new Error();
			const programAddress = await this.getProgramAddress(token.address);
			try {
				const tokenAccountAddr = await findAssociatedTokenPda({
					mint: address(token.address),
					owner: address(addr),
					tokenProgram: programAddress,
				});

				balance = BigInt((await this._rpc.getTokenAccountBalance(tokenAccountAddr[0]).send()).value.amount);
			} catch (e) {
				if ((e as any).toString().includes('could not find account')) {
					balance = BigInt(0);
				}
			}
		} else {
			balance = (await this._rpc.getBalance(address(addr)).send()).value;
		}
		if (!balance && balance !== BigInt(0)) throw new Error('No balance!');

		return balance;
	}

	async getDecimals(token: Token): Promise<number> {
		let decimals = 9;

		if (token.symbol !== this._network.nativeCoin) {
			const info = await this.getParsedAccountInfo(token.address);
			decimals = info.data.decimals;
		}

		if (!decimals) throw new Error('No decimals!');

		return decimals;
	}

	async getParsedAccountInfo(mintAddress: string): Promise<SolanaAccount<Mint, string>> {
		const info = await fetchMint(this._rpc, address(mintAddress));
		return info;
	}

	getProgramAddress = async (mintAddress: string): Promise<Address> =>
		(await this.getParsedAccountInfo(mintAddress)).programAddress;

	async transfer(privateKey: string, to: string, amount: number, tokenSymbol?: string): Promise<string> {
		const walletKeyPair = await this.getKeypairFromPrivate(privateKey);

		await Logger.getInstance().log(
			`Start sending ${amount} ${tokenSymbol ?? this._network.nativeCoin} from ${walletKeyPair.address} to ${to} ...`,
		);

		let instructions = [];
		if (tokenSymbol && tokenSymbol !== this._network.nativeCoin) {
			const token = this._network.tokens.find((t) => t.symbol === tokenSymbol);
			if (!token) throw new Error();
			const decimals = await this.getDecimals(token);
			const programAddress = await this.getProgramAddress(token.address);

			const senderAccountAddr = await findAssociatedTokenPda({
				mint: address(token.address),
				owner: address(walletKeyPair.address),
				tokenProgram: programAddress,
			});

			const receiverAccountAddr = await findAssociatedTokenPda({
				mint: address(token.address),
				owner: address(to),
				tokenProgram: programAddress,
			});

			try {
				await this._rpc.getTokenAccountBalance(receiverAccountAddr[0]).send();
			} catch (e) {
				if ((e as any).toString().includes('could not find account')) {
					await Logger.getInstance().log(`Added create ATA instruction.`);
					instructions.push(
						this.getCreateAssociatedTokenInstruction(
							walletKeyPair,
							address(to),
							receiverAccountAddr[0],
							programAddress,
							address(token.address),
						),
					);
				}
			}

			// const receiverAccountInfo = await this._rpc.getAccountInfo(receiverAccountAddr[0]).send();
			// //console.log(receiverAccountInfo);
			// if (!receiverAccountInfo.value) {

			// }

			instructions.push(
				getTransferInstruction(
					{
						amount: ethers.parseUnits(amount.toString(), decimals),
						source: senderAccountAddr[0],
						destination: receiverAccountAddr[0],
						authority: walletKeyPair.address,
						multiSigners: [walletKeyPair],
					},
					{ programAddress },
				),
			);
		} else {
			instructions = [
				getTransferSolInstruction({
					amount: ethers.parseUnits(amount.toFixed(9), 9),
					destination: address(to),
					source: walletKeyPair,
				}),
			];
		}
		const signature = await this.makeTransaction(walletKeyPair, instructions);

		return signature;
	}

	async makeTransaction(keypair: KeyPairSigner, instructions: any[]): Promise<any> {
		const latestBlockhash = (await this._rpc.getLatestBlockhash({ commitment: 'confirmed' }).send()).value;

		const transactionMessage = pipe(
			createTransactionMessage({ version: 0 }),
			(tx) => setTransactionMessageFeePayer(keypair.address, tx),
			(tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
			(tx) => appendTransactionMessageInstructions(instructions, tx),
		);

		//const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);

		// const base64EncodedWireTransaction = getBase64EncodedWireTransaction(signedTransaction);
		// const response = (
		// 	await axios.post(
		// 		this._network.getRpc(),
		// 		{
		// 			jsonrpc: '2.0',
		// 			id: 'helius-example',
		// 			method: 'getPriorityFeeEstimate',
		// 			params: [
		// 				{
		// 					transaction: base64EncodedWireTransaction,
		// 					options: {
		// 						transactionEncoding: 'base64',
		// 						recommended: true,
		// 					},
		// 				},
		// 			],
		// 		},
		// 		{
		// 			headers: { 'Content-Type': 'application/json' },
		// 		},
		// 	)
		// ).data;

		// console.log(response);
		//const priorityFee = response.priorityFeeEstimate;
		//await Logger.getInstance().log(`Setting priority fee to ${priorityFee}`);

		// const getComputeUnitEstimateForTransactionMessage = getComputeUnitEstimateForTransactionMessageFactory({
		// 	rpc: this._rpc,
		// });
		// let computeUnitsEstimate = await getComputeUnitEstimateForTransactionMessage(transactionMessage);
		// computeUnitsEstimate = computeUnitsEstimate < 1000 ? 1000 : Math.ceil(computeUnitsEstimate * 3);
		// await Logger.getInstance().log(`Setting compute units to ${computeUnitsEstimate}`);

		//latestBlockhash = (await this._rpc.getLatestBlockhash({ commitment: 'processed' }).send()).value;

		//const priceInstruction = getSetComputeUnitPriceInstruction({ microLamports: 4000000 });

		const finalTransactionMessage = appendTransactionMessageInstructions(
			[
				//priceInstruction,
				// getSetComputeUnitLimitInstruction({ units: computeUnitsEstimate })
			],
			transactionMessage,
		);
		//setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, finalTransactionMessage);

		const finalSignedTransaction = await signTransactionMessageWithSigners(finalTransactionMessage);

		const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
			rpc: this._rpc,
			rpcSubscriptions: this._wss,
		});

		await sendAndConfirmTransaction(finalSignedTransaction, {
			commitment: 'confirmed',
		});
		const signature = getSignatureFromTransaction(finalSignedTransaction as any);

		await Logger.getInstance().log(`Transaction: ${getExplorerUrl(this._network.chainId, undefined, signature)}`);

		return signature;
	}

	getCreateAssociatedTokenInstruction(
		walletKeyPair: KeyPairSigner,
		ownerAddr: Address,
		newAccountAddr: Address,
		tokenProgramAddress: Address,
		mintAddr: Address,
	) {
		const instruction = getCreateAssociatedTokenInstruction({
			ata: newAccountAddr,
			mint: mintAddr,
			owner: ownerAddr,
			payer: walletKeyPair,
			tokenProgram: tokenProgramAddress,
		});

		return instruction;
	}

	async getInitializeAccount3Instruction(owner: Address, accountAddr: Address, mintAddr: Address) {
		const instruction = getInitializeAccount3Instruction({
			mint: mintAddr,
			account: accountAddr,
			owner,
		});
		return instruction;
	}

	async getCloseAccountInstruction(owner: KeyPairSigner, account: KeyPairSigner) {
		const instruction = getCloseAccountInstruction({
			destination: owner.address,
			account: account.address,
			owner: owner.address,
		});
		return instruction;
	}

	async getTransferSolInstruction(owner: KeyPairSigner, destination: string, amount: string) {
		const instruction = getTransferSolInstruction({
			amount: ethers.parseUnits(amount, 9),
			destination: address(destination),
			source: owner,
		});
		return instruction;
	}

	async getInstruction(
		accounts: (IAccountMeta<string> | IAccountLookupMeta<string, string>)[],
		programAddress: string,
		data: any,
	) {
		const instruction: IInstruction = {
			programAddress: address(programAddress),
			accounts,
			data,
		};
		return instruction;
	}
}

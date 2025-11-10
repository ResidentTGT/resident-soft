// secretlint-disable @secretlint/secretlint-rule-secp256k1-privatekey
import { MissingFieldError } from '@src/utils/errors';
import Random from '@src/utils/random';
import { Account } from '@utils/account';
import { Logger } from '@utils/logger';
import { Network } from '@utils/network';
import { ContractFactory, ethers } from 'ethers';
import { Evm } from '../modules/evm';

export enum CustomContractType {
	Store = 'Store',
	Vote = 'Vote',
	Lend = 'Lend',
	Borrow = 'Borrow',
	Swap = 'Swap',
	Repay = 'Repay',
	Deposit = 'Deposit',
	Withdraw = 'Withdraw',
}

export interface CustomContract {
	type: CustomContractType;
	address?: string;
	abi: string;
	bytecode: string;
}

const CONTRACTS: CustomContract[] = [
	{
		type: CustomContractType.Store,
		abi: `[{"inputs": [{ "internalType": "uint256", "name": "num", "type": "uint256" }],"name": "store","outputs": [],"stateMutability": "nonpayable","type": "function"}]`,
		bytecode:
			'0x6080604052348015600e575f5ffd5b506101298061001c5f395ff3fe6080604052348015600e575f5ffd5b50600436106030575f3560e01c80632e64cec11460345780636057361d14604e575b5f5ffd5b603a6066565b60405160459190608d565b60405180910390f35b606460048036038101906060919060cd565b606e565b005b5f5f54905090565b805f8190555050565b5f819050919050565b6087816077565b82525050565b5f602082019050609e5f8301846080565b92915050565b5f5ffd5b60af816077565b811460b8575f5ffd5b50565b5f8135905060c78160a8565b92915050565b5f6020828403121560df5760de60a4565b5b5f60ea8482850160bb565b9150509291505056fea264697066735822122063f96a57b86a37af1ac0fbf522233470beb0ae3e330dcafa317cb897259fa87364736f6c634300081e0033',
	},
	{
		type: CustomContractType.Vote,
		abi: `[{"inputs": [{ "internalType": "uint256", "name": "num", "type": "uint256" }],"name": "vote","outputs": [],"stateMutability": "nonpayable","type": "function"}]`,
		bytecode:
			'0x6080604052348015600e575f5ffd5b506101298061001c5f395ff3fe6080604052348015600e575f5ffd5b50600436106030575f3560e01c80630121b93f1460345780632e64cec114604c575b5f5ffd5b604a60048036038101906046919060a9565b6066565b005b6052606f565b604051605d919060dc565b60405180910390f35b805f8190555050565b5f5f54905090565b5f5ffd5b5f819050919050565b608b81607b565b81146094575f5ffd5b50565b5f8135905060a3816084565b92915050565b5f6020828403121560bb5760ba6077565b5b5f60c6848285016097565b91505092915050565b60d681607b565b82525050565b5f60208201905060ed5f83018460cf565b9291505056fea264697066735822122059767032b429392a28ab9c503ebf23082e95b2825a86ad8d0023aaa979fa506a64736f6c634300081e0033',
	},
	{
		type: CustomContractType.Lend,
		abi: `[{"inputs": [{ "internalType": "uint256", "name": "num", "type": "uint256" }],"name": "lend","outputs": [],"stateMutability": "nonpayable","type": "function"}]`,
		bytecode:
			'0x6080604052348015600e575f5ffd5b506101298061001c5f395ff3fe6080604052348015600e575f5ffd5b50600436106030575f3560e01c80632e64cec1146034578063a6aa57ce14604e575b5f5ffd5b603a6066565b60405160459190608d565b60405180910390f35b606460048036038101906060919060cd565b606e565b005b5f5f54905090565b805f8190555050565b5f819050919050565b6087816077565b82525050565b5f602082019050609e5f8301846080565b92915050565b5f5ffd5b60af816077565b811460b8575f5ffd5b50565b5f8135905060c78160a8565b92915050565b5f6020828403121560df5760de60a4565b5b5f60ea8482850160bb565b9150509291505056fea264697066735822122053c5ae1884bbf581b144a7c411282e48b278e983323e29ae325d5c0715d37d8964736f6c634300081e0033',
	},
	{
		type: CustomContractType.Borrow,
		abi: `[{"inputs": [{ "internalType": "uint256", "name": "num", "type": "uint256" }],"name": "borrow","outputs": [],"stateMutability": "nonpayable","type": "function"}]`,
		bytecode:
			'0x6080604052348015600e575f5ffd5b506101298061001c5f395ff3fe6080604052348015600e575f5ffd5b50600436106030575f3560e01c80632e64cec1146034578063c5ebeaec14604e575b5f5ffd5b603a6066565b60405160459190608d565b60405180910390f35b606460048036038101906060919060cd565b606e565b005b5f5f54905090565b805f8190555050565b5f819050919050565b6087816077565b82525050565b5f602082019050609e5f8301846080565b92915050565b5f5ffd5b60af816077565b811460b8575f5ffd5b50565b5f8135905060c78160a8565b92915050565b5f6020828403121560df5760de60a4565b5b5f60ea8482850160bb565b9150509291505056fea264697066735822122056df35965d58c28c3e8401255fd6d478c76d40d165910e8637fdacc5416c776964736f6c634300081e0033',
	},
	{
		type: CustomContractType.Swap,
		abi: `[{"inputs": [{ "internalType": "uint256", "name": "num", "type": "uint256" }],"name": "swap","outputs": [],"stateMutability": "nonpayable","type": "function"}]`,
		bytecode:
			'0x6080604052348015600e575f5ffd5b506101298061001c5f395ff3fe6080604052348015600e575f5ffd5b50600436106030575f3560e01c80632e64cec114603457806394b918de14604e575b5f5ffd5b603a6066565b60405160459190608d565b60405180910390f35b606460048036038101906060919060cd565b606e565b005b5f5f54905090565b805f8190555050565b5f819050919050565b6087816077565b82525050565b5f602082019050609e5f8301846080565b92915050565b5f5ffd5b60af816077565b811460b8575f5ffd5b50565b5f8135905060c78160a8565b92915050565b5f6020828403121560df5760de60a4565b5b5f60ea8482850160bb565b9150509291505056fea26469706673582212203fea1af672939ab5c12c0943afb928a014692c2beee539f46069d5769132f63664736f6c634300081e0033',
	},
	{
		type: CustomContractType.Repay,
		abi: `[{"inputs": [{ "internalType": "uint256", "name": "num", "type": "uint256" }],"name": "repay","outputs": [],"stateMutability": "nonpayable","type": "function"}]`,
		bytecode:
			'0x6080604052348015600e575f5ffd5b506101298061001c5f395ff3fe6080604052348015600e575f5ffd5b50600436106030575f3560e01c80632e64cec1146034578063371fd8e614604e575b5f5ffd5b603a6066565b60405160459190608d565b60405180910390f35b606460048036038101906060919060cd565b606e565b005b5f5f54905090565b805f8190555050565b5f819050919050565b6087816077565b82525050565b5f602082019050609e5f8301846080565b92915050565b5f5ffd5b60af816077565b811460b8575f5ffd5b50565b5f8135905060c78160a8565b92915050565b5f6020828403121560df5760de60a4565b5b5f60ea8482850160bb565b9150509291505056fea26469706673582212201df80718d82ce64148244e1d2b40aefca5cdcbf9e72be384ce2809bb22a850af64736f6c634300081e0033',
	},
	{
		type: CustomContractType.Deposit,
		abi: `[{"inputs": [{ "internalType": "uint256", "name": "num", "type": "uint256" }],"name": "deposit","outputs": [],"stateMutability": "nonpayable","type": "function"}]`,
		bytecode:
			'0x6080604052348015600e575f5ffd5b506101298061001c5f395ff3fe6080604052348015600e575f5ffd5b50600436106030575f3560e01c80632e64cec1146034578063b6b55f2514604e575b5f5ffd5b603a6066565b60405160459190608d565b60405180910390f35b606460048036038101906060919060cd565b606e565b005b5f5f54905090565b805f8190555050565b5f819050919050565b6087816077565b82525050565b5f602082019050609e5f8301846080565b92915050565b5f5ffd5b60af816077565b811460b8575f5ffd5b50565b5f8135905060c78160a8565b92915050565b5f6020828403121560df5760de60a4565b5b5f60ea8482850160bb565b9150509291505056fea264697066735822122063206e766e744049270b01a19a14202a3a92a98bec2a0f09e01e2b28e287f68e64736f6c634300081e0033',
	},
	{
		type: CustomContractType.Withdraw,
		abi: `[{"inputs": [{ "internalType": "uint256", "name": "num", "type": "uint256" }],"name": "withdraw","outputs": [],"stateMutability": "nonpayable","type": "function"}]`,
		bytecode:
			'0x6080604052348015600e575f5ffd5b506101298061001c5f395ff3fe6080604052348015600e575f5ffd5b50600436106030575f3560e01c80632e1a7d4d1460345780632e64cec114604c575b5f5ffd5b604a60048036038101906046919060a9565b6066565b005b6052606f565b604051605d919060dc565b60405180910390f35b805f8190555050565b5f5f54905090565b5f5ffd5b5f819050919050565b608b81607b565b81146094575f5ffd5b50565b5f8135905060a3816084565b92915050565b5f6020828403121560bb5760ba6077565b5b5f60c6848285016097565b91505092915050565b60d681607b565b82525050565b5f60208201905060ed5f83018460cf565b9291505056fea2646970667358221220889aee06eedf00e8ef25cd499b94926b3be0f866d7c360e2d9c4c50e24f8e12964736f6c634300081e0033',
	},
];

export async function deployCustomContract(
	account: Account,
	network: Network,
	contractType?: CustomContractType,
): Promise<CustomContract> {
	if (!account.wallets?.evm?.private) throw new Error(`There is no account.wallets?.evm!`);

	const provider = network.getProvider();
	const wallet = new ethers.Wallet(account.wallets.evm.private, provider);

	const customContract = contractType ? CONTRACTS.find((c) => c.type === contractType) : Random.choose(CONTRACTS);
	if (!customContract) throw new Error(`There is no ${contractType} contract!`);

	const factory = new ContractFactory(customContract.abi, customContract.bytecode, wallet);

	const contract = await factory.deploy();
	await contract.waitForDeployment();
	const address = await contract.getAddress();
	customContract.address = address;

	await Logger.getInstance().log(`Contract ${customContract.type} (${customContract.address}) deployed on ${network.name}`);

	return customContract;
}

export async function interactCustomContract(account: Account, network: Network, customContract: CustomContract): Promise<void> {
	if (!customContract.address) throw new Error(`There is no customContract.address!`);
	if (!account.wallets?.evm?.private) throw new MissingFieldError(`wallets.evm.private`);

	const provider = network.getProvider();
	const wallet = new ethers.Wallet(account.wallets.evm.private, provider);

	const contract = new ethers.Contract(customContract.address, customContract.abi, wallet);

	let data = '';
	switch (customContract.type) {
		case CustomContractType.Store:
			data = contract.interface.encodeFunctionData('store', [Random.int(1, 100000)]);
			break;
		case CustomContractType.Vote:
			data = contract.interface.encodeFunctionData('vote', [Random.int(1, 100000)]);
			break;
		case CustomContractType.Lend:
			data = contract.interface.encodeFunctionData('lend', [Random.int(1, 100000)]);
			break;
		case CustomContractType.Borrow:
			data = contract.interface.encodeFunctionData('borrow', [Random.int(1, 100000)]);
			break;
		case CustomContractType.Swap:
			data = contract.interface.encodeFunctionData('swap', [Random.int(1, 100000)]);
			break;
		case CustomContractType.Repay:
			data = contract.interface.encodeFunctionData('repay', [Random.int(1, 100000)]);
			break;
		case CustomContractType.Deposit:
			data = contract.interface.encodeFunctionData('deposit', [Random.int(1, 100000)]);
			break;
		case CustomContractType.Withdraw:
			data = contract.interface.encodeFunctionData('withdraw', [Random.int(1, 100000)]);
			break;

		default:
			throw new Error(`There is no interaction with ${customContract.type} contract!`);
	}

	await Evm.generateAndMakeTransaction(provider, account.wallets.evm.private, customContract.address, BigInt(0), data);
}

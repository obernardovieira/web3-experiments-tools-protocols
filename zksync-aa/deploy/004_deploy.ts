import { utils, Wallet, Provider, EIP712Signer, types } from "zksync-ethers";
import * as ethers from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { deployContract } from "./utils";

// Put the address of your AA factory
const AA_FACTORY_ADDRESS = "0x111C3E89Ce80e62EE88318C2804920D4c96f92bb";

export default async function (hre: HardhatRuntimeEnvironment) {
	const provider = new Provider(hre.network.config.url!);
	// Private key of the account used to deploy
	const wallet = new Wallet("0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110").connect(provider);
	const factoryArtifact = await hre.artifacts.readArtifact("AAFactory");

	const aaFactory = new ethers.Contract(AA_FACTORY_ADDRESS, factoryArtifact.abi, wallet);

	// The two owners of the multisig
	const owner1 = Wallet.createRandom();
	const owner2 = Wallet.createRandom();

	// For the simplicity of the tutorial, we will use zero hash as salt
	const salt = ethers.constants.HashZero;

	// deploy account owned by owner1 & owner2
	const tx = await aaFactory.deployAccount(salt, owner1.address, owner2.address);
	await tx.wait();

	// Getting the address of the deployed contract account
	const abiCoder = new ethers.utils.AbiCoder();
	const multisigAddress = utils.create2Address(
		AA_FACTORY_ADDRESS,
		await aaFactory.aaBytecodeHash(),
		salt,
		abiCoder.encode(["address", "address"], [owner1.address, owner2.address])
	);
	console.log(`Multisig account deployed on address ${multisigAddress}`);



	console.log("Sending funds to multisig account");
	// Send funds to the multisig account we just deployed
	await (
		await wallet.sendTransaction({
			to: multisigAddress,
			// You can increase the amount of ETH sent to the multisig
			value: ethers.utils.parseEther("0.008"),
		})
	).wait();


	///////
	// Deploying the paymaster
	const paymaster = await deployContract("GeneralPaymaster", [], { wallet});
	// Send funds to the multisig account we just deployed
	await (
		await wallet.sendTransaction({
			to: paymaster.address,
			// You can increase the amount of ETH sent to the multisig
			value: ethers.utils.parseEther("0.009"),
		})
	).wait();

	let paymasterBalance = await provider.getBalance(paymaster.address);
	console.log(`Paymaster ETH balance is now ${paymasterBalance.toString()}`);
	const paymasterParams = utils.getPaymasterParams(paymaster.address, {
		type: "General",
		innerInput: new Uint8Array(),
	});
	////////

	let multisigBalance = await provider.getBalance(multisigAddress);
	console.log(`Multisig account balance is ${multisigBalance.toString()}`);

	// Transaction to deploy a new account using the multisig we just deployed
	let aaTx = await aaFactory.populateTransaction.deployAccount(
		salt,
		// These are accounts that will own the newly deployed account
		Wallet.createRandom().address,
		Wallet.createRandom().address
	);

	const gasLimit = await provider.estimateGas(aaTx);
	const gasPrice = await provider.getGasPrice();

	aaTx = {
		...aaTx,
		// deploy a new account using the multisig
		from: multisigAddress,
		gasLimit: gasLimit,
		gasPrice: gasPrice,
		chainId: (await provider.getNetwork()).chainId,
		nonce: await provider.getTransactionCount(multisigAddress),
		type: 113,
		customData: {
			gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
			paymasterParams
		} as types.Eip712Meta,
		value: ethers.BigNumber.from(0),
	};
	const signedTxHash = EIP712Signer.getSignedDigest(aaTx);

	const signature = ethers.utils.concat([
		// Note, that `signMessage` wouldn't work here, since we don't want
		// the signed hash to be prefixed with `\x19Ethereum Signed Message:\n`
		ethers.utils.joinSignature(owner1._signingKey().signDigest(signedTxHash)),
		ethers.utils.joinSignature(owner2._signingKey().signDigest(signedTxHash)),
	]);

	aaTx.customData = {
		...aaTx.customData,
		customSignature: signature,
	};

	console.log(`The multisig's nonce before the first tx is ${await provider.getTransactionCount(multisigAddress)}`);
	const sentTx = await provider.sendTransaction(utils.serialize(aaTx));
	await sentTx.wait();

	// Checking that the nonce for the account has increased
	console.log(`The multisig's nonce after the first tx is ${await provider.getTransactionCount(multisigAddress)}`);

	paymasterBalance = await provider.getBalance(paymaster.address);
	console.log(`Paymaster ETH balance is now ${paymasterBalance.toString()}`);

	multisigBalance = await provider.getBalance(multisigAddress);
	console.log(`Multisig account balance is now ${multisigBalance.toString()}`);

	console.log(`account1 balance is now ${(await provider.getBalance(owner1.address)).toString()}`);
	console.log(`account3 balance is now ${(await provider.getBalance(owner2.address)).toString()}`);
}

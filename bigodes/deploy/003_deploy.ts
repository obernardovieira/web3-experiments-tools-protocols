import { Provider, utils, Wallet } from "zksync-ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

export default async function (hre: HardhatRuntimeEnvironment) {
	// Private key of the account used to deploy
	console.log(process.env.WALLET_PRIVATE_KEY);
	const wallet = new Wallet('0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110', new Provider(hre.network.config.url!));
	const deployer = new Deployer(hre, wallet);
	const factoryArtifact = await deployer.loadArtifact("AAFactory");
	const aaArtifact = await deployer.loadArtifact("TwoUserMultisig");

	// Getting the bytecodeHash of the account
	const bytecodeHash = utils.hashBytecode(aaArtifact.bytecode);

	const factory = await deployer.deploy(
		factoryArtifact,
		[bytecodeHash],
		undefined,
		[
			// Since the factory requires the code of the multisig to be available,
			// we should pass it here as well.
			aaArtifact.bytecode,
		]
	);

	console.log(`AA factory address: ${factory.address}`);
}

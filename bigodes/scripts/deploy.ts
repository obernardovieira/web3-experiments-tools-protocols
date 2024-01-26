import { viem } from "hardhat";

async function main() {
	const dai = await viem.deployContract("DAITest");
	const ultraVerifier = await viem.deployContract("UltraVerifierMock");
	const opportunities = await viem.deployContract("Opportunities", [
		ultraVerifier.address,
	]);

	console.log("DAI deployed to:", dai.address);
	console.log("UltraVerifier deployed to:", ultraVerifier.address);
	console.log("Opportunities deployed to:", opportunities.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});

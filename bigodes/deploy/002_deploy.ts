import { deployContract } from "./utils";

export default async function () {
	// const DAITest = await deployContract("DAITest");
	// const Groth16Verifier = await deployContract("Groth16VerifierMock");

	// await deployContract("Opportunities", [Groth16Verifier.address]);

	const paymaster = await deployContract("GeneralPaymaster", []);
}
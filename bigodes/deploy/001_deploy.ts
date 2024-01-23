import { deployContract } from "./utils";

export default async function () {
	const DAITest = await deployContract("DAITest");
	const UltraVerifier = await deployContract("UltraVerifierMock");

	await deployContract("LoanBook", [DAITest.address, UltraVerifier.address]);
}
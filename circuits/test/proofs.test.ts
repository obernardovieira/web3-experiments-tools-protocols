import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';
import { Noir } from '@noir-lang/noir_js';
import circuit from '../circuits/target/circuits.json';
import { getContract } from "viem";

async function exportCallToVerifier(
	input: any
) {
	const backend = new BarretenbergBackend(circuit as any);
	const noir = new Noir(circuit as any, backend);

	console.log('Generating proof... ⌛');
	const proof = await noir.generateFinalProof({ input });
	console.log('Generating proof... ✅');

	return { proof: '0x' + Buffer.from(proof.proof).toString('hex'), publicInputs: [proof.publicInputs.entries().next().value[1]] };
}

// This tests take really long because generating proofs takes a long time.

describe("Proofs", function () {
	async function deployFixture() {
		const [owner] = await hre.viem.getWalletClients();
		const publicClient = await hre.viem.getPublicClient();
		const baseContract = await hre.viem.deployContract("UltraVerifier");

		const ultraVerifier = getContract({
			address: baseContract.address as any as `0x${string}`,
			abi: baseContract.abi,
			// use the next line to replace the ones below when moving to viem v2
			// client: { public: publicClient, wallet: owner },
			publicClient,
			walletClient: owner,
		});

		return { ultraVerifier };
	}


	it("Should generate proof and validate with smart contract", async function () {
		const { ultraVerifier } = await loadFixture(deployFixture);
		const input = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 243137, 501961, 43137, 0, 0, 0, 0, 94118, 992157, 270588, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 176471, 925490, 619608, 454902, 0, 0, 0, 0, 176471, 988235, 352941, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 600000, 988235, 988235, 807843, 98039, 0, 0, 125490, 666667, 988235, 917647, 129412, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 149020, 941176, 988235, 988235, 588235, 66667, 0, 0, 454902, 992157, 988235, 988235, 176471, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 184314, 988235, 988235, 988235, 0, 0, 0, 0, 454902, 992157, 988235, 988235, 176471, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 725490, 992157, 992157, 43137, 19608, 27451, 168627, 945098, 1000000, 992157, 968627, 164706, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 721569, 988235, 988235, 796078, 698039, 729412, 113725, 615686, 992157, 988235, 431373, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 721569, 988235, 988235, 992157, 988235, 988235, 603922, 596078, 992157, 988235, 670588, 439216, 721569, 482353, 98039, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 556863, 988235, 988235, 992157, 988235, 988235, 988235, 988235, 992157, 988235, 988235, 988235, 988235, 992157, 792157, 266667, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 149020, 537255, 537255, 992157, 988235, 988235, 988235, 988235, 992157, 988235, 988235, 988235, 988235, 992157, 905882, 392157, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 290196, 454902, 898039, 992157, 988235, 901961, 572549, 454902, 454902, 454902, 372549, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 811765, 988235, 901961, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 74510, 862745, 988235, 901961, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 274510, 988235, 988235, 529412, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 682353, 988235, 988235, 247059, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101961, 870588, 992157, 745098, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 66667, 819608, 988235, 537255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 86275, 843137, 988235, 741176, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 556863, 988235, 701961, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 274510, 988235, 372549, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
		const { proof, publicInputs } = await exportCallToVerifier(input);

		expect(await ultraVerifier.read.verify([proof, publicInputs])).to.equal(true);
	}).timeout(100000);
});
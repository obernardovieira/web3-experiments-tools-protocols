import { expect } from "chai";
import { ethers } from "ethers";
import { getWallet, deployContract, LOCAL_RICH_WALLETS } from "../deploy/utils";
import { groth16 } from "snarkjs";
import fs from "fs";

async function exportCallDataGroth16(input: any, wasmPath: string, zkeyPath: string) {
    const { proof: _proof, publicSignals: _publicSignals } =
        await groth16.fullProve(input, wasmPath, zkeyPath);

    const calldata = await groth16.exportSolidityCallData(_proof, _publicSignals);

    const argv: any = calldata
        .replace(/["[\]\s]/g, "")
        .split(",")
        .map((x) => BigInt(x).toString());

    const a = [argv[0], argv[1]];
    const b = [
        [argv[2], argv[3]],
        [argv[4], argv[5]],
    ];
    const c = [argv[6], argv[7]];
    const Input: any = [];

    for (let i = 8; i < argv.length; i++) {
        Input.push(argv[i]);
    }

    return { a, b, c, Input };
}

describe.skip("LoanBook", function () {
    let owner, provider, borrower1, borrower2;
    let tokenContract, verifierContract, loanBookContract;

    const ONE_DAY_SECONDS = 86400; // 1 day in seconds

    before(async () => {
        const wallet = getWallet(LOCAL_RICH_WALLETS[0].privateKey);

        tokenContract = await deployContract("DAITest", [], { wallet, silent: true });
        verifierContract = await deployContract("Groth16VerifierMock", [], { wallet, silent: true });
        loanBookContract = await deployContract("LoanBook", [tokenContract.address, verifierContract.address], { wallet, silent: true });

        // Get test wallets
        owner = getWallet(LOCAL_RICH_WALLETS[0].privateKey);
        provider = getWallet(LOCAL_RICH_WALLETS[1].privateKey);
        borrower1 = getWallet(LOCAL_RICH_WALLETS[2].privateKey);
        borrower2 = getWallet(LOCAL_RICH_WALLETS[3].privateKey);


        // Add providers
        await loanBookContract
            .connect(owner)
            .addProvider(provider.address, "IPFS_HASH_PROVIDER");

        // Fund provider and borrowers with some tokens
        await tokenContract
            .connect(owner)
            .transfer(provider.address, ethers.utils.parseEther("1000"));
        await tokenContract
            .connect(owner)
            .transfer(borrower1.address, ethers.utils.parseEther("1000"));
        await tokenContract
            .connect(owner)
            .transfer(borrower2.address, ethers.utils.parseEther("1000"));
        await tokenContract
            .connect(owner)
            .transfer(loanBookContract.address, ethers.utils.parseEther("1000"));
    });

    it("Should add and remove a provider", async function () {
        // Add a new provider
        await loanBookContract
            .connect(owner)
            .addProvider(borrower1.address, "IPFS_HASH_PROVIDER1");
        const { exists, ipfsHash } = await loanBookContract.getProviderInfo(
            borrower1.address
        );
        expect({ exists, ipfsHash }).to.deep.equal({
            exists: true,
            ipfsHash: "IPFS_HASH_PROVIDER1",
        });

        // Remove the provider
        await loanBookContract.connect(owner).removeProvider(borrower1.address);
        const { exists: exists2, ipfsHash: ipfsHash2 } =
            await loanBookContract.getProviderInfo(borrower1.address);
        expect({ exists: exists2, ipfsHash: ipfsHash2 }).to.deep.equal({
            exists: false,
            ipfsHash: "",
        });
    });

    it("Verify off-chain proof", async function () {
        const { proof, publicSignals } = await groth16.fullProve(
            { a: 10, b: 21 },
            "zk-circuit/multiplier2_js/multiplier2.wasm",
            "zk-circuit/multiplier2_0001.zkey"
        );

        const vKey = JSON.parse(
            fs.readFileSync("zk-circuit/verification_key.json").toString()
        );

        const res = await groth16.verify(vKey, publicSignals, proof);

        expect(res).to.be.true;
    });

    it("Verify on-chain proof", async function () {
        const { a, b, c, Input } = await exportCallDataGroth16(
            { a: 3, b: 11 },
            "zk-circuit/multiplier2_js/multiplier2.wasm",
            "zk-circuit/multiplier2_0001.zkey"
        );

        // Apply for a loan
        const tx = await loanBookContract.connect(borrower1).applyForLoan(
            ONE_DAY_SECONDS, // Maturity 1 day
            ethers.utils.parseEther("0.02"), // Interest
            ethers.utils.parseEther("10"), // Amount
            a,
            b,
            c,
            Input
        );

        await tx.wait();

        // if it doesn't throw, it means the proof is valid
    });

    it("Should apply, approve, claim, and repay a loan", async function () {
        const { a, b, c, Input } = await exportCallDataGroth16(
            { a: 3, b: 11 },
            "zk-circuit/multiplier2_js/multiplier2.wasm",
            "zk-circuit/multiplier2_0001.zkey"
        );

        // Apply for a loan
        const tx = await loanBookContract.connect(borrower1).applyForLoan(
            ONE_DAY_SECONDS, // Maturity 1 day
            ethers.utils.parseEther("0.02"), // Interest
            ethers.utils.parseEther("10"), // Amount
            a,
            b,
            c,
            Input
        );

        const receipt = await tx.wait();
        const loanId =
            receipt.events[
                receipt.events.findIndex((r) => r.event === "LoanRequested")
            ].args.loanId.toNumber();

        // Approve the loan
        await loanBookContract.connect(provider).acceptLoan(loanId);
        expect((await loanBookContract.getLoanDetails(loanId)).accepted).to.be.true;

        // Claim the loan
        await loanBookContract.connect(borrower1).claimLoan(loanId);
        const prevLoanDetails = await loanBookContract.getLoanDetails(loanId);
        expect(prevLoanDetails.claimed).to.be.true;

        // Approve the transfer of tokens
        await tokenContract
            .connect(borrower1)
            .approve(loanBookContract.address, prevLoanDetails.debt);

        // Repay the loan
        await loanBookContract
            .connect(borrower1)
            .repayLoan(loanId, prevLoanDetails.debt);
        const loanDetails = await loanBookContract.getLoanDetails(loanId);
        expect(loanDetails.debt.toString()).to.equal("0");
    });
});

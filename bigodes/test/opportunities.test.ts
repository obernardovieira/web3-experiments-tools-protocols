import { expect } from "chai";
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { viem } from "hardhat";
import { getContract, parseEther } from "viem";

// A deployment function to set up the initial state
const deploy = async () => {
    const publicClient = await viem.getPublicClient();
    const [owner, validator1, participant1] = await viem.getWalletClients();
    const baseDai = await viem.deployContract("DAITest");
    const dai = getContract({
        address: baseDai.address as any as `0x${string}`,
        abi: baseDai.abi,
        client: { public: publicClient, wallet: owner },
    });
    const ultraVerifier = await viem.deployContract("UltraVerifierMock");
    const baseOpportunities = await viem.deployContract("Opportunities", [
    	ultraVerifier.address as any as `0x${string}`,
    ]);
    const opportunities = getContract({
        address: baseOpportunities.address as any as `0x${string}`,
        abi: baseOpportunities.abi,
        client: { public: publicClient, wallet: owner },
    });

    // send tokens
    await dai.write.transfer([validator1.account.address, parseEther("1000")]);
    await dai.write.transfer([participant1.account.address, parseEther("1000")]);

    return { dai, ultraVerifier, opportunities, accounts: { owner, validator1, participant1 } };
};

describe("Opportunities", () => {
    it("Should apply, fund, join, and checkpoint an opportunity", async () => {
        const { dai, opportunities, accounts: { owner, participant1, validator1 } } = await loadFixture(deploy);
        // Apply for an opportunity
        await opportunities.write.add([10n, parseEther("2"), dai.address as any as `0x${string}`, "IPFS_HASH_OPPORTUNITY", [validator1.account.address]]);
        const opportunityId = 1n;

        // Fund the opportunity
        await dai.write.approve([opportunities.address as any as `0x${string}`, parseEther("5")]);
        await opportunities.write.fund([opportunityId, parseEther("5")]);

        // Join the opportunity
        await opportunities.write.join([
            opportunityId,
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            ["0x0000000000000000000000000000000000000000000000000000000000000000"]
        ], { account: participant1.account });

        // Checkpoint the opportunity
        const opportunity1 = await opportunities.read.opportunities([opportunityId]);

        // Check the opportunity state after checkpoint
        expect(opportunity1[1]).to.equal(0n);
        expect(opportunity1[3]).to.equal(parseEther("5"));

        // Checkpoint the opportunity
        await opportunities.write.checkpoint([
            opportunityId,
            2n,
            participant1.account.address
        ], { account: validator1.account });

        const opportunity2 = await opportunities.read.opportunities([opportunityId]);

        // Check the opportunity state after checkpoint
        expect(opportunity2[1]).to.equal(2n);
        expect(opportunity2[3]).to.equal(parseEther("1"));
    })

    // Add more tests based on your contract functionality

});
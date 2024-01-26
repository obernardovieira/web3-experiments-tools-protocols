import { expect } from "chai";
import { ethers } from "ethers";
import { getWallet, deployContract, LOCAL_RICH_WALLETS } from "../deploy/utils";

describe("Opportunities", function () {
    let owner, validator1, participant1;
    let tokenContract, verifierContract, opportunitiesContract;

    before(async () => {
        const wallet = getWallet(LOCAL_RICH_WALLETS[0].privateKey);

        tokenContract = await deployContract("DAITest", [], { wallet, silent: true });
        verifierContract = await deployContract("UltraVerifierMock", [], { wallet, silent: true });
        opportunitiesContract = await deployContract("Opportunities", [verifierContract.address], { wallet, silent: true });

        // Get test wallets
        owner = getWallet(LOCAL_RICH_WALLETS[0].privateKey);
        validator1 = getWallet(LOCAL_RICH_WALLETS[1].privateKey);
        participant1 = getWallet(LOCAL_RICH_WALLETS[2].privateKey);

        // Fund provider and borrowers with some tokens
        await tokenContract.transfer(validator1.address, ethers.utils.parseEther("1000"));
        await tokenContract.transfer(participant1.address, ethers.utils.parseEther("1000"));
    });

    it("Should apply, fund, join, and checkpoint an opportunity", async function () {
        // Apply for an opportunity
        await opportunitiesContract.connect(owner).add(
            100,
            ethers.utils.parseEther("2"),
            tokenContract.address,
            "IPFS_HASH_OPPORTUNITY",
            [validator1.address]
        );
        const opportunityId = 1;

        // Fund the opportunity
        await tokenContract.connect(owner).approve(opportunitiesContract.address, ethers.utils.parseEther("5"));
        await opportunitiesContract.connect(owner).fund(opportunityId, ethers.utils.parseEther("5"));

        // Join the opportunity
        await opportunitiesContract.connect(participant1).join(
            opportunityId,
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            ["0x0000000000000000000000000000000000000000000000000000000000000000"]
        );

        const opportunity1 = await opportunitiesContract.opportunities(opportunityId);

        // Check the opportunity state after checkpoint
        expect(opportunity1.current.toNumber()).to.equal(0);
        expect(opportunity1.balance.toString()).to.equal(ethers.utils.parseEther("5").toString());

        // Checkpoint the opportunity
        await opportunitiesContract.connect(validator1).checkpoint(opportunityId, 2, participant1.address);

        const opportunity2 = await opportunitiesContract.opportunities(opportunityId);

        // Check the opportunity state after checkpoint
        expect(opportunity2.current.toNumber()).to.equal(2);
        expect(opportunity2.balance.toString()).to.equal(ethers.utils.parseEther("1").toString());
    }).timeout(100000);

    // Add more tests based on your contract functionality

});
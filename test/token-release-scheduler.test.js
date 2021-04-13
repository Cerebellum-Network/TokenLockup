const hre = require("hardhat");
const chai = require("chai");
const { expect } = chai
const { solidity } = require("ethereum-waffle");
chai.use(solidity);
chai.use(solidity);

describe("TokenReleaseScheduler", function() {
    let senderAccount, releaser;
    beforeEach(async () => {
        const accounts = await hre.ethers.getSigners();

        senderAccount = accounts[0];

        const TokenReleaseScheduler = await hre.ethers.getContractFactory("TokenReleaseScheduler");
        releaser = await TokenReleaseScheduler.deploy();
    });

    it("createReleaseSchedule increments the schedulerCount", async function () {
        await releaser.connect(senderAccount).createReleaseSchedule(2,0,1,1);
        expect(await releaser.scheduleCount()).to.equal(1);
        await releaser.connect(senderAccount).createReleaseSchedule(2,0,1,1);
        expect(await releaser.scheduleCount()).to.equal(2);
    });
});
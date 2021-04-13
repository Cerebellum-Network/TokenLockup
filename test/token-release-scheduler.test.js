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

    // TODO: Use case tests
    /*
        // 10% immediately and remaining amount over 4 periods of 90 days
        // 50% after 360 day delay and remaining amont over 4 periods of 90 days
        // 30 day delay and then vesting every second for 360 days
        // commencement 6 months ago with 12 periods of 1 month
     */
});
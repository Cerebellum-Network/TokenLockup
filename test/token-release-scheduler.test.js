const hre = require("hardhat");
const chai = require("chai");
const { expect } = chai
const { solidity } = require("ethereum-waffle");
chai.use(solidity);

describe("TokenReleaseScheduler", function() {
    let senderAccount, releaser, token;
    const decimals = 10;
    const totalSupply = 8e9
    beforeEach(async () => {
        const accounts = await hre.ethers.getSigners();

        reserveAccount = accounts[0];

        const Token = await hre.ethers.getContractFactory("Token");

        token = await Token.deploy(
            "Xavier Yolo Zeus Token",
            "XYZ",
            decimals,
            reserveAccount.address,
            totalSupply
        );
        const TokenReleaseScheduler = await hre.ethers.getContractFactory("TokenReleaseScheduler");
        releaser = await TokenReleaseScheduler.deploy(
            token.address,
            "Xavier Yolo Zeus Token Lockup Release Scheduler",
            "XYZ Lockup"
        );
    });

    it("createReleaseSchedule increments the schedulerCount", async function () {
        await releaser.connect(reserveAccount).createReleaseSchedule(2,0,1,1);
        expect(await releaser.scheduleCount()).to.equal(1);
        await releaser.connect(reserveAccount).createReleaseSchedule(2,0,1,1);
        expect(await releaser.scheduleCount()).to.equal(2);
    });

    it("it displays the underlying token's name, symbol and decimals", async () => {
        expect(await releaser.decimals()).to.equal(10)
        expect(await releaser.name()).to.equal("Xavier Yolo Zeus Token Lockup Release Scheduler")
        expect(await releaser.symbol()).to.equal("XYZ Lockup")
    })

    // TODO: Use case tests
    /*
        // 10% immediately and remaining amount over 4 periods of 90 days
        // 50% after 360 day delay and remaining amont over 4 periods of 90 days
        // 30 day delay and then vesting every second for 360 days
        // commencement 6 months ago with 12 periods of 1 month
     */
});
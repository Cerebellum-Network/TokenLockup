const hre = require('hardhat');
const chai = require('chai');
const { expect } = chai;
const { solidity } = require('ethereum-waffle');
chai.use(solidity);

async function currentTimestamp (offsetInSeconds = 0) {
  return (await hre.ethers.provider.getBlock()).timestamp + offsetInSeconds
}

const advanceTime = async (days) => {
  await hre.network.provider.request({
    method: 'evm_increaseTime',
    params: [days * 3600 * 24]
  });

  await hre.network.provider.request({
    method: 'evm_mine',
    params: []
  })
};

function days (numDays) {
  return 60 * 60 * 24 * numDays
}

describe('TokenReleaseScheduler griefing the timelocks', async  () => {
  let releaser, token, reserveAccount, recipient, accounts;
  const decimals = 10;
  const totalSupply = 8e10;

  beforeEach(async () => {
    accounts = await hre.ethers.getSigners();

    reserveAccount = accounts[0];
    recipient = accounts[1];

    const Token = await hre.ethers.getContractFactory('Token');

    token = await Token.deploy(
      'Test Scheduled Release Token',
      'SCHR',
      decimals,
      totalSupply,
      [accounts[0].address],
      [totalSupply]
    );
    const TokenReleaseScheduler = await hre.ethers.getContractFactory('TokenReleaseScheduler');
    releaser = await TokenReleaseScheduler.deploy(
      token.address,
      'Xavier Yolo Zeus Token Lockup Release Scheduler',
      'XYZ Lockup',
      100 // low minimum to force rounding issues
    )
  });

  const iterations = 500;

  it(`populating timelocks with ${iterations} entries`, async () => {
    const totalRecipientAmount = 100;
    const totalBatches = 2;
    const firstDelay = 36000;
    const firstBatchBips = 10; // 8%
    const batchDelay = 3600 * 24 * 4 - 3600; // 4 days
    const commence = await currentTimestamp()

    expect(await releaser.unlockedBalanceOf(recipient.address))
      .to.equal(0);
    expect(await releaser.scheduleCount())
      .to.equal(0);
    await token.connect(reserveAccount).approve(releaser.address, totalSupply);

    await releaser.connect(reserveAccount).createReleaseSchedule(
      totalBatches,
      firstDelay,
      firstBatchBips,
      batchDelay
    );

    for (let i=0; i<iterations; i++) {
      await releaser.connect(reserveAccount).fundReleaseSchedule(
        recipient.address,
        totalRecipientAmount,
        commence,
        0 // scheduleId
      );
    }

    expect(await token.balanceOf(releaser.address))
      .to.equal(totalRecipientAmount * iterations);

    expect(await releaser.unlockedBalanceOf(recipient.address))
      .to.equal(0);

    await advanceTime(5);

    expect(await releaser.unlockedBalanceOf(recipient.address))
      .to.equal(totalRecipientAmount * iterations);
  });
});
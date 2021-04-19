const hre = require('hardhat')
const chai = require('chai')
const { expect } = chai
const { solidity } = require('ethereum-waffle')
chai.use(solidity)

const advanceTime = async (days) => {
  await hre.network.provider.request({
    method: 'evm_increaseTime',
    params: [days * 3600 * 24]
  })
  await hre.network.provider.request({
    method: 'evm_mine',
    params: []
  })
}

describe('TokenReleaseScheduler unlock scheduling', async function () {
  let releaser, token, reserveAccount, recipient
  const decimals = 10
  const totalSupply = 8e9

  beforeEach(async () => {
    const accounts = await hre.ethers.getSigners()

    reserveAccount = accounts[0]
    recipient = accounts[1]

    const Token = await hre.ethers.getContractFactory('Token')

    token = await Token.deploy(
      'Test Scheduled Release Token',
      'SCHR',
      decimals,
      totalSupply,
      [accounts[0].address],
      [totalSupply]
    )
    const TokenReleaseScheduler = await hre.ethers.getContractFactory('TokenReleaseScheduler')
    releaser = await TokenReleaseScheduler.deploy(
      token.address,
      'Xavier Yolo Zeus Token Lockup Release Scheduler',
      'XYZ Lockup',
      100 // low minimum to force rounding issues
    )
  })

  // TODO: Use case tests
  /*
        // 10% immediately and remaining amount over 4 periods of 90 days
        // 50% after 360 day delay and remaining amont over 4 periods of 90 days
        // 30 day delay and then vesting every second for 360 days
        // commencement 6 months ago with 12 periods of 1 month
     */

  it('timelock creation with immediately unlocked tokens', async () => {
    const totalRecipientAmount = 100
    const totalBatches = 3
    const firstDelay = 0
    const firstBatchBips = 800 // 8%
    const batchDelay = 3600 * 24 * 4 // 4 days

    expect(await releaser.unlockedBalanceOf(recipient.address))
      .to.equal(0)
    expect(await releaser.scheduleCount())
      .to.equal(0)
    await token.connect(reserveAccount).approve(releaser.address, totalRecipientAmount)

    await releaser.connect(reserveAccount).createReleaseSchedule(
      totalBatches,
      firstDelay,
      firstBatchBips,
      batchDelay
    )

    await releaser.connect(reserveAccount).fundReleaseSchedule(
      recipient.address,
      totalRecipientAmount,
      Math.floor(Date.now() / 1000) - 3600,
      0 // scheduleId
    )

    expect(await releaser.unlockedBalanceOf(recipient.address))
      .to.equal('8')

    expect(await releaser.lockedBalanceOf(recipient.address))
      .to.equal('92')

    expect(await releaser.balanceOf(recipient.address))
      .to.equal('100')

    await advanceTime('5')

    // firstBatch + ((totalRecipientAmount - firstBatch) / 2)
    // 8 + ((100 - 8) / 2) = 8 + (92 / 2) = 8 + 46 = 54
    expect(await releaser.unlockedBalanceOf(recipient.address))
      .to.equal('54')

    expect(await releaser.lockedBalanceOf(recipient.address))
      .to.equal('46')

    expect(await releaser.balanceOf(recipient.address))
      .to.equal('100')

    await advanceTime('5')

    expect(await releaser.unlockedBalanceOf(recipient.address))
      .to.equal(totalRecipientAmount)
    expect(await releaser.lockedBalanceOf(recipient.address))
      .to.equal('0')

    expect(await releaser.balanceOf(recipient.address))
      .to.equal('100')
  })

  it('balanceOf returns the balance of all locked and unlocked tokens', async () => {
    const totalRecipientAmount = 100
    const totalBatches = 3
    const firstDelay = 0
    const firstBatchBips = 800 // 8%
    const batchDelay = 3600 * 24 * 4 // 4 days

    expect(await releaser.unlockedBalanceOf(recipient.address))
      .to.equal(0)
    expect(await releaser.scheduleCount())
      .to.equal(0)
    await token.connect(reserveAccount).approve(releaser.address, totalRecipientAmount)

    await releaser.connect(reserveAccount).createReleaseSchedule(
      totalBatches,
      firstDelay,
      firstBatchBips,
      batchDelay
    )

    await releaser.connect(reserveAccount).fundReleaseSchedule(
      recipient.address,
      totalRecipientAmount,
      Math.floor(Date.now() / 1000) - 3600,
      0 // scheduleId
    )

    expect(await releaser.unlockedBalanceOf(recipient.address))
      .to.equal('8')

    expect(await releaser.lockedBalanceOf(recipient.address))
      .to.equal('92')

    expect(await releaser.balanceOf(recipient.address))
      .to.equal('100')

    // await releaser.connect(reserveAccount).createReleaseSchedule(
    //   totalBatches,
    //   firstDelay,
    //   firstBatchBips,
    //   batchDelay
    // )
    //
    // expect(await releaser.unlockedBalanceOf(recipient.address))
    //   .to.equal('16')
    //
    // expect(await releaser.lockedBalanceOf(recipient.address))
    //   .to.equal('184')
    //
    // expect(await releaser.balanceOf(recipient.address))
    //   .to.equal('200')
  })
})

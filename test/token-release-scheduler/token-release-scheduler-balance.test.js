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

async function currentTimestamp (offsetInSeconds = 0) {
  return (await hre.ethers.provider.getBlock()).timestamp + offsetInSeconds
}

async function exactlyMoreThanOneDayAgo () {
  return await currentTimestamp(-3601)
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
    const commence = await exactlyMoreThanOneDayAgo()

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
      commence,
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

  it('can return all balance types of locked and unlocked tokens in multiple release schedules', async () => {
    const totalBatches = 3
    const firstDelay = 0
    const firstBatchBips = 800 // 8%
    const batchDelay = 3600 * 24 * 4 // 4 days
    const commence = await exactlyMoreThanOneDayAgo()

    expect(await releaser.unlockedBalanceOf(recipient.address))
      .to.equal(0)
    expect(await releaser.scheduleCount())
      .to.equal(0)
    await token.connect(reserveAccount).approve(releaser.address, 300)

    await releaser.connect(reserveAccount).createReleaseSchedule(
      totalBatches,
      firstDelay,
      firstBatchBips,
      batchDelay
    )

    await releaser.connect(reserveAccount).createReleaseSchedule(
      totalBatches,
      firstDelay,
      firstBatchBips,
      batchDelay
    )

    await releaser.connect(reserveAccount).fundReleaseSchedule(
      recipient.address,
      100,
      commence,
      0 // scheduleId
    )

    await releaser.connect(reserveAccount).fundReleaseSchedule(
      recipient.address,
      200,
      commence,
      1 // scheduleId
    )

    await advanceTime(1)

    expect(await releaser.unlockedBalanceOf(recipient.address))
      .to.equal('24')
    expect(await releaser.unlockedBalanceOfTimelock(recipient.address, 0))
      .to.equal('8')
    expect(await releaser.unlockedBalanceOfTimelock(recipient.address, 1))
      .to.equal('16')

    expect(await releaser.lockedBalanceOf(recipient.address))
      .to.equal('276')
    expect(await releaser.lockedBalanceOfTimelock(recipient.address, 0))
      .to.equal('92')
    expect(await releaser.lockedBalanceOfTimelock(recipient.address, 1))
      .to.equal('184')

    expect(await releaser.balanceOf(recipient.address))
      .to.equal('300')
  })

  it('it can set a schedule to a balance in the past', async () => {
    const totalRecipientAmount = 100
    const totalBatches = 3
    const firstDelay = 0
    const firstBatchBips = 800 // 8%
    const batchDelay = 3600 * 24 * 365 * 200 // 200 years
    const commence = 0 // start of the unix epoch

    expect(await releaser.unlockedBalanceOf(recipient.address))
      .to.equal(0)
    expect(await releaser.scheduleCount())
      .to.equal(0)
    await token.connect(reserveAccount).approve(releaser.address, totalRecipientAmount * 2)

    await releaser.connect(reserveAccount).createReleaseSchedule(
      totalBatches,
      firstDelay,
      firstBatchBips,
      batchDelay
    )

    await releaser.connect(reserveAccount).fundReleaseSchedule(
      recipient.address,
      totalRecipientAmount,
      commence,
      0 // scheduleId
    )

    expect(await releaser.unlockedBalanceOf(recipient.address))
      .to.equal('8')

    expect(await releaser.lockedBalanceOf(recipient.address))
      .to.equal('92')

    expect(await releaser.balanceOf(recipient.address))
      .to.equal('100')

    await releaser.connect(reserveAccount).fundReleaseSchedule(
      recipient.address,
      totalRecipientAmount,
      commence,
      0 // scheduleId
    )

    expect(await releaser.unlockedBalanceOf(recipient.address))
      .to.equal('16')

    expect(await releaser.lockedBalanceOf(recipient.address))
      .to.equal('184')

    expect(await releaser.balanceOf(recipient.address))
      .to.equal('200')
  })
})

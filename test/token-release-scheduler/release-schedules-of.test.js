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

describe('TokenLockup release schedule of', async function () {
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
    const TokenLockup = await hre.ethers.getContractFactory('TokenLockup')
    releaser = await TokenLockup.deploy(
      token.address,
      'Xavier Yolo Zeus Token Lockup Release Scheduler',
      'XYZ Lockup',
      100 // low minimum to force rounding issues
    )
  })

  it('balanceOf returns the balance of all locked and unlocked tokens in multiple release schedules', async () => {
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

    expect(await releaser.lockedBalanceOf(recipient.address))
      .to.equal('276')

    expect(await releaser.balanceOf(recipient.address))
      .to.equal('300')

    const schedule1 = await releaser.viewTimelock(recipient.address, 0)
    expect(schedule1.scheduleId).to.equal(0)
    expect(schedule1.commencementTimestamp).to.equal(commence)
    expect(schedule1.tokensTransferred).to.equal(0)
    expect(schedule1.totalAmount).to.equal(100)

    const schedule2 = await releaser.viewTimelock(recipient.address, 1)
    expect(schedule2.scheduleId).to.equal(1)
    expect(schedule2.tokensTransferred).to.equal(0)
    expect(schedule2.totalAmount).to.equal(200)
  })
})

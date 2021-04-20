const hre = require('hardhat')
const chai = require('chai')
const { expect } = chai
const { solidity } = require('ethereum-waffle')
chai.use(solidity)

// const advanceTime = async (days) => {
//   await hre.network.provider.request({
//     method: 'evm_increaseTime',
//     params: [days * 3600 * 24]
//   })
//   await hre.network.provider.request({
//     method: 'evm_mine',
//     params: []
//   })
// }

async function currentTimestamp (offsetInSeconds = 0) {
  return (await hre.ethers.provider.getBlock()).timestamp + offsetInSeconds
}

async function exactlyMoreThanOneDayAgo () {
  return await currentTimestamp(-3601)
}

describe('TokenReleaseScheduler unlock scheduling', async function () {
  let releaser, token, reserveAccount, recipient, accounts
  const decimals = 10
  const totalSupply = 8e9

  beforeEach(async () => {
    accounts = await hre.ethers.getSigners()

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

  xit('unlocked tokens can be transferred', async () => {
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

    await releaser.connect(recipient).transfer(accounts[2].address, 7)
    const balance = await token.connect(reserveAccount).balanceOf(accounts[2].address)
    expect(balance).to.equal(7)

    expect(await releaser.lockedBalanceOfTimelock(recipient.address, 0))
      .to.equal('92')

    expect(await releaser.unlockedBalanceOfTimelock(recipient.address, 0))
      .to.equal('1')

    expect(await releaser.unlockedBalanceOf(recipient.address))
      .to.equal('1')

    expect(await releaser.balanceOf(recipient.address))
      .to.equal('93')

    expect(await releaser.lockedBalanceOf(recipient.address))
      .to.equal('92')
  })
})

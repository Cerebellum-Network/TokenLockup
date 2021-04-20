const hre = require('hardhat')
const chai = require('chai')
const { expect } = chai
const { solidity } = require('ethereum-waffle')
chai.use(solidity)

async function currentTimestamp (offsetInSeconds = 0) {
  return (await hre.ethers.provider.getBlock()).timestamp + offsetInSeconds
}

async function exactlyMoreThanOneDayAgo () {
  return await currentTimestamp(-3601)
}

describe('TokenReleaseScheduler unlock scheduling', async function () {
  let releaser, token, reserveAccount, recipient, accounts, allowedAccount, allowedAccountRecipient
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
      30 // low minimum to force rounding issues
    )

    const totalRecipientAmount = 100
    const totalBatches = 2
    const firstDelay = 0
    const firstBatchBips = 5000 // 8%
    const batchDelay = 3600 * 24 * 4 // 4 days
    const commence = await exactlyMoreThanOneDayAgo()
    allowedAccount = accounts[3]
    allowedAccountRecipient = accounts[4]

    await token.connect(reserveAccount).approve(releaser.address, totalRecipientAmount)

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
  })

  it('unlocked tokens can be transferred by an approved account with balances from multiple lockups', async () => {
    expect(await releaser.connect(recipient).balanceOf(recipient.address)).to.equal(100)
    expect(await releaser.connect(recipient).allowance(recipient.address, allowedAccount.address)).to.equal(0)

    await releaser.connect(recipient).approve(allowedAccount.address, 7)
    expect(await releaser.connect(recipient).allowance(recipient.address, allowedAccount.address)).to.equal(7)
    await releaser.connect(allowedAccount).transferFrom(recipient.address, allowedAccountRecipient.address, 7)
  })

  it('increaseAllowance and decreaseAllowance work', async () => {
    expect(await releaser.connect(recipient).balanceOf(recipient.address)).to.equal(100)
    expect(await releaser.connect(recipient).allowance(recipient.address, allowedAccount.address)).to.equal(0)

    await releaser.connect(recipient).approve(allowedAccount.address, 7)
    expect(await releaser.connect(recipient).allowance(recipient.address, allowedAccount.address)).to.equal(7)

    await releaser.connect(recipient).increaseAllowance(allowedAccount.address, 5)
    expect(await releaser.connect(recipient).allowance(recipient.address, allowedAccount.address)).to.equal(12)

    await releaser.connect(recipient).decreaseAllowance(allowedAccount.address, 1)
    expect(await releaser.connect(recipient).allowance(recipient.address, allowedAccount.address)).to.equal(11)

    await releaser.connect(allowedAccount).transferFrom(recipient.address, allowedAccountRecipient.address, 11)
  })

  it('cannot transferFrom approved amount that exceeds that locked token amount', async () => {
    expect(await releaser.connect(recipient).balanceOf(recipient.address)).to.equal(100)
    expect(await releaser.connect(recipient).unlockedBalanceOf(recipient.address)).to.equal(50)
    expect(await releaser.connect(recipient).allowance(recipient.address, allowedAccount.address)).to.equal(0)

    await releaser.connect(recipient).approve(allowedAccount.address, 100) // more than unlocked less than balance
    expect(await releaser.connect(recipient).allowance(recipient.address, allowedAccount.address)).to.equal(100)
    let errorMessage
    try {
      await releaser.connect(allowedAccount).transferFrom(recipient.address, allowedAccountRecipient.address, 51)
    } catch (e) {
      errorMessage = e.message
    }
    expect(errorMessage).to.match(/VM Exception.*revert Not enough unlocked tokens to transfer/)
  })
})

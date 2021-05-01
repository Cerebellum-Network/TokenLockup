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

describe('TokenLockup unlock scheduling', async function () {
  let tokenLockup, token, reserveAccount, recipient, accounts
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
    const ScheduleCalc = await hre.ethers.getContractFactory('ScheduleCalc')
    const scheduleCalc = await ScheduleCalc.deploy()
    const TokenLockup = await hre.ethers.getContractFactory('TokenLockup', {
      libraries: {
        ScheduleCalc: scheduleCalc.address
      }
    })
    tokenLockup = await TokenLockup.deploy(
      token.address,
      'Xavier Yolo Zeus Token Lockup Release Scheduler',
      'XYZ Lockup',
      100 // low minimum to force rounding issues
    )
  })

  it('timelock creation with immediately unlocked tokens', async () => {
    const totalRecipientAmount = 100
    const totalBatches = 3
    const firstDelay = 0
    const firstBatchBips = 800 // 8%
    const batchDelay = 3600 * 24 * 4 // 4 days
    const commence = await exactlyMoreThanOneDayAgo()

    expect(await tokenLockup.unlockedBalanceOf(recipient.address))
      .to.equal(0)
    expect(await tokenLockup.scheduleCount())
      .to.equal(0)
    await token.connect(reserveAccount).approve(tokenLockup.address, totalRecipientAmount)

    await tokenLockup.connect(reserveAccount).createReleaseSchedule(
      totalBatches,
      firstDelay,
      firstBatchBips,
      batchDelay
    )

    await tokenLockup.connect(reserveAccount).fundReleaseSchedule(
      recipient.address,
      totalRecipientAmount,
      commence,
      0 // scheduleId
    )

    expect(await tokenLockup.unlockedBalanceOf(recipient.address))
      .to.equal('8')

    expect(await tokenLockup.lockedBalanceOf(recipient.address))
      .to.equal('92')

    expect(await tokenLockup.balanceOf(recipient.address))
      .to.equal('100')

    await advanceTime('5')

    // firstBatch + ((totalRecipientAmount - firstBatch) / 2)
    // 8 + ((100 - 8) / 2) = 8 + (92 / 2) = 8 + 46 = 54
    expect(await tokenLockup.unlockedBalanceOf(recipient.address))
      .to.equal('54')

    expect(await tokenLockup.lockedBalanceOf(recipient.address))
      .to.equal('46')

    expect(await tokenLockup.balanceOf(recipient.address))
      .to.equal('100')

    await advanceTime('5')

    expect(await tokenLockup.unlockedBalanceOf(recipient.address))
      .to.equal(totalRecipientAmount)
    expect(await tokenLockup.lockedBalanceOf(recipient.address))
      .to.equal('0')

    expect(await tokenLockup.balanceOf(recipient.address))
      .to.equal('100')
  })

  it('must have more tokens than there are release periods', async () => {
    const totalRecipientAmount = 100
    const totalBatches = 101
    const firstDelay = 0
    const firstBatchBips = 0 // 8%
    const batchDelay = 1
    const commence = 0

    await token.connect(reserveAccount).approve(tokenLockup.address, totalRecipientAmount)

    await tokenLockup.connect(reserveAccount).createReleaseSchedule(
      totalBatches,
      firstDelay,
      firstBatchBips,
      batchDelay
    )

    let errorMessage
    try {
      await tokenLockup.connect(reserveAccount).fundReleaseSchedule(
        recipient.address,
        totalRecipientAmount,
        commence,
        0 // scheduleId
      )
    } catch (e) {
      errorMessage = e.message
    }

    expect(errorMessage).to.match(/< 1 token per release/)
  })
})

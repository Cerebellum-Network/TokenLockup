const hre = require('hardhat')
const chai = require('chai')
const { expect } = chai
const { solidity } = require('ethereum-waffle')
chai.use(solidity)

async function currentTimestamp (offsetInSeconds = 0) {
  return (await hre.ethers.provider.getBlock()).timestamp + offsetInSeconds
}

describe('TokenLockup get timelock info', async function () {
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

  it('can get timelocks and count of timelocks', async () => {
    const totalRecipientAmount = 1000
    const totalBatches = 3
    const firstDelay = 0
    const firstBatchBips = 800 // 8%
    const batchDelay = 3600 * 24 * 4 // 4 days

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
      490,
      1,
      0 // scheduleId
    )

    await tokenLockup.connect(reserveAccount).fundReleaseSchedule(
      recipient.address,
      510,
      2,
      0 // scheduleId
    )

    expect(await tokenLockup.timelockCountOf(recipient.address)).to.equal(2)
    const timelock0 = await tokenLockup.timelockOf(recipient.address, 0)
    expect(timelock0.scheduleId).to.equal(0)
    expect(timelock0.commencementTimestamp).to.equal(1)
    expect(timelock0.tokensTransferred).to.equal(0)
    expect(timelock0.totalAmount).to.equal(490)

    const timelock1 = await tokenLockup.timelockOf(recipient.address, 1)
    expect(timelock1.scheduleId).to.equal(0)
    expect(timelock1.commencementTimestamp).to.equal(2)
    expect(timelock1.tokensTransferred).to.equal(0)
    expect(timelock1.totalAmount).to.equal(510)
  })

  it('reverts if you ask for non existent timelock id', async () => {
    const totalRecipientAmount = 1000
    const totalBatches = 3
    const firstDelay = 0
    const firstBatchBips = 800 // 8%
    const batchDelay = 3600 * 24 * 4 // 4 days

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
      490,
      1,
      0 // scheduleId
    )

    await tokenLockup.connect(reserveAccount).fundReleaseSchedule(
      recipient.address,
      510,
      2,
      0 // scheduleId
    )

    let errorMessage
    try {
      await tokenLockup.timelockOf(recipient.address, 3)
    } catch (e) {
      errorMessage = e.message
    }
    expect(errorMessage).to.match(/revert/)
  })
})

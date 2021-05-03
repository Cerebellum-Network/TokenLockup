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

describe('TokenLockup burn timelock', async function () {
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

  it('burn timelock', async () => {
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

    expect(await tokenLockup.timelockCountOf(recipient.address)).to.equal(1)

    expect(await tokenLockup.unlockedBalanceOf(recipient.address))
      .to.equal('8')

    expect(await tokenLockup.lockedBalanceOf(recipient.address))
      .to.equal('92')

    expect(await tokenLockup.balanceOf(recipient.address))
      .to.equal('100')

    await tokenLockup.connect(recipient).burn(0, 1)

    expect(await tokenLockup.unlockedBalanceOf(recipient.address))
      .to.equal('0')

    expect(await tokenLockup.lockedBalanceOf(recipient.address))
      .to.equal('0')

    expect(await tokenLockup.balanceOf(recipient.address))
      .to.equal('0')

    expect(await tokenLockup.timelockCountOf(recipient.address)).to.equal(0)
    let errorMessage
    try {
      await tokenLockup.timelockOf(recipient.address, 0)
    } catch (e) {
      errorMessage = e.message
    }
    expect(errorMessage).to.match(/revert/)
  })

  it('can burn multiple timelocks correctly', async () => {
    const totalRecipientAmount = 1000
    const totalBatches = 3
    const firstDelay = 0
    const firstBatchBips = 800 // 8%
    const batchDelay = 3600 * 24 * 4 // 4 days
    const commence = await exactlyMoreThanOneDayAgo()
    const recipient1Address = accounts[1].address
    const recipient2Address = accounts[2].address

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

    // fund 3 schedules for recipient 1
    await tokenLockup.connect(reserveAccount).fundReleaseSchedule(
      recipient1Address,
      100,
      commence,
      0
    )

    await tokenLockup.connect(reserveAccount).fundReleaseSchedule(
      recipient1Address,
      200,
      commence,
      0
    )

    await tokenLockup.connect(reserveAccount).fundReleaseSchedule(
      recipient1Address,
      300,
      commence,
      0
    )

    // fund 1 schedules for recipient 2
    await tokenLockup.connect(reserveAccount).fundReleaseSchedule(
      recipient2Address,
      123,
      commence,
      0
    )

    expect(await tokenLockup.timelockCountOf(recipient1Address)).to.equal(3)
    expect(await tokenLockup.balanceOf(recipient1Address)).to.equal(600)

    expect(await tokenLockup.timelockCountOf(recipient2Address)).to.equal(1)
    expect(await tokenLockup.balanceOf(recipient2Address)).to.equal(123)
    // let timelock = await tokenLockup.timelockOf(recipient1Address,0)

    // burn the middle timelock
    await expect(tokenLockup.connect(accounts[1]).burn(1, 2))
      .to.emit(tokenLockup, 'ScheduleBurned')
      .withArgs(recipient.address, 1)
    expect(await tokenLockup.timelockCountOf(recipient1Address)).to.equal(2)
    expect((await tokenLockup.timelockOf(recipient1Address, 0)).totalAmount).to.equal(100)
    expect((await tokenLockup.timelockOf(recipient1Address, 1)).totalAmount).to.equal(300)
    expect(await tokenLockup.balanceOf(recipient1Address)).to.equal(400)

    // burn the end timelock
    await expect(tokenLockup.connect(accounts[1]).burn(1, 2))
      .to.emit(tokenLockup, 'ScheduleBurned')
      .withArgs(recipient.address, 1)
    expect(await tokenLockup.timelockCountOf(recipient1Address)).to.equal(1)
    expect((await tokenLockup.timelockOf(recipient1Address, 0)).totalAmount).to.equal(100)
    expect(await tokenLockup.balanceOf(recipient1Address)).to.equal(100)

    // burn the last remaining timelock
    await expect(tokenLockup.connect(accounts[1]).burn(0, 1))
      .to.emit(tokenLockup, 'ScheduleBurned')
      .withArgs(recipient.address, 0)
    expect(await tokenLockup.timelockCountOf(recipient1Address)).to.equal(0)
    expect(await tokenLockup.balanceOf(recipient1Address)).to.equal(0)


    expect(await tokenLockup.timelockCountOf(recipient2Address)).to.equal(1)
    expect(await tokenLockup.balanceOf(recipient2Address)).to.equal(123)
  })

  it('cannot burn non existent timelock - raises exception', async () => {
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

    let message
    try {
      await tokenLockup.connect(recipient).burn(1, 2)
    } catch (e) {
      message = e.message
    }

    expect(message).to.match(/No schedule/)

    // balances do not change
    expect(await tokenLockup.unlockedBalanceOf(recipient.address))
      .to.equal('8')

    expect(await tokenLockup.lockedBalanceOf(recipient.address))
      .to.equal('92')

    expect(await tokenLockup.balanceOf(recipient.address))
      .to.equal('100')
  })

  it('must confirm the burn with confirm burn value', async () => {
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

    let message
    try {
      await tokenLockup.connect(recipient).burn(0, 2)
    } catch (e) {
      message = e.message
    }

    expect(message).to.match(/Burn not confirmed/)

    // balances do not change
    expect(await tokenLockup.unlockedBalanceOf(recipient.address))
      .to.equal('8')

    expect(await tokenLockup.lockedBalanceOf(recipient.address))
      .to.equal('92')

    expect(await tokenLockup.balanceOf(recipient.address))
      .to.equal('100')
  })
})

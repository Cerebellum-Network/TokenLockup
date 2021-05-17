const hre = require('hardhat')
const chai = require('chai')
const { expect } = chai
const { solidity } = require('ethereum-waffle')
chai.use(solidity)

const dayinSeconds = 3600

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
  let tokenLockup, token, reserveAccount, recipient, accounts, TokenLockup
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
    TokenLockup = await hre.ethers.getContractFactory('TokenLockup', {
      libraries: {
        ScheduleCalc: scheduleCalc.address
      }
    })
    tokenLockup = await TokenLockup.deploy(
      token.address,
      'Xavier Yolo Zeus Token Lockup Release Scheduler',
      'XYZ Lockup',
      100,
      346896000
    )
  })

  it('fundReleaseRelease schedule emits a ScheduleFunded event', async () => {
    const totalRecipientAmount = 1000
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

    await expect(tokenLockup.connect(reserveAccount).fundReleaseSchedule(
      recipient.address,
      490,
      commence,
      0 // scheduleId
    )).to.emit(tokenLockup, 'ScheduleFunded')
      .withArgs(reserveAccount.address, recipient.address, 0, 490, commence, 0)

    await expect(tokenLockup.connect(reserveAccount).fundReleaseSchedule(
      recipient.address,
      510,
      commence,
      0 // scheduleId
    )).to.emit(tokenLockup, 'ScheduleFunded')
      .withArgs(reserveAccount.address, recipient.address, 0, 510, commence, 1)
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

  it('must have more tokens than minReleaseScheduleAmount', async () => {
    const minReleaseScheduleAmount = 100
    const tokenLockup = await TokenLockup.deploy(
      token.address,
      'Xavier Yolo Zeus Token Lockup Release Scheduler',
      'XYZ Lockup',
      minReleaseScheduleAmount,
      346896000
    )

    const totalRecipientAmount = minReleaseScheduleAmount - 1 // this is below the required amount
    const totalBatches = 1
    const firstDelay = 0
    const firstBatchBips = 100 * 100
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

    expect(errorMessage).to.match(/amount < min funding/)
  })

  it('cannot specify non existent schedule id', async () => {
    const minReleaseScheduleAmount = 100
    const tokenLockup = await TokenLockup.deploy(
      token.address,
      'Xavier Yolo Zeus Token Lockup Release Scheduler',
      'XYZ Lockup',
      minReleaseScheduleAmount,
      346896000
    )

    const totalRecipientAmount = minReleaseScheduleAmount
    const totalBatches = 1
    const firstDelay = 0
    const firstBatchBips = 100 * 100
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
        1 // scheduleId
      )
    } catch (e) {
      errorMessage = e.message
    }

    expect(errorMessage).to.match(/bad scheduleId/)
  })

  it('returns true after fundReleaseSchdule is called', async () => {
    const commence = await exactlyMoreThanOneDayAgo()

    await token.connect(reserveAccount).approve(tokenLockup.address, 200)
    await tokenLockup.connect(reserveAccount).createReleaseSchedule(
      1,
      0,
      100 * 100,
      0
    )

    expect(await tokenLockup.connect(reserveAccount).callStatic.fundReleaseSchedule(
      recipient.address,
      100,
      commence,
      0 // scheduleId
    )).to.equal(true)
  })

  it('cannot specify a commencement time outside of the allowed range', async () => {
    const minReleaseScheduleAmount = 100
    const tokenLockup = await TokenLockup.deploy(
      token.address,
      'Xavier Yolo Zeus Token Lockup Release Scheduler',
      'XYZ Lockup',
      minReleaseScheduleAmount,
      dayinSeconds
    )

    const totalRecipientAmount = minReleaseScheduleAmount
    const totalBatches = 1
    const firstDelay = 0
    const firstBatchBips = 100 * 100
    const batchDelay = 1

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
        exactlyMoreThanOneDayAgo(),
        0 // scheduleId
      )
    } catch (e) {
      errorMessage = e.message
    }

    expect(errorMessage).to.match(/commencement time out of range/)

    let errorMessage2
    try {
      await tokenLockup.connect(reserveAccount).fundReleaseSchedule(
        recipient.address,
        totalRecipientAmount,
        await currentTimestamp(3603), // + 1 day with a little room for time drift
        0 // scheduleId
      )
    } catch (e) {
      errorMessage2 = e.message
    }

    expect(errorMessage2).to.match(/commencement time out of range/)

    await tokenLockup.connect(reserveAccount).fundReleaseSchedule(
      recipient.address,
      totalRecipientAmount,
      await currentTimestamp(), // + 1 day with a little room for time drift
      0 // scheduleId
    )
    expect(await tokenLockup.timelockCountOf(recipient.address)).to.equal(1)
  })

  it('cannot specify a batch delay time outside of the allowed range', async () => {
    const minReleaseScheduleAmount = 100
    const tokenLockup = await TokenLockup.deploy(
      token.address,
      'Xavier Yolo Zeus Token Lockup Release Scheduler',
      'XYZ Lockup',
      minReleaseScheduleAmount,
      dayinSeconds
    )

    const totalRecipientAmount = minReleaseScheduleAmount
    const totalBatches = 1
    const firstDelay = 60 * 60 * 24 + 10 // one day plus 10 seconds
    const firstBatchBips = 100 * 100
    const periodBetweenReleases = 1

    await token.connect(reserveAccount).approve(tokenLockup.address, totalRecipientAmount)

    await tokenLockup.connect(reserveAccount).createReleaseSchedule(
      totalBatches,
      firstDelay,
      firstBatchBips,
      periodBetweenReleases
    )

    let errorMessage2
    try {
      await tokenLockup.connect(reserveAccount).fundReleaseSchedule(
        recipient.address,
        totalRecipientAmount,
        await currentTimestamp(), // commences now but batch delay starts after the 1 day max range
        0 // scheduleId
      )
    } catch (e) {
      errorMessage2 = e.message
    }

    expect(errorMessage2).to.match(/initial release out of range/)
  })
})

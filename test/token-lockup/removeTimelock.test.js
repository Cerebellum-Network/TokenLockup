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

const totalSupply = 8e9

describe('TokenLockup burn timelock', async function () {
  let tokenLockup, token, reserveAccount, recipient, accounts
  const decimals = 10

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

    const TokenLockup = await hre.ethers.getContractFactory('TokenLockup')
    tokenLockup = await TokenLockup.deploy(
      token.address,
      'Xavier Yolo Zeus Token Lockup Release Scheduler',
      'XYZ Lockup',
      100,
      346896000
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

    // check starting values
    expect(await tokenLockup.timelockCountOf(recipient1Address)).to.equal(3)
    expect(await tokenLockup.balanceOf(recipient1Address)).to.equal(600)

    expect(await tokenLockup.timelockCountOf(recipient2Address)).to.equal(1)
    expect(await tokenLockup.balanceOf(recipient2Address)).to.equal(123)
    // let timelock = await tokenLockup.timelockOf(recipient1Address,0)

    // burn the middle timelock
    await expect(tokenLockup.connect(accounts[1]).burn(1, 2))
      .to.emit(tokenLockup, 'TimelockBurned')
      .withArgs(recipient.address, 1)
    expect(await tokenLockup.timelockCountOf(recipient1Address)).to.equal(2)
    expect((await tokenLockup.timelockOf(recipient1Address, 0)).totalAmount).to.equal(100)
    expect((await tokenLockup.timelockOf(recipient1Address, 1)).totalAmount).to.equal(300)
    expect(await tokenLockup.balanceOf(recipient1Address)).to.equal(400)

    // burn the end timelock
    await expect(tokenLockup.connect(accounts[1]).burn(1, 2))
      .to.emit(tokenLockup, 'TimelockBurned')
      .withArgs(recipient.address, 1)
    expect(await tokenLockup.timelockCountOf(recipient1Address)).to.equal(1)
    expect((await tokenLockup.timelockOf(recipient1Address, 0)).totalAmount).to.equal(100)
    expect(await tokenLockup.balanceOf(recipient1Address)).to.equal(100)

    // burn the last remaining timelock
    await expect(tokenLockup.connect(accounts[1]).burn(0, 1))
      .to.emit(tokenLockup, 'TimelockBurned')
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

  it('can burn multiple timelocks with some amounts unlocked', async () => {
    const totalRecipientAmount = 1000
    const totalBatches = 3
    const firstDelay = 0
    const firstBatchBips = 5000 // 50%
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

    expect(await tokenLockup.totalSupply()).to.equal(723)
    // 50% unlocked (truncate remainder)
    expect(await tokenLockup.timelockCountOf(recipient1Address)).to.equal(3)
    expect(await tokenLockup.balanceOf(recipient1Address)).to.equal(600)
    expect(await tokenLockup.unlockedBalanceOf(recipient1Address)).to.equal(300)
    expect(await tokenLockup.lockedBalanceOf(recipient1Address)).to.equal(300)

    // separate accounts timelock that shouldn't be touched
    expect(await tokenLockup.timelockCountOf(recipient2Address)).to.equal(1)
    expect(await tokenLockup.balanceOf(recipient2Address)).to.equal(123)
    expect(await tokenLockup.unlockedBalanceOf(recipient2Address)).to.equal(61)
    expect(await tokenLockup.lockedBalanceOf(recipient2Address)).to.equal(62)

    // burn the middle timelock with 200 tokens in it

    await expect(tokenLockup.connect(accounts[1]).burn(1, 2))
      .to.emit(tokenLockup, 'TimelockBurned')
      .withArgs(recipient.address, 1)

    expect(await tokenLockup.totalSupply()).to.equal(523)
    expect(await tokenLockup.timelockCountOf(recipient1Address)).to.equal(2)
    expect(await tokenLockup.balanceOf(recipient1Address)).to.equal(400)
    expect(await tokenLockup.unlockedBalanceOf(recipient1Address)).to.equal(200)
    expect(await tokenLockup.lockedBalanceOf(recipient1Address)).to.equal(200)

    // there are 50% was unlocked 25% for each of 2 remaining periods
    // advance 1 period so that 75% of the unlocked tokens remain
    await advanceTime(4)
    expect(await tokenLockup.totalSupply()).to.equal(523)
    expect(await tokenLockup.timelockCountOf(recipient1Address)).to.equal(2)
    expect(await tokenLockup.balanceOf(recipient1Address)).to.equal(400)
    expect(await tokenLockup.unlockedBalanceOf(recipient1Address)).to.equal(300)
    expect(await tokenLockup.lockedBalanceOf(recipient1Address)).to.equal(100)

    // transfer to make sure it doesn't borrow values from other transfer locks
    await tokenLockup.connect(accounts[1]).transfer(accounts[4].address, 10)
    expect(await tokenLockup.totalSupply()).to.equal(513)
    expect(await tokenLockup.timelockCountOf(recipient1Address)).to.equal(2)
    expect(await tokenLockup.balanceOf(recipient1Address)).to.equal(390)
    expect(await tokenLockup.unlockedBalanceOf(recipient1Address)).to.equal(290)
    expect(await tokenLockup.lockedBalanceOf(recipient1Address)).to.equal(100)

    // burn the last lockup with 300 tokens leaving the 100 - 10 value lockup
    await expect(tokenLockup.connect(accounts[1]).burn(1, 2))
      .to.emit(tokenLockup, 'TimelockBurned')
      .withArgs(recipient.address, 1)
    expect(await tokenLockup.totalSupply()).to.equal(213)
    expect(await tokenLockup.timelockCountOf(recipient1Address)).to.equal(1)
    expect(await tokenLockup.balanceOf(recipient1Address)).to.equal(90)
    expect(await tokenLockup.unlockedBalanceOf(recipient1Address)).to.equal(65) // unlocked - transferred
    expect(await tokenLockup.lockedBalanceOf(recipient1Address)).to.equal(25)

    // advance time so all are unlocked
    await advanceTime(4)
    expect(await tokenLockup.totalSupply()).to.equal(213)
    expect(await tokenLockup.timelockCountOf(recipient1Address)).to.equal(1)
    expect(await tokenLockup.balanceOf(recipient1Address)).to.equal(90)
    expect(await tokenLockup.unlockedBalanceOf(recipient1Address)).to.equal(90) // unlocked - transferred
    expect(await tokenLockup.lockedBalanceOf(recipient1Address)).to.equal(0)

    // transfer and check again
    await tokenLockup.connect(accounts[1]).transfer(accounts[4].address, 10)
    expect(await tokenLockup.totalSupply()).to.equal(203)
    expect(await tokenLockup.timelockCountOf(recipient1Address)).to.equal(1)
    expect(await tokenLockup.balanceOf(recipient1Address)).to.equal(80)
    expect(await tokenLockup.unlockedBalanceOf(recipient1Address)).to.equal(80) // unlocked - transferred
    expect(await tokenLockup.lockedBalanceOf(recipient1Address)).to.equal(0)

    // burn the last timelock
    await expect(tokenLockup.connect(accounts[1]).burn(0, 1))
      .to.emit(tokenLockup, 'TimelockBurned')
      .withArgs(recipient.address, 0)
    expect(await tokenLockup.timelockCountOf(recipient1Address)).to.equal(0)
    expect(await tokenLockup.balanceOf(recipient1Address)).to.equal(0)
    expect(await tokenLockup.unlockedBalanceOf(recipient1Address)).to.equal(0) // unlocked - transferred
    expect(await tokenLockup.lockedBalanceOf(recipient1Address)).to.equal(0)

    // leaves other timelocks and balances intact
    expect(await tokenLockup.totalSupply()).to.equal(123)
    expect(await tokenLockup.timelockCountOf(recipient2Address)).to.equal(1)
    expect(await tokenLockup.balanceOf(recipient2Address)).to.equal(123)
    expect(await tokenLockup.unlockedBalanceOf(recipient2Address)).to.equal(123) // all unlocked
    expect(await tokenLockup.lockedBalanceOf(recipient2Address)).to.equal(0)

    // token total supply should also have the correct number of tokens burned
    expect(await token.totalSupply()).to.equal(totalSupply - (600 - 10 - 10))
  })

  it('returns true after burn is called successfully', async () => {
    const commence = await exactlyMoreThanOneDayAgo()

    await token.connect(reserveAccount).approve(tokenLockup.address, 200)
    await tokenLockup.connect(reserveAccount).createReleaseSchedule(
      1,
      0,
      100 * 100,
      0
    )
    await tokenLockup.connect(reserveAccount).fundReleaseSchedule(
      recipient.address,
      100,
      commence,
      0 // scheduleId
    )

    expect(await tokenLockup.connect(recipient).callStatic.burn(
      0, 1
    )).to.equal(true)
  })
})

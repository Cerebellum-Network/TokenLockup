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

function days (number) {
  return 60 * 60 * 24 * number
}

async function currentTimestamp (offsetInSeconds = 0) {
  return (await hre.ethers.provider.getBlock()).timestamp + offsetInSeconds
}

describe('TokenLockup calculate unlocked', async function () {
  let tokenLockup, token, reserveAccount, recipientAccount, accounts
  const decimals = 10
  const totalSupply = 100

  beforeEach(async () => {
    accounts = await hre.ethers.getSigners()
    reserveAccount = accounts[0]
    recipientAccount = accounts[1]

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
      50,
      346896000 // 11 years
    )
  })

  it('should emit an event with the correct scheduleId when the release schedule is funded and canceled', async () => {
    const tx = await tokenLockup.connect(reserveAccount).createReleaseSchedule(
      2, // totalBatches
      days(30), // firstDelay
      5000, // firstBatchBips
      days(30) // batchDelay
    )

    const scheduledId = tx.value.toString()
    const amount = 50
    await token.approve(tokenLockup.address, amount * 2)
    const commenced = await currentTimestamp()
    const canceler = accounts[2]

    await expect(tokenLockup.fundReleaseSchedule(
      recipientAccount.address,
      amount,
      commenced,
      scheduledId,
      Array(11).fill(0).map(() => canceler.address)
    )).to.revertedWith('max 10 cancelableBy addressees')

    await expect(tokenLockup.fundReleaseSchedule(recipientAccount.address, amount, commenced, scheduledId, [canceler.address]))
      .to.emit(tokenLockup, 'ScheduleFunded')
      .withArgs(reserveAccount.address, recipientAccount.address, scheduledId, amount, commenced, 0, [canceler.address])

    await expect(tokenLockup.fundReleaseSchedule(recipientAccount.address, amount, commenced, scheduledId, [canceler.address]))
      .to.emit(tokenLockup, 'ScheduleFunded')
      .withArgs(reserveAccount.address, recipientAccount.address, scheduledId, amount, commenced, 1, [canceler.address])

    expect(await tokenLockup.timelockCountOf(recipientAccount.address)).to.equal(2)
    await expect(tokenLockup.cancelTimelock(recipientAccount.address, 0))
      .to.revertedWith('You are not allowed to cancel this timelock')
    await expect(tokenLockup.connect(canceler).cancelTimelock(recipientAccount.address, 0))
      .to.emit(tokenLockup, 'TimelockCanceled')
      .withArgs(
        canceler.address, // canceledBy
        recipientAccount.address, // target
        0, // timelock
        [canceler.address], // reclaim token to
        50, // canceledAmount
        0 // paidAmount
      )

    await expect(tokenLockup.connect(canceler).cancelTimelock(recipientAccount.address, 0))
      .to.revertedWith('Timelock has no value left')
    await expect(tokenLockup.connect(canceler).cancelTimelock(recipientAccount.address, 1))
      .to.emit(tokenLockup, 'TimelockCanceled')
      .withArgs(
        canceler.address, // canceledBy
        recipientAccount.address, // target
        1, // timelock
        [canceler.address], // reclaim token to
        50, // canceledAmount
        0 // paidAmount
      )
  })

  describe('Check cancel timelock after funding with multi cancelable addresses', async () => {
    const cancelerList = []

    beforeEach(async () => {
      cancelerList.push(accounts[0])
      cancelerList.push(accounts[1])
      cancelerList.push(accounts[2])

      const tx = await tokenLockup.connect(reserveAccount).createReleaseSchedule(
        2, // totalBatches
        days(30), // firstDelay
        5000, // firstBatchBips
        days(30) // batchDelay
      )

      const scheduledId = tx.value.toString()
      const amount = 50
      await token.approve(tokenLockup.address, amount * 2)
      const commenced = await currentTimestamp()

      await expect(tokenLockup.fundReleaseSchedule(
        recipientAccount.address,
        amount,
        commenced,
        scheduledId,
        [cancelerList[0].address, cancelerList[1].address, cancelerList[2].address]))
    })

    it('cancel with first canceler', async () => {
      await expect(tokenLockup.connect(cancelerList[0]).cancelTimelock(recipientAccount.address, 0))
        .to.emit(tokenLockup, 'TimelockCanceled')
        .withArgs(
          cancelerList[0].address, // canceledBy
          recipientAccount.address, // target
          0, // timelock
          [cancelerList[0].address, cancelerList[1].address, cancelerList[2].address], // reclaim token to
          50, // canceledAmount
          0 // paidAmount
        )
    })

    it('cancel with second canceler', async () => {
      await expect(tokenLockup.connect(cancelerList[1]).cancelTimelock(recipientAccount.address, 0))
        .to.emit(tokenLockup, 'TimelockCanceled')
        .withArgs(
          cancelerList[1].address, // canceledBy
          recipientAccount.address, // target
          0, // timelock
          [cancelerList[0].address, cancelerList[1].address, cancelerList[2].address], // reclaim token to
          50, // canceledAmount
          0 // paidAmount
        )
    })

    it('cancel with third canceler', async () => {
      await expect(tokenLockup.connect(cancelerList[2]).cancelTimelock(recipientAccount.address, 0))
        .to.emit(tokenLockup, 'TimelockCanceled')
        .withArgs(
          cancelerList[2].address, // canceledBy
          recipientAccount.address, // target
          0, // timelock
          [cancelerList[0].address, cancelerList[1].address, cancelerList[2].address], // reclaim token to
          50, // canceledAmount
          0 // paidAmount
        )
    })

    it('cancel with non canceler reverts', async () => {
      await expect(tokenLockup.connect(accounts[3]).cancelTimelock(recipientAccount.address, 0))
        .to.revertedWith('You are not allowed to cancel this timelock')
    })

    it('timelock index not change after canceling', async () => {
      const [scheduleId, commencement, , totalAmount] = await tokenLockup.connect(recipientAccount).timelockOf(recipientAccount.address, 0)
      const timelockCount = await tokenLockup.connect(accounts[0]).timelockCountOf(recipientAccount.address)

      await tokenLockup.connect(accounts[0]).cancelTimelock(recipientAccount.address, 0)

      // check total timelock count after cancel
      expect(await tokenLockup.connect(accounts[0]).timelockCountOf(recipientAccount.address)).to.equal(timelockCount)

      // check total timelock index has not been changed
      const [canceledScheduleId, canceledCommencement, , canceledTotalAmount] = await tokenLockup.connect(recipientAccount).timelockOf(recipientAccount.address, 0)
      expect(canceledScheduleId).to.equal(scheduleId)
      expect(canceledCommencement).to.equal(commencement)
      expect(canceledTotalAmount).to.equal(totalAmount)
    })
  })

  describe('simple 1 month delay then 50% for 2 monthly releases', async () => {
    let scheduledId, commenced, amount

    beforeEach(async () => {
      const tx = await tokenLockup.connect(reserveAccount).createReleaseSchedule(
        2, // totalBatches
        days(30), // firstDelay
        5000, // firstBatchBips
        days(30) // batchDelay
      )
      scheduledId = tx.value.toString()

      amount = 100
      await token.approve(tokenLockup.address, amount)
      commenced = await currentTimestamp()
      await tokenLockup.fundReleaseSchedule(recipientAccount.address, amount, commenced, scheduledId, [reserveAccount.address])
    })

    it('should be able to check if the lockup is cancelable', async () => {
      const timelock = await tokenLockup.timelockOf(recipientAccount.address, 0)
      expect(timelock.cancelableBy[0]).to.equal(reserveAccount.address)
    })

    it('0% unlocked at start and 100% cancelable', async () => {
      expect(await tokenLockup.lockedBalanceOf(recipientAccount.address)).to.equal(100)
      expect(await tokenLockup.unlockedBalanceOf(recipientAccount.address)).to.equal(0)
      expect(await tokenLockup.balanceOfTimelock(recipientAccount.address, 0)).to.equal(100)
      expect(await token.balanceOf(reserveAccount.address)).to.equal(0)

      await expect(tokenLockup.connect(reserveAccount).cancelTimelock(recipientAccount.address, 0))
        .to.emit(tokenLockup, 'TimelockCanceled')
        .withArgs(
          reserveAccount.address, // canceledBy
          recipientAccount.address, // target
          0, // timelock
          [reserveAccount.address], // reclaim token to
          100, // canceledAmount
          0 // paidAmount
        )
      expect(await token.balanceOf(reserveAccount.address)).to.equal(100)
      expect(await token.balanceOf(recipientAccount.address)).to.equal(0)
      expect(await tokenLockup.lockedBalanceOf(recipientAccount.address)).to.equal(0)
      expect(await tokenLockup.unlockedBalanceOf(recipientAccount.address)).to.equal(0)
      expect(await tokenLockup.balanceOfTimelock(recipientAccount.address, 0)).to.equal(0)
    })

    it('50% unlocked after 1 month', async () => {
      await advanceTime(30)
      expect(await tokenLockup.lockedBalanceOf(recipientAccount.address)).to.equal(50)
      expect(await tokenLockup.unlockedBalanceOf(recipientAccount.address)).to.equal(50)
      expect(await tokenLockup.balanceOfTimelock(recipientAccount.address, 0)).to.equal(100)

      await expect(tokenLockup.connect(reserveAccount).cancelTimelock(recipientAccount.address, 0))
        .to.emit(tokenLockup, 'TimelockCanceled')
        .withArgs(
          reserveAccount.address, // canceledBy
          recipientAccount.address, // target
          0, // timelock
          [reserveAccount.address], // reclaim token to
          50, // canceledAmount
          50 // paidAmount
        )
      expect(await token.balanceOf(reserveAccount.address)).to.equal(50)
      expect(await token.balanceOf(recipientAccount.address)).to.equal(50)
      expect(await tokenLockup.lockedBalanceOf(recipientAccount.address)).to.equal(0)
      expect(await tokenLockup.unlockedBalanceOf(recipientAccount.address)).to.equal(0)
      expect(await tokenLockup.balanceOfTimelock(recipientAccount.address, 0)).to.equal(0)
    })

    it('100% unlocked after 2 months', async () => {
      await advanceTime(60)
      expect(await tokenLockup.lockedBalanceOf(recipientAccount.address)).to.equal(0)
      expect(await tokenLockup.unlockedBalanceOf(recipientAccount.address)).to.equal(100)
      expect(await tokenLockup.balanceOfTimelock(recipientAccount.address, 0)).to.equal(100)

      await expect(tokenLockup.connect(reserveAccount).cancelTimelock(recipientAccount.address, 0))
        .to.revertedWith('Timelock has no value left')
    })

    it('only canceler can cancel', async () => {
      let errorMessage

      try {
        await tokenLockup.connect(accounts[1]).cancelTimelock(recipientAccount.address, 0)
      } catch (e) {
        errorMessage = e.message
      }

      expect(errorMessage).to.match(/You are not allowed to cancel this timelock/)
      expect(await tokenLockup.lockedBalanceOf(recipientAccount.address)).to.equal(100)
      expect(await tokenLockup.unlockedBalanceOf(recipientAccount.address)).to.equal(0)
      expect(await tokenLockup.balanceOfTimelock(recipientAccount.address, 0)).to.equal(100)
      expect(await token.balanceOf(reserveAccount.address)).to.equal(0)
    })

    it('cannot cancel a non existent timelock', async () => {
      let errorMessage

      try {
        await tokenLockup.connect(reserveAccount).cancelTimelock(recipientAccount.address, 1)
      } catch (e) {
        errorMessage = e.message
      }

      expect(errorMessage).to.match(/invalid timelock/)
      expect(await tokenLockup.lockedBalanceOf(recipientAccount.address)).to.equal(100)
      expect(await tokenLockup.unlockedBalanceOf(recipientAccount.address)).to.equal(0)
      expect(await tokenLockup.balanceOfTimelock(recipientAccount.address, 0)).to.equal(100)
      expect(await token.balanceOf(reserveAccount.address)).to.equal(0)
    })
  })
})

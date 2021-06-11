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
      100,
      346896000 // 11 years
    )
  })

  it('should emit an event when the release schedule is funded', async () => {
    const tx = await tokenLockup.connect(reserveAccount).createReleaseSchedule(
      2, // totalBatches
      days(30), // firstDelay
      5000, // firstBatchBips
      days(30) // batchDelay
    )

    const scheduledId = tx.value.toString()
    const amount = 100
    await token.approve(tokenLockup.address, amount)
    const commenced = await currentTimestamp()

    await expect(tokenLockup.fundCancelableReleaseSchedule(recipientAccount.address, amount, commenced, scheduledId))
      .to.emit(tokenLockup, 'ScheduleFunded')
      .withArgs(reserveAccount.address, recipientAccount.address, scheduledId, amount, commenced, 0, true)
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
      await tokenLockup.fundCancelableReleaseSchedule(recipientAccount.address, amount, commenced, scheduledId)
    })

    it('should be able to check if the lockup is cancelable', async () => {
      const timelock = await tokenLockup.timelockOf(recipientAccount.address, 0)
      expect(timelock.cancelableBy).to.equal(reserveAccount.address)
    })

    it('0% unlocked at start and 100% cancelable', async () => {
      expect(await tokenLockup.lockedBalanceOf(recipientAccount.address)).to.equal(100)
      expect(await tokenLockup.unlockedBalanceOf(recipientAccount.address)).to.equal(0)
      expect(await token.balanceOf(reserveAccount.address)).to.equal(0)

      await tokenLockup.cancelTimelock(recipientAccount.address, 0)
      expect(await token.balanceOf(reserveAccount.address)).to.equal(100)
      expect(await token.balanceOf(recipientAccount.address)).to.equal(0)
      expect(await tokenLockup.lockedBalanceOf(recipientAccount.address)).to.equal(0)
      expect(await tokenLockup.unlockedBalanceOf(recipientAccount.address)).to.equal(0)
    })

    it('50% unlocked after 1 month', async () => {
      await advanceTime(30)
      expect(await tokenLockup.lockedBalanceOf(recipientAccount.address)).to.equal(50)
      expect(await tokenLockup.unlockedBalanceOf(recipientAccount.address)).to.equal(50)

      await tokenLockup.cancelTimelock(recipientAccount.address, 0)
      expect(await token.balanceOf(reserveAccount.address)).to.equal(50)
      expect(await token.balanceOf(recipientAccount.address)).to.equal(50)
      expect(await tokenLockup.lockedBalanceOf(recipientAccount.address)).to.equal(0)
      expect(await tokenLockup.unlockedBalanceOf(recipientAccount.address)).to.equal(0)
    })

    it('100% unlocked after 2 months', async () => {
      await advanceTime(60)
      expect(await tokenLockup.lockedBalanceOf(recipientAccount.address)).to.equal(0)
      expect(await tokenLockup.unlockedBalanceOf(recipientAccount.address)).to.equal(100)

      await tokenLockup.cancelTimelock(recipientAccount.address, 0)
      expect(await token.balanceOf(reserveAccount.address)).to.equal(0)
      expect(await token.balanceOf(recipientAccount.address)).to.equal(100)
      expect(await tokenLockup.lockedBalanceOf(recipientAccount.address)).to.equal(0)
      expect(await tokenLockup.unlockedBalanceOf(recipientAccount.address)).to.equal(0)
    })

    it('only funder can cancel', async () => {
      let errorMessage

      try {
        await tokenLockup.connect(recipientAccount).cancelTimelock(recipientAccount.address, 0)
      } catch (e) {
        errorMessage = e.message
      }

      expect(errorMessage).to.match(/only funder can cancel/)
      expect(await tokenLockup.lockedBalanceOf(recipientAccount.address)).to.equal(100)
      expect(await tokenLockup.unlockedBalanceOf(recipientAccount.address)).to.equal(0)
      expect(await token.balanceOf(reserveAccount.address)).to.equal(0)
    })

    it('funder cannot cancel a non existent timelock', async () => {
      let errorMessage

      try {
        await tokenLockup.cancelTimelock(recipientAccount.address, 1)
      } catch (e) {
        errorMessage = e.message
      }

      expect(errorMessage).to.match(/invalid timelock/)
      expect(await tokenLockup.lockedBalanceOf(recipientAccount.address)).to.equal(100)
      expect(await tokenLockup.unlockedBalanceOf(recipientAccount.address)).to.equal(0)
      expect(await token.balanceOf(reserveAccount.address)).to.equal(0)
    })
  })
})

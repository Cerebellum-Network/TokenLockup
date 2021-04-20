const hre = require('hardhat')
const chai = require('chai')
const { expect } = chai
const { solidity } = require('ethereum-waffle')
chai.use(solidity)

function days (numDays) {
  return 60 * 60 * 24 * numDays
}

function months (numMonths) {
  return days(30 * numMonths)
}

// function years (numYears) {
//   return days(365 * numYears)
// }

describe('TokenReleaseScheduler calculate unlocked', async function () {
  let releaser, token, reserveAccount, accounts
  const decimals = 10
  const totalSupply = 8e9

  beforeEach(async () => {
    accounts = await hre.ethers.getSigners()
    reserveAccount = accounts[0]

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

  describe('simple no delay 2 period 50/50', async () => {
    let scheduledId
    const commenced = 0
    const amount = 100

    beforeEach(async () => {
      const tx = await releaser.connect(reserveAccount).createReleaseSchedule(
        2, // totalBatches
        0, // firstDelay
        5000, // firstBatchBips
        months(1) // batchDelay
      )
      scheduledId = tx.value.toString()
    })

    it('50% unlocked at start', async () => {
      const currentTime = commenced

      const unlocked = await releaser.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(50)
    })

    it('100% unlocked after first batch bips', async () => {
      const currentTime = commenced + months(1)

      const unlockedAtStart = await releaser.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlockedAtStart).to.equal(100)
    })
  })

  describe('simple 1 month delay then 2 period 50/50', async () => {
    let scheduledId
    const commenced = 0
    const amount = 100

    beforeEach(async () => {
      const tx = await releaser.connect(reserveAccount).createReleaseSchedule(
        2, // totalBatches
        months(1), // firstDelay
        5000, // firstBatchBips
        months(1) // batchDelay
      )
      scheduledId = tx.value.toString()
    })

    it('0% unlocked at start', async () => {
      const currentTime = commenced

      const unlocked = await releaser.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(0)
    })

    it('0% unlocked 1 second before the initial delay has elapsed', async () => {
      const currentTime = commenced + months(1) - 1

      const unlocked = await releaser.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(0)
    })

    it('50% unlocked after 1 month', async () => {
      const currentTime = commenced + months(1)

      const unlocked = await releaser.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(50)
    })

    it('50% unlocked 1 second before the 2nd final period has elapsed', async () => {
      const currentTime = commenced + months(2) - 1

      const unlocked = await releaser.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(50)
    })

    it('100% unlocked after 2 months', async () => {
      const currentTime = commenced + months(2)

      const unlocked = await releaser.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(100)
    })
  })

  describe('8% after 0 delay then remainder over 3 90 day periods with remainder in last period.', async () => {
    let scheduledId
    const commenced = 0
    const amount = 100

    beforeEach(async () => {
      const tx = await releaser.connect(reserveAccount).createReleaseSchedule(
        4, // totalBatches
        0, // firstDelay
        800, // firstBatchBips
        months(3) // batchDelay
      )
      scheduledId = tx.value.toString()
    })

    it('8% unlocked at start', async () => {
      const currentTime = commenced

      const unlocked = await releaser.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(8)
    })

    it('30 + 8 unlocked after 90 days', async () => {
      const currentTime = commenced + months(3)

      const unlocked = await releaser.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(38)
    })

    it('60 + 8 unlocked after 180 days', async () => {
      const currentTime = commenced + months(6)

      const unlocked = await releaser.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(68)
    })

    it('90 + 8 + remainder = 100 unlocked after 180 days', async () => {
      const currentTime = commenced + months(9)

      const unlocked = await releaser.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(100)
    })
  })



  // TODO: Use case tests
  /*
        // 10% immediately and remaining amount over 4 periods of 90 days
        // 50% after 360 day delay and remaining amont over 4 periods of 90 days
        // 30 day delay and then vesting every second for 360 days
        // commencement 6 months ago with 12 periods of 1 month
     */
})

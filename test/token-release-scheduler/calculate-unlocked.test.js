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
        days(9) // batchDelay
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

  describe('7.7% released immediately and remainder released in equal amounts every 90 days for 360 days' +
    '', async () => {
    let scheduledId
    const commenced = 0
    const amount = 1000

    beforeEach(async () => {
      const tx = await releaser.connect(reserveAccount).createReleaseSchedule(
        5, // totalBatches, initial plus 4 90 day releases
        0, // firstDelay
        770, // firstBatchBips
        months(3) // batchDelay
      )
      scheduledId = tx.value.toString()
    })

    it('77 = 7.7% = 770 bips unlocked at start', async () => {
      const currentTime = commenced

      const unlocked = await releaser.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(77)
    })

    it('307 = 77 + 230(truncated period portion) unlocked after one 90 day period', async () => {
      const currentTime = commenced + months(3)

      const unlocked = await releaser.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(307)
    })

    it('537 = 77 + 230 * 2 periods unlocked after 180 days', async () => {
      const currentTime = commenced + months(6)

      const unlocked = await releaser.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(537)
    })

    it('767 = 77 + 230 * 3 periods unlocked after 270 days', async () => {
      const currentTime = commenced + months(9)

      const unlocked = await releaser.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(767)
    })

    it('1000 = 77 + 230 * 4 + 3(remainder) unlocked after 360 days', async () => {
      const currentTime = commenced + months(12)

      const unlocked = await releaser.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(1000)
    })
  })


  // TODO: Use case tests
  /*
        // 30 day delay and then vesting every second for 360 days
        // commencement 6 months ago with 12 periods of 1 month
     */
})

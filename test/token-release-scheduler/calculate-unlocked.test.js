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

describe('TokenLockup calculate unlocked', async function () {
  let tokenLockup, token, reserveAccount, accounts
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
    const TokenLockup = await hre.ethers.getContractFactory('TokenLockup')
    tokenLockup = await TokenLockup.deploy(
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
      const tx = await tokenLockup.connect(reserveAccount).createReleaseSchedule(
        2, // totalBatches
        0, // firstDelay
        5000, // firstBatchBips
        months(1) // batchDelay
      )
      scheduledId = tx.value.toString()
    })

    it('50% unlocked at start', async () => {
      const currentTime = commenced

      const unlocked = await tokenLockup.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(50)
    })

    it('100% unlocked after first batch bips', async () => {
      const currentTime = commenced + months(1)

      const unlockedAtStart = await tokenLockup.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlockedAtStart).to.equal(100)
    })
  })

  describe('simple 1 month delay then 2 period 50/50', async () => {
    let scheduledId
    const commenced = 0
    const amount = 100

    beforeEach(async () => {
      const tx = await tokenLockup.connect(reserveAccount).createReleaseSchedule(
        2, // totalBatches
        months(1), // firstDelay
        5000, // firstBatchBips
        months(1) // batchDelay
      )
      scheduledId = tx.value.toString()
    })

    it('0% unlocked at start', async () => {
      const currentTime = commenced

      const unlocked = await tokenLockup.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(0)
    })

    it('0% unlocked 1 second before the initial delay has elapsed', async () => {
      const currentTime = commenced + months(1) - 1

      const unlocked = await tokenLockup.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(0)
    })

    it('50% unlocked after 1 month', async () => {
      const currentTime = commenced + months(1)

      const unlocked = await tokenLockup.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(50)
    })

    it('50% unlocked 1 second before the 2nd final period has elapsed', async () => {
      const currentTime = commenced + months(2) - 1

      const unlocked = await tokenLockup.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(50)
    })

    it('100% unlocked after 2 months', async () => {
      const currentTime = commenced + months(2)

      const unlocked = await tokenLockup.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(100)
    })
  })

  describe('8% after 0 delay then remainder over 3 90 day periods with remainder in last period.', async () => {
    let scheduledId
    const commenced = 0
    const amount = 100

    beforeEach(async () => {
      const tx = await tokenLockup.connect(reserveAccount).createReleaseSchedule(
        4, // totalBatches
        0, // firstDelay
        800, // firstBatchBips
        days(90) // batchDelay
      )
      scheduledId = tx.value.toString()
    })

    it('8% unlocked at start', async () => {
      const currentTime = commenced

      const unlocked = await tokenLockup.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(8)
    })

    it('30 + 8 unlocked after 90 days', async () => {
      const currentTime = commenced + months(3)

      const unlocked = await tokenLockup.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(38)
    })

    it('60 + 8 unlocked after 180 days', async () => {
      const currentTime = commenced + months(6)

      const unlocked = await tokenLockup.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(68)
    })

    it('90 + 8 + remainder = 100 unlocked after 180 days', async () => {
      const currentTime = commenced + months(9)

      const unlocked = await tokenLockup.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(100)
    })
  })

  describe('7.7% released immediately and remainder released in equal amounts every 90 days for 360 days', async () => {
    let scheduledId
    const commenced = 0
    const amount = 1000

    beforeEach(async () => {
      const tx = await tokenLockup.connect(reserveAccount).createReleaseSchedule(
        5, // totalBatches, initial plus 4 90 day releases
        0, // firstDelay
        770, // firstBatchBips
        months(3) // batchDelay
      )
      scheduledId = tx.value.toString()
    })

    it('77 = 7.7% = 770 bips unlocked at start', async () => {
      const currentTime = commenced

      const unlocked = await tokenLockup.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(77)
    })

    it('307 = 77 + 230(truncated period portion) unlocked after one 90 day period', async () => {
      const currentTime = commenced + months(3)

      const unlocked = await tokenLockup.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(307)
    })

    it('537 = 77 + 230 * 2 periods unlocked after 180 days', async () => {
      const currentTime = commenced + months(6)

      const unlocked = await tokenLockup.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(537)
    })

    it('767 = 77 + 230 * 3 periods unlocked after 270 days', async () => {
      const currentTime = commenced + months(9)

      const unlocked = await tokenLockup.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(767)
    })

    it('1000 = 77 + 230 * 4 + 3(remainder) unlocked after 360 days', async () => {
      const currentTime = commenced + months(12)

      const unlocked = await tokenLockup.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(1000)
    })
  })

  describe('7.2% released immediately and remainder released in equal amounts every 90 days for 540 days (6 quarters)', async () => {
    let scheduledId
    const commenced = 0
    const amount = 1000

    beforeEach(async () => {
      const tx = await tokenLockup.connect(reserveAccount).createReleaseSchedule(
        7, // totalBatches, initial plus 6 90 day releases
        0, // firstDelay
        720, // firstBatchBips
        days(90) // batchDelay
      )
      scheduledId = tx.value.toString()
    })

    it('72 = 7.2% = 720 bips unlocked at start', async () => {
      const currentTime = commenced

      const unlocked = await tokenLockup.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(72)
    })

    it('226 = 72 + 154(truncated period portion) unlocked after one 90 day period', async () => {
      const currentTime = commenced + days(90)

      const unlocked = await tokenLockup.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(226)
    })

    it('380 = 72 + 154 * 2 periods unlocked after 180 days', async () => {
      const currentTime = commenced + days(180)

      const unlocked = await tokenLockup.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(380)
    })

    it('534 = 72 + 154 * 3 periods unlocked after 270 days', async () => {
      const currentTime = commenced + days(270)

      const unlocked = await tokenLockup.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(534)
    })

    it('688 = 72 + 154 * 4 periods unlocked after 360 days', async () => {
      const currentTime = commenced + days(360)

      const unlocked = await tokenLockup.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(688)
    })

    it('842 = 72 + 154 * 5 periods unlocked after 450 days', async () => {
      const currentTime = commenced + days(450)

      const unlocked = await tokenLockup.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(842)
    })

    it('1000 = 72 + 154 * 6 periods + 4 (remainder) unlocked after 540 days', async () => {
      const currentTime = commenced + days(540)

      const unlocked = await tokenLockup.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(1000)
    })
  })

  describe('continuous vesting per second', async () => {
    let scheduledId
    const commenced = 0
    const numberOfSecondsInYear = 365 * 24 * 60 * 60 // 31,536,000
    const amount = numberOfSecondsInYear // 1 token per second

    beforeEach(async () => {
      const tx = await tokenLockup.connect(reserveAccount).createReleaseSchedule(
        numberOfSecondsInYear, // totalBatches
        0, // firstDelay
        0, // firstBatchBips
        1 // 1 per period
      )
      scheduledId = tx.value.toString()
    })

    it('0 unlocked at start', async () => {
      const currentTime = commenced

      const unlocked = await tokenLockup.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlocked).to.equal(0)
    })

    it('1 token unlocked each second for 1 year (365 days)', async () => {
      expect(await tokenLockup.calculateUnlocked(commenced, 1, amount, scheduledId)).to.equal(1)
      expect(await tokenLockup.calculateUnlocked(commenced, 1e6, amount, scheduledId)).to.equal(1e6)
      expect(await tokenLockup.calculateUnlocked(commenced, 31536000, amount, scheduledId)).to.equal(31536000)
      expect(await tokenLockup.calculateUnlocked(commenced, numberOfSecondsInYear, amount, scheduledId)).to.equal(numberOfSecondsInYear)
      expect(await tokenLockup.calculateUnlocked(commenced, numberOfSecondsInYear + 1, amount, scheduledId)).to.equal(numberOfSecondsInYear)
    })

    it('remainder of tokens delivered in the last period', async () => {
      const remainder = numberOfSecondsInYear - 10 // if get smaller than this javascript rounds for us and the test fails incorrectly
      const amount = numberOfSecondsInYear + remainder
      // expect(await tokenLockup.calculateUnlocked(commenced, 1, amount, scheduledId)).to.equal(1)
      expect(await tokenLockup.calculateUnlocked(commenced, 1e6, amount, scheduledId)).to.equal(1e6)
      expect(await tokenLockup.calculateUnlocked(commenced, numberOfSecondsInYear, amount, scheduledId)).to.equal(amount)
      expect(await tokenLockup.calculateUnlocked(commenced, numberOfSecondsInYear, amount, scheduledId)).to.equal(numberOfSecondsInYear + remainder)
      expect(await tokenLockup.calculateUnlocked(commenced, numberOfSecondsInYear + 1, amount, scheduledId)).to.equal(amount)
    })
  })
})

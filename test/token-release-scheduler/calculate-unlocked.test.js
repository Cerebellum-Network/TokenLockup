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

      const unlockedAtStart = await releaser.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlockedAtStart).to.equal(50)
    })

    it('100% unlocked after first batch bips', async () => {
      const currentTime = commenced + months(1) + 1

      const unlockedAtStart = await releaser.calculateUnlocked(commenced, currentTime, amount, scheduledId)
      expect(unlockedAtStart).to.equal(100)
    })
  })
})

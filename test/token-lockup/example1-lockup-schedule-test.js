const hre = require('hardhat')
const chai = require('chai')
const { expect } = chai
const { solidity } = require('ethereum-waffle')
chai.use(solidity)

describe('test lockup periods for token release example', async function () {
  let tokenLockup, token, reserveAccount
  const decimals = 10
  const totalSupply = 8e9

  beforeEach(async () => {
    const accounts = await hre.ethers.getSigners()

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
      1e4,
      346896000
    )
  })

  it('has the expected release schedules, count and ids', async function () {
    // 0: 7.7% unlocked at distribution, the rest vesting in equal portions every 90 days for 360 days
    let ninetyDaysInSeconds = 60 * 60 * 24 * 90 // 7776000

    await tokenLockup.connect(reserveAccount).createReleaseSchedule(
      5, // release count including initial
      0, // delay till first release
      770, // initial release portion in Bips 100ths of 1%
      ninetyDaysInSeconds // period between releases in seconds
    )

    // 1: 7.2% unlocked at distribution, the rest vesting in equal portions every 90 days for 540 days
    await tokenLockup.connect(reserveAccount).createReleaseSchedule(
      7, // release count including initial
      0, // delay till first release
      720, // initial release portion in Bips 100ths of 1%
      ninetyDaysInSeconds // period between releases in seconds
    )

    // 2: 20% unlocked at distribution, the rest vesting in equal portions every 90 days for 360 days
    await tokenLockup.connect(reserveAccount).createReleaseSchedule(
      5, // release count including initial
      0, // delay till first release
      2000, // initial release portion in Bips 100ths of 1%
      ninetyDaysInSeconds // period between releases in seconds
    )

    // 3: 25% unlocked at distribution, the rest vesting in equal portions every 90 days for 360 days

    await tokenLockup.connect(reserveAccount).createReleaseSchedule(
      5, // release count including initial
      0, // delay till first release
      2500, // initial release portion in Bips 100ths of 1%
      ninetyDaysInSeconds // period between releases in seconds
    )

    expect(await tokenLockup.scheduleCount()).to.equal(4)
  })
})

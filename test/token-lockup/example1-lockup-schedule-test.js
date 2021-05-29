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

function days (numDays) {
  return 60 * 60 * 24 * numDays
}

async function currentTimestamp (offsetInSeconds = 0) {
  return (await hre.ethers.provider.getBlock()).timestamp + offsetInSeconds
}

const createReleaseSchedule = require('../../lib/createReleaseScheduleExample1')

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
    await createReleaseSchedule(hre, reserveAccount, tokenLockup.address)
  })

  it('has the expected release schedules, count and ids', async function () {
    expect(await tokenLockup.scheduleCount()).to.equal(4)

    expect((await tokenLockup.releaseSchedules(0)).releaseCount).to.equal('5')
    expect((await tokenLockup.releaseSchedules(0)).delayUntilFirstReleaseInSeconds).to.equal('0')
    expect((await tokenLockup.releaseSchedules(0)).initialReleasePortionInBips).to.equal('770')
    expect((await tokenLockup.releaseSchedules(0)).periodBetweenReleasesInSeconds).to.equal(days(90))

    expect((await tokenLockup.releaseSchedules(1)).releaseCount).to.equal('7')
    expect((await tokenLockup.releaseSchedules(1)).delayUntilFirstReleaseInSeconds).to.equal('0')
    expect((await tokenLockup.releaseSchedules(1)).initialReleasePortionInBips).to.equal('720')
    expect((await tokenLockup.releaseSchedules(1)).periodBetweenReleasesInSeconds).to.equal(days(90))

    expect((await tokenLockup.releaseSchedules(2)).releaseCount).to.equal('5')
    expect((await tokenLockup.releaseSchedules(2)).delayUntilFirstReleaseInSeconds).to.equal('0')
    expect((await tokenLockup.releaseSchedules(2)).initialReleasePortionInBips).to.equal('2000')
    expect((await tokenLockup.releaseSchedules(2)).periodBetweenReleasesInSeconds).to.equal(days(90))

    expect((await tokenLockup.releaseSchedules(3)).releaseCount).to.equal('5')
    expect((await tokenLockup.releaseSchedules(3)).delayUntilFirstReleaseInSeconds).to.equal('0')
    expect((await tokenLockup.releaseSchedules(3)).initialReleasePortionInBips).to.equal('2500')
    expect((await tokenLockup.releaseSchedules(3)).periodBetweenReleasesInSeconds).to.equal(days(90))
  })

  it("releases tokens on the expected schedules", async () => {

  })
})

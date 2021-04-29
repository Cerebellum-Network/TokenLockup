const hre = require('hardhat')
const chai = require('chai')
const { expect } = chai
const { solidity } = require('ethereum-waffle')
chai.use(solidity)

describe('TokenReleaseScheduler create release schedule', async function () {
  let releaser, token, reserveAccount
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
    const TokenReleaseScheduler = await hre.ethers.getContractFactory('TokenReleaseScheduler')
    releaser = await TokenReleaseScheduler.deploy(
      token.address,
      'Xavier Yolo Zeus Token Lockup Release Scheduler',
      'XYZ Lockup',
      1e4
    )
  })

  it('increments the schedulerCount', async function () {
    await releaser.connect(reserveAccount).createReleaseSchedule(2, 0, 1, 1)
    expect(await releaser.scheduleCount()).to.equal(1)
    await releaser.connect(reserveAccount).createReleaseSchedule(2, 0, 1, 1)
    expect(await releaser.scheduleCount()).to.equal(2)
  })

  it('must have at least 1 release', async function () {
    let error
    try {
      await releaser.connect(reserveAccount).createReleaseSchedule(0, 1, 1, 1)
    } catch (e) {
      error = e
    }

    expect(error.message).to.match(/revert < 1 release/)
  })

  it('if there is one release it must release all tokens', async function () {
    let error
    try {
      await releaser.connect(reserveAccount).createReleaseSchedule(1, 0, 1, 1)
    } catch (e) {
      error = e
    }

    expect(error.message).to.match(/VM Exception.*If there is only one batch, initial release must be 100%/)
  })

  it('if there is one release it can release all tokens on the first batch', async function () {
    const tx = await releaser.connect(reserveAccount).createReleaseSchedule(1, 0, 10000, 1)
    const scheduleId = tx.value.toString()
    expect(scheduleId).to.equal('0')
    const schedule = await releaser.connect(reserveAccount).releaseSchedules(scheduleId)
    expect(schedule.initialReleasePortionInBips).to.equal(10000)
  })

  it('initial release amount cannot exceed 100% (100 00 bips', async function () {
    let error
    try {
      await releaser.connect(reserveAccount).createReleaseSchedule(1, 0, 10001, 1)
    } catch (e) {
      error = e
    }

    expect(error.message).to.match(/Initial release exceeded 100%/)
  })
})

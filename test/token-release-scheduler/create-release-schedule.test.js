const hre = require('hardhat')
const chai = require('chai')
const { expect } = chai
const { solidity } = require('ethereum-waffle')
chai.use(solidity)

// const advanceTime = async (days) => {
//   await hre.network.provider.request({
//     method: 'evm_increaseTime',
//     params: [days * 3600 * 24]
//   })
//   await hre.network.provider.request({
//     method: 'evm_mine',
//     params: []
//   })
// }

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

    expect(error.message).to.match(/VM Exception.*Cannot create an empty schedule/)
  })
})

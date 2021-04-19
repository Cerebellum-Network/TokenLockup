const hre = require('hardhat')
const chai = require('chai')
const { expect } = chai
const { solidity } = require('ethereum-waffle')
chai.use(solidity)

describe('TokenReleaseScheduler deployment test', async () => {
  let token, TokenReleaseScheduler, Token, accounts
  const decimals = 10
  const totalSupply = 8e9

  beforeEach(async () => {
    TokenReleaseScheduler = await hre.ethers.getContractFactory('TokenReleaseScheduler')
    Token = await hre.ethers.getContractFactory('Token')
    accounts = await hre.ethers.getSigners()

    token = await Token.deploy(
      'Test Scheduled Release Token',
      'SCHR',
      decimals,
      totalSupply,
      [accounts[0].address],
      [totalSupply]
    )
  })

  it('expected default deployment configuration', async () => {
    const releaser = await TokenReleaseScheduler.deploy(
      token.address,
      'Xavier Yolo Zeus Token Lockup Release Scheduler',
      'XYZ Lockup',
      1e4
    )

    expect(await releaser.decimals()).to.equal(decimals)
    expect(await releaser.token()).to.equal(token.address)
    expect(await releaser.minReleaseScheduleAmount()).to.equal('10000')
  })
})

const hre = require('hardhat')
const chai = require('chai')
const { expect } = chai
const { solidity } = require('ethereum-waffle')
chai.use(solidity)

describe('TokenLockup deployment test', async () => {
  let token, TokenLockup, Token, accounts
  const decimals = 10
  const totalSupply = 8e9
  const schedulerName = 'Test Scheduled Release Token'
  const schedulerSymbol = 'XYZ Lockup'

  beforeEach(async () => {
    const ScheduleCalc = await hre.ethers.getContractFactory('ScheduleCalc')
    const scheduleCalc = await ScheduleCalc.deploy()
    TokenLockup = await hre.ethers.getContractFactory('TokenLockup', {
      libraries: {
        ScheduleCalc: scheduleCalc.address
      }
    })
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
    const tokenLockup = await TokenLockup.deploy(
      token.address,
      schedulerName,
      schedulerSymbol,
      1e4,
      346896000 // 11 years
    )

    expect(await tokenLockup.name()).to.equal(schedulerName)
    expect(await tokenLockup.symbol()).to.equal(schedulerSymbol)
    expect(await tokenLockup.decimals()).to.equal(decimals)
    expect(await tokenLockup.token()).to.equal(token.address)
    expect(await tokenLockup.minReleaseScheduleAmount()).to.equal('10000')
  })

  it('must deploy with minReleaseScheduleAmount > 0 ', async () => {
    let errorMessage
    try {
      await TokenLockup.deploy(
        token.address,
        schedulerName,
        'XYZ Lockup',
        0,
        346896000
      )
    } catch (e) {
      errorMessage = e.message
    }
    expect(errorMessage).to.match(/Min schedule amount > 0/)
  })
})

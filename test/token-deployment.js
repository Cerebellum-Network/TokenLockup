const hre = require('hardhat')
const { expect } = require('chai')
let accounts, Token, reserveAccount, recipientAccount, decimals, totalSupply
const the0Address = '0x0000000000000000000000000000000000000000'

describe('Token', async () => {
  beforeEach(async () => {
    accounts = await hre.ethers.getSigners()
    Token = await hre.ethers.getContractFactory('Token')
    reserveAccount = accounts[0]
    recipientAccount = accounts[1]
    decimals = 10
    totalSupply = 10000
  })

  it('deploys a token with the expected details', async function () {
    const token = await Token.deploy(
      'Test Scheduled Release Token',
      'SCHR',
      decimals,
      accounts[0].address,
      totalSupply
    )

    expect(await token.name()).to.equal('Test Scheduled Release Token')
    expect(await token.symbol()).to.equal('SCHR')
    expect(await token.decimals()).to.equal(decimals)

    expect(await token.totalSupply()).to.equal(totalSupply)
    expect(await token.balanceOf(reserveAccount.address)).to.equal(totalSupply)
  })

  it('can deploy a token with 0 decimals', async function () {
    decimals = 0

    const token = await Token.deploy(
      'Test Scheduled Release Token',
      'SCHR',
      decimals,
      accounts[0].address,
      totalSupply)

    expect(await token.decimals()).to.equal(0)
    await token.transfer(recipientAccount.address, 1)

    expect(await token.balanceOf(recipientAccount.address)).to.equal(1)
    expect(await token.balanceOf(reserveAccount.address)).to.equal(totalSupply - 1)
  })

  it('cannot mint the reserve to the 0 address', async () => {
    let error

    try {
      await Token.deploy(
        'Test Scheduled Release Token',
        'SCHR',
        decimals,
        the0Address,
        totalSupply)
    } catch (e) {
      error = e
    }

    expect(error).to.be.a('error')
    expect(error.message).to.match(/^VM Exception.*Cannot have a non-address as reserve/)
  })

  it('cannot have a totalSupply of 0', async () => {
    let error

    totalSupply = 0

    try {
      await Token.deploy(
        'Test Scheduled Release Token',
        'SCHR',
        decimals,
        accounts[0].address,
        totalSupply)
    } catch (e) {
      error = e
    }

    expect(error).to.be.a('error')
    expect(error.message).to.match(/^VM Exception.*Cannot have a 0 total supply/)
  })
})

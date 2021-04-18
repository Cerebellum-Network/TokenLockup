const hre = require('hardhat')
const { expect } = require('chai')
let accounts, Token, reserveAccount, recipientAccount, decimals, totalSupply

describe('Token', async function () {
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
})
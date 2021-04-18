const hre = require('hardhat')
const { expect } = require('chai')
let accounts, Token, reserveAccount, recipientAccount, decimals, cap
const the0Address = '0x0000000000000000000000000000000000000000'

describe('Token', async () => {
  beforeEach(async () => {
    accounts = await hre.ethers.getSigners()
    Token = await hre.ethers.getContractFactory('Token')
    reserveAccount = accounts[0]
    recipientAccount = accounts[1]
    decimals = 10
    cap = 10000
  })

  it('deploys a token with the expected details', async () => {
    const token = await Token.deploy(
      'Test Scheduled Release Token',
      'SCHR',
      decimals,
      cap,
      [accounts[0].address],
      [cap]
    )

    expect(await token.name()).to.equal('Test Scheduled Release Token')
    expect(await token.symbol()).to.equal('SCHR')
    expect(await token.decimals()).to.equal(decimals)

    expect(await token.totalSupply()).to.equal(cap)
    expect(await token.balanceOf(reserveAccount.address)).to.equal(cap)
    expect(await token.cap()).to.equal(cap)
  })

  it('can mint to multiple addresses on deploy', async () => {
    const address0 = accounts[0].address
    const address1 = accounts[1].address
    const address2 = accounts[2].address

    const token = await Token.deploy(
      'Test Scheduled Release Token',
      'SCHR',
      decimals,
      33,
      [address0, address1, address2],
      [10, 11, 12]
    )

    expect(await token.totalSupply()).to.equal(33)
    expect(await token.balanceOf(address0)).to.equal(10)
    expect(await token.balanceOf(address1)).to.equal(11)
    expect(await token.balanceOf(address2)).to.equal(12)
  })

  it('can deploy a token with 0 decimals', async function () {
    decimals = 0

    const token = await Token.deploy(
      'Test Scheduled Release Token',
      'SCHR',
      decimals,
      cap,
      [accounts[0].address],
      [cap]
    )

    expect(await token.decimals()).to.equal(0)
    await token.transfer(recipientAccount.address, 1)

    expect(await token.balanceOf(recipientAccount.address)).to.equal(1)
    expect(await token.balanceOf(reserveAccount.address)).to.equal(cap - 1)
  })

  it('cannot mint the reserve to the 0 address', async () => {
    let error

    try {
      await Token.deploy(
        'Test Scheduled Release Token',
        'SCHR',
        decimals,
        cap,
        [the0Address],
        [cap]
      )
    } catch (e) {
      error = e
    }

    expect(error).to.be.a('error')
    expect(error.message).to.match(/^VM Exception.*Cannot have a non-address as reserve/)
  })

  it('cannot mint more than the cap on deploy', async () => {
    let error

    cap = 100

    try {
      await Token.deploy(
        'Test Scheduled Release Token',
        'SCHR',
        decimals,
        cap,
        [accounts[0].address, accounts[1].address],
        [cap, 1]
      )
    } catch (e) {
      error = e
    }

    expect(error).to.be.a('error')
    expect(error.message).to.match(/^VM Exception.*total supply of tokens cannot exceed the cap/)
  })

  it('cannot have a totalSupply of 0', async () => {
    let error

    cap = 0

    try {
      await Token.deploy(
        'Test Scheduled Release Token',
        'SCHR',
        decimals,
        cap,
        [accounts[0].address],
        [cap]
      )
    } catch (e) {
      error = e
    }

    expect(error).to.be.a('error')
    expect(error.message).to.match(/^VM Exception.*Cannot have a 0 total supply/)
  })
})

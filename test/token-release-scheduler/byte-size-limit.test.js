const hre = require('hardhat')
const chai = require('chai')
const { expect } = chai
const { solidity } = require('ethereum-waffle')
chai.use(solidity)

const byteSizeLimit = 24576
async function contractByes (name) {
  const { deployedBytecode } = await hre.artifacts.readArtifact(name)
  return Buffer.from(
    deployedBytecode.replace(/__\$\w*\$__/g, '0'.repeat(40)).slice(2),
    'hex'
  ).length
}

describe('Check size is less than 24576 bytes for smart contract ', async function () {
  it('Token', async () => {
    expect(await contractByes('Token')).to.be.lessThanOrEqual(byteSizeLimit)
  })

  it('TokenLockup', async () => {
    expect(await contractByes('TokenLockup')).to.be.lessThanOrEqual(byteSizeLimit)
  })
})

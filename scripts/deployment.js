// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

/* global decimals, ownerAccount, totalSupply */

const hre = require('hardhat')
const config = hre.network.config
console.log('Deploy Network: ', hre.network.name)
console.log(config.token)

async function main () {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const Token = await hre.ethers.getContractFactory('Token')
  await Token.deploy(
    config.token.name,
    config.token.symbol,
    config.token.decimals,
    config.token.totalSupply,
    config.token.mintAddresses,
    config.token.mintAmounts
  )
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })

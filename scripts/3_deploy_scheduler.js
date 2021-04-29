// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

/* pending lockup contract completion

const hre = require('hardhat')
const config = hre.network.config
const fs = require('fs')
console.log('Deploy Network: ', hre.network.name)
console.log(config.token)

async function main () {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // token release scheduler deployment
  const TokenRelease = await hre.ethers.getContractFactory('TokenLockup')
  const TokenLockupArgs = [
    token.address,
    config.token.name + ' Lockup',
    config.token.symbol + ' Lockup',
    10 * 1e10
  ]
  const release = await TokenRelease.deploy(
    ...TokenLockupArgs,
    {
      gasLimit: 4000000
    })
  console.log('Deployed release at: ', release.address)

  fs.writeFileSync(
    'deployment.json',
    JSON.stringify({
      [hre.network.name.toString()]: {
        tokenLockup: {
          transaction: release.deployTransaction,
          release: release.address
        }
      }
    })
  )

  await release.deployTransaction.wait(5)
  console.log('5 confirmations completed')

  // upload the contracts Etherscan for verification
  await hre.run('verify:verify', {
    address: release.address,
    constructorArguments: TokenLockupArgs
  })
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
*/

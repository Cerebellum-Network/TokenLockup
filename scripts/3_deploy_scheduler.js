// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
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

  const ScheduleCalc = await hre.ethers.getContractFactory('ScheduleCalc')
  const scheduleCalc = await ScheduleCalc.deploy()

  const TokenLockup = await hre.ethers.getContractFactory('TokenLockup', {
    libraries: {
      ScheduleCalc: scheduleCalc.address
    }
  })

  const TokenLockupArgs = [
    // token.address,
    '0xE322488096C36edccE397D179E7b1217353884BB',
    config.token.name + ' Lockup',
    config.token.symbol + ' Lockup',
    10 * 1e10,
    346896000 // 11 years
  ]
  const release = await TokenLockup.deploy(
    ...TokenLockupArgs,
    {
      gasLimit: 4000000
    })
  console.log('Deployed release at: ', release.address)

  await release.deployTransaction.wait(5)
  console.log('5 confirmations completed')

  // upload the contracts Etherscan for verification
  await hre.run('verify:verify', {
    address: release.address,
    constructorArguments: TokenLockupArgs
  })

  await hre.run('verify:verify', {
    address: scheduleCalc.address
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


// pass in the hardhat instance "hre" which has the config file and other definitions
async function create(hre, signerAccount, tokenLockupAddress) {
  const TokenLockupArtifact = await hre.artifacts.readArtifact('TokenLockup')
  const tokenLockup = new hre.ethers.Contract(tokenLockupAddress, TokenLockupArtifact.abi, hre.ethers.provider)

  let ninetyDaysInSeconds = 60 * 60 * 24 * 90 // 7776000

  // 0: 7.7% unlocked at distribution, the rest vesting in equal portions every 90 days for 360 days
  await tokenLockup.connect(signerAccount).createReleaseSchedule(
    5, // release count including initial
    0, // delay till first release
    770, // initial release portion in Bips 100ths of 1%
    ninetyDaysInSeconds // period between releases in seconds
  )

  // 1: 7.2% unlocked at distribution, the rest vesting in equal portions every 90 days for 540 days
  await tokenLockup.connect(signerAccount).createReleaseSchedule(
    7, // release count including initial
    0, // delay till first release
    720, // initial release portion in Bips 100ths of 1%
    ninetyDaysInSeconds // period between releases in seconds
  )

  // 2: 20% unlocked at distribution, the rest vesting in equal portions every 90 days for 360 days
  await tokenLockup.connect(signerAccount).createReleaseSchedule(
    5, // release count including initial
    0, // delay till first release
    2000, // initial release portion in Bips 100ths of 1%
    ninetyDaysInSeconds // period between releases in seconds
  )

  // 3: 25% unlocked at distribution, the rest vesting in equal portions every 90 days for 360 days
  await tokenLockup.connect(signerAccount).createReleaseSchedule(
    5, // release count including initial
    0, // delay till first release
    2500, // initial release portion in Bips 100ths of 1%
    ninetyDaysInSeconds // period between releases in seconds
  )
}


module.exports = create
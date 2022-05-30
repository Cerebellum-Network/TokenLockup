// pass in the hardhat instance "hre" which has the config file and other definitions
async function create (hre, signerAccount, tokenLockupAddress) {
  const TokenLockupArtifact = await hre.artifacts.readArtifact('TokenLockup')
  const tokenLockup = new hre.ethers.Contract(tokenLockupAddress, TokenLockupArtifact.abi, hre.ethers.provider)

  const thirtyDaysInSeconds = 60 * 60 * 24 * 30; // 2592000
  const test_thirtyDaysInSeconds = 60 * 30; // 1800 -- accelerated 1 day into 1 minute.

  // 0: unlocking equal portions every 30 days, 36 times.
  const txn0 = await tokenLockup.connect(signerAccount).createReleaseSchedule(
      36 + 1, // release count including initial
      0, // delay till first release
      0, // initial release portion in Bips 100ths of 1%
      test_thirtyDaysInSeconds // period between releases in seconds
  )
  await txn0.wait(1)
  console.log('created release schedule for Cere Team TEST');

  // 0: unlocking equal portions every 30 minutes, 36 times.
  const txn1 = await tokenLockup.connect(signerAccount).createReleaseSchedule(
      36 + 1, // release count including initial
      0, // delay till first release
      0, // initial release portion in Bips 100ths of 1%
      thirtyDaysInSeconds // period between releases in seconds
  )
  await txn1.wait(1)
  console.log('created release schedule for Cere Team PROD');

  // 0: unlocking equal portions every 30 days, 18 times.
  const txn2 = await tokenLockup.connect(signerAccount).createReleaseSchedule(
      18 + 1, // release count including initial
      0, // delay till first release
      0, // initial release portion in Bips 100ths of 1%
      test_thirtyDaysInSeconds // period between releases in seconds
  )
  await txn2.wait(1)
  console.log('created release schedule for Cere Advisor TEST');

  // 0: unlocking equal portions every 30 minutes, 18 times.
  const txn3 = await tokenLockup.connect(signerAccount).createReleaseSchedule(
      18 + 1, // release count including initial
      0, // delay till first release
      0, // initial release portion in Bips 100ths of 1%
      thirtyDaysInSeconds // period between releases in seconds
  )
  await txn3.wait(1)
  console.log('created release schedule for Cere Advisor PROD');
}

module.exports = create

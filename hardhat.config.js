require('@nomiclabs/hardhat-waffle')
require('solidity-coverage')
require('hardhat-gas-reporter')
require("@nomiclabs/hardhat-etherscan")
require('dotenv').config({ path: '.env' })

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async () => {
  const accounts = await ethers.getSigners()

  for (const account of accounts) {
    console.log(account.address)
  }
})

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

const tenBillionWithTenDecimalPrecision = BigInt('1' + '0'.repeat(10 + 10))
const wallet2Amount2 = BigInt('187500000000000000')
const walletAmount1 = tenBillionWithTenDecimalPrecision - wallet2Amount2

module.exports = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      token: {
        name: 'Token Test XYZ',
        symbol: 'XYZ',
        decimals: 10,
        totalSupply: 100,
        mintAddresses: ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'],
        mintAmounts: [100]
      },
      lockup: {
        minReleaseScheduleAmount: 10 * 1e10 // 10 tokens with 10 decimals
      }
    },
    rinkeby: {
      token: {
        name: 'Xavier Yolo Zeta',
        symbol: 'XYZ',
        decimals: 10,
        totalSupply: tenBillionWithTenDecimalPrecision, // 10B + 10 decimals
        mintAddresses: ['0xdFA017425c938c13ef362544D2662230cC7668eB', '0x421C655a9A40930c10eaD2b479ad529342973E68'],
        mintAmounts: [walletAmount1, wallet2Amount2]
      },
      lockup: {
        minReleaseScheduleAmount: 10 * 1e10 // 10 tokens with 10 decimals
      },
      url: 'https://eth-rinkeby.alchemyapi.io/v2/8ohf9ggpgkO1yfBvfX0sGIyGeVkEEt0T',
      accounts: {
        mnemonic: process.env.RINKEBY
      },
      gas: 4 * 1e6
    },
    kovan: {
      token: {
        name: 'Xavier Yolo Zeta',
        symbol: 'XYZ',
        decimals: 10,
        totalSupply: tenBillionWithTenDecimalPrecision, // 10B + 10 decimals
        mintAddresses: ['0xdFA017425c938c13ef362544D2662230cC7668eB', '0x421C655a9A40930c10eaD2b479ad529342973E68'],
        mintAmounts: [walletAmount1, wallet2Amount2]
      },
      lockup: {
        minReleaseScheduleAmount: 10 * 1e10 // 10 tokens with 10 decimals
      },
      url: 'https://eth-rinkeby.alchemyapi.io/v2/8ohf9ggpgkO1yfBvfX0sGIyGeVkEEt0T',
      accounts: {
        mnemonic: process.env.KOVAN
      },
      gas: 4 * 1e6
    }
  },
  solidity: '0.8.3',
  gasReporter: {
    coinmarketcap: process.env.COIN_MARKET_CAP_API,
    currency: 'USD',
    gasPrice: 120,
    enabled: true
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.ETHERSCAN_API_KEY
  }
}

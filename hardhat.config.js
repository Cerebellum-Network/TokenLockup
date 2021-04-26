require('@nomiclabs/hardhat-waffle')
require('solidity-coverage')
require('hardhat-gas-reporter')
require('@nomiclabs/hardhat-etherscan')
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
        name: 'Xavier Yolo Zeta',
        symbol: 'XYZ',
        decimals: 10,
        totalSupply: tenBillionWithTenDecimalPrecision.toString(), // 10B + 10 decimals
        mintAddresses: ['0xdFA017425c938c13ef362544D2662230cC7668eB', '0x421C655a9A40930c10eaD2b479ad529342973E68'],
        mintAmounts: [walletAmount1.toString(), wallet2Amount2.toString()]
      },
      lockup: {
        minReleaseScheduleAmount: 10 * 1e10 // 10 tokens with 10 decimals
      }
    },
    kovan: {
      token: {
        name: 'Xavier Yolo Zeta',
        symbol: 'XYZ',
        decimals: 10,
        totalSupply: tenBillionWithTenDecimalPrecision.toString(), // 10B + 10 decimals
        mintAddresses: ['0xdFA017425c938c13ef362544D2662230cC7668eB', '0x421C655a9A40930c10eaD2b479ad529342973E68'],
        mintAmounts: [walletAmount1.toString(), wallet2Amount2.toString()]
      },
      lockup: {
        minReleaseScheduleAmount: 10 * 1e10 // 10 tokens with 10 decimals
      },
      url: process.env.KOVAN_NETWORK_URL,
      accounts: {
        mnemonic: process.env.KOVAN
      },
      gas: 4 * 1e6
    },
    mainnet: {
      token: {
        name: 'Xavier Yolo Zeta',
        symbol: 'XYZ',
        decimals: 10,
        totalSupply: tenBillionWithTenDecimalPrecision.toString(), // 10B + 10 decimals
        mintAddresses: ['0xdFA017425c938c13ef362544D2662230cC7668eB', '0x421C655a9A40930c10eaD2b479ad529342973E68'],
        mintAmounts: [walletAmount1.toString(), wallet2Amount2.toString()]
      },
      lockup: {
        minReleaseScheduleAmount: 10 * 1e10 // 10 tokens with 10 decimals
      },
      url: process.env.MAINNET_NETWORK_URL,
      accounts: {
        mnemonic: process.env.MAINNET
      }
    }
  },
  solidity:     {
    version: '0.8.3',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000
      }
    }
  },
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

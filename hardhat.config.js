require('@nomiclabs/hardhat-waffle')
require('solidity-coverage')
require('hardhat-gas-reporter')
require('@nomiclabs/hardhat-etherscan')
// require('hardhat-docgen')
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
const sixYearsInSeconds = 189216000 // 6 years in seconds = 60 seconds * 60 minutes * 24 hours * 365 days * 6 years
const oneHundredTokensWithTenDecimalsPrecision = 100 * 1e10

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
        tokenAddress: null,
        tokenLockupAddress: null,
        minReleaseScheduleAmountInBaseTokens: oneHundredTokensWithTenDecimalsPrecision,
        maxReleaseDelay: sixYearsInSeconds// 10 tokens with 10 decimals
      },
      initialBaseFeePerGas: 0
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
        tokenAddress: null,
        tokenLockupAddress: null,
        minReleaseScheduleAmountInBaseTokens: oneHundredTokensWithTenDecimalsPrecision,
        maxReleaseDelay: sixYearsInSeconds// 10 tokens with 10 decimals
      },
      url: process.env.KOVAN_NETWORK_URL,
      accounts: {
        tokenAddress: null,
        mnemonic: process.env.KOVAN
      },
      gas: 4 * 1e6
    },
    rinkeby: {
      token: {
        name: 'Xavier Yolo Zeta',
        symbol: 'XYZ',
        decimals: 10,
        totalSupply: tenBillionWithTenDecimalPrecision.toString(), // 10B + 10 decimals
        mintAddresses: ['0xdFA017425c938c13ef362544D2662230cC7668eB', '0x421C655a9A40930c10eaD2b479ad529342973E68'],
        mintAmounts: [walletAmount1.toString(), wallet2Amount2.toString()]
      },
      lockup: {
        tokenAddress: '0xE322488096C36edccE397D179E7b1217353884BB',
        tokenLockupAddress: '0x88C31f534D8518E5BF175a7dc18A776EE8a7F4E5',
        minReleaseScheduleAmountInBaseTokens: oneHundredTokensWithTenDecimalsPrecision,
        maxReleaseDelay: sixYearsInSeconds// 10 tokens with 10 decimals
      },
      url: process.env.RINKEBY_NETWORK_URL,
      accounts: {
        mnemonic: process.env.RINKEBY
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
        tokenAddress: '0x2dA719DB753dFA10a62E140f436E1d67F2ddB0d6', // CERE on Ethereum and Polygon.
        tokenLockupAddress: "0x15B363ceb7688a727b8406AED009D70F7704Cd34",
        minReleaseScheduleAmountInBaseTokens: oneHundredTokensWithTenDecimalsPrecision,
        maxReleaseDelay: sixYearsInSeconds// 10 tokens with 10 decimals
      },
      url: process.env.MAINNET_NETWORK_URL,
      accounts: {
        mnemonic: process.env.MAINNET
      }
    },
    mumbai: {
      token: {
        name: 'Xavier Yolo Zeta',
        symbol: 'XYZ',
        decimals: 10,
        totalSupply: tenBillionWithTenDecimalPrecision.toString(), // 10B + 10 decimals
        mintAddresses: ['0x51c5590504251A5993Ba6A46246f87Fa0eaE5897', '0x421C655a9A40930c10eaD2b479ad529342973E68'],
        mintAmounts: [walletAmount1.toString(), wallet2Amount2.toString()]
      },
      lockup: {
        tokenAddress: '0x2b22F523A4a2F46F6A68cF177D617a153A05B845', // Test Token on Mumbai.
        tokenLockupAddress: "0xd32A9D220C56abD1b9d595c91ac380E16D14De15",
        minReleaseScheduleAmountInBaseTokens: oneHundredTokensWithTenDecimalsPrecision,
        maxReleaseDelay: sixYearsInSeconds// 10 tokens with 10 decimals
      },
      url: process.env.MUMBAI_NETWORK_URL,
      accounts: {
        mnemonic: process.env.MUMBAI
      },
      gas: 4 * 1e6
    },
    polygon: {
      token: {
        name: 'CERE Network',
        symbol: 'CERE',
        decimals: 10,
        totalSupply: tenBillionWithTenDecimalPrecision.toString(), // 10B + 10 decimals
        mintAddresses: [],
        mintAmounts: []
      },
      lockup: {
        tokenAddress: '0x2dA719DB753dFA10a62E140f436E1d67F2ddB0d6', // CERE on Ethereum and Polygon.
        tokenLockupAddress: "0x544c8d2aa14262667Ba7516383bA552e98A6cF19",
        minReleaseScheduleAmountInBaseTokens: oneHundredTokensWithTenDecimalsPrecision,
        maxReleaseDelay: sixYearsInSeconds// 10 tokens with 10 decimals
      },
      url: process.env.POLYGON_NETWORK_URL,
      accounts: {
        mnemonic: process.env.POLYGON
      },
      gas: 4 * 1e6
    }
  },
  solidity: {
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
    // gasPrice: 60,
    enabled: true
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  docgen: {
    path: './docs',
    clear: true,
    runOnCompile: true
  }
}

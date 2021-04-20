# Token Release Scheduler

Status: alpha - not feature complete or audited yet

## Overview

This is an Ethereum ERC-20 standard compatible token and scheduled release "vesting" smart contract that:

* Does not have centralized controllers or admin roles to demonstrate strong decentralization and increased trust
* Can enforce a scheduled release of tokens (e.g. investment lockups)
* The maximum number of tokens is minted on deployment and it is not possible exceed this number
* Smart contract enforced lockup schedules are used to control the circulating supply instead of inflationary minting. 
* Allows for burning tokens to reduce supply (e.g. for permanent cross chain transfers to a new blockchain and burning excess reserve tokens to support token price)
* Optimized to decrease the use of gas for the costly transfer schedules
* Defends against hostile attacks using the non centralized lockup period functionality by allowing burning of unwanted lockup period tokens to punish griefing attacks

### At A Glance

| Feature               | Value                                                        |
| --------------------- | ------------------------------------------------------------ |
| Network               | Ethereum / EVM Solidity                                      |
| Protocol              | ERC-20                                                       |
| `mint()`              | no tokens minted ever after deployment                       |
| `freeze()`            | never                                                        |
| `burn()`              | Only from transaction senders own wallet address. No one can burn from someone else's address. |
| Admin Roles           | None                                                         |
| Upgradeable           | No                                                           |
| Transfer Restrictions | None                                                         |
| Additional Functions  | Unlock Schedule related functions                            |
| Griefer Protection    | Minimum locked scheduled token amount slashing               |

# Dev Environment

Clone this repo and `cd` into root. Then:
* `npm install` to setup node libraries
* `npm test` runs all tests and outputs code coverage
* `npm run gas-cost` runs all tests and outputs gas cost for functions (needs a Coinmarket cap private key) 
* `npm run fix` runs the linter and fixes the `standardjs` lint offenses or `npm run lint` to lint without fixing.


# Token Smart Contract

## ERC-20 Token Interface

The token implements the [ERC-20 token standard](https://eips.ethereum.org/EIPS/eip-20) that conforms to this interface:

```solidity
interface IERC20 {
  function totalSupply() external view returns (uint256);

  function balanceOf(address who) external view returns (uint256);

  function allowance(address owner, address spender)
    external view returns (uint256);

  function transfer(address to, uint256 value) external returns (bool);

  function approve(address spender, uint256 value)
    external returns (bool);

  function transferFrom(address from, address to, uint256 value)
    external returns (bool);

  event Transfer(
    address indexed from,
    address indexed to,
    uint256 value
  );

  event Approval(
    address indexed owner,
    address indexed spender,
    uint256 value
  );
}
```

### Use Of Common Extended ERC-20 Token Functions

In addition to the standared ERC-20 functions, the token will implement the extended ERC-20 functions for:

```solidity
function name() public view returns (string memory);
function symbol() public view returns (string memory);
function decimals() public view returns (uint8);
```

### Only Can Call Burn Own Tokens

The burn function can only be applied to the `msg.sender` account. This follows the principle that there are no special contract roles that could burn another token holders tokens.

```solidity
function burn(uint256 amount) public;
```

<div style="page-break-after: always; break-after: page;"></div>

### Only Decreasing Token Supply

All tokens are minted on deployment. `mint()` cannot be called after deployment. This means that the ERC20 totalSupply() can only remain constant or decrease when accounts call `burn()` on their own tokens.

# Scheduled Release Smart Contract

### Lockup Schedules Control Circulating Supply Instead Of Minting

Smart contract enforced lockup schedules are used to control the circulating supply instead of minting. Lockups are applied to investors and other token holders at the time of transferring tokens.

The lockup period implementation lowers gas fees by referring to common release schedule tables and using unlock calculations that do not require updating smart contract state for time dependent lockups.

## Lockup Period Schedules

Lockup period schedules may be configured and funded without a central admin role and from any address. This empowers reserve managers, crowdfunding portals and others to enforce on chain lockup schedules.

```solidity
// DRAFT PSEUDOCODE
contract TokenReleaseScheduler {
  struct ReleaseSchedule {
    uint releaseCount;
    uint delayUntilFirstReleaseInSeconds;
    uint initialReleasePortionInBips;
    uint periodBetweenReleasesInSeconds;
  } 

  mapping(uint => ReleaseSchedule) public releaseSchedules;

  uint scheduleCount;

  function createReleaseSchedule(
      uint releaseCount, // total number of releases including any initial "cliff'
      uint delayUntilFirstReleaseInSeconds, // "cliff" or 0 for immediate relase
      uint initialReleasePortionInBips, // in 100ths of 1%
      uint periodBetweenReleasesInSeconds
    ) public returns (uint unlockScheduleId) {
      // validate unlock totals 100%
      uint scheduleId = scheduleCount++;
      releaseSchedules[scheduleId] = ReleaseSchedule(...);
      return scheduleId;
  }
  
  //...
}
```

### Implementation Details

* The date is in unix timestamp format. The unlock time granularity is intended to be days roughly. The roughly 900 second blocktime variance for Ethereum block timestamp should be expected. However it is not an issued for a time specificity tolernace of roughly days.
* The percentage is stored as 100ths of a percent - bips. The maximum specificity is multiple of 0.0001 represented as uint `1` bip.

## Fund A Release Schedule

A transfer can reference a release schedule by Id and that schedule will be applied.

```solidity
fundReleaseSchedule(
	address to, 
	uint amount,
	uint commencementDate,
	uint scheduleId
)
```


## Example Release Schedule

Create the schedule:

```solidity
// DRAFT PSEUDOCODE

createReleaseSchedule(
	4, // total number of releases including any initial "cliff'
	0, // 0 time delay until first release (immediate release)
	800, // the initial portion released in 100ths of 1%
	90.days // time between releases
)
// returns id 1 after creating the release schedule
```

Create a transfer with the release schedule

```solidity
// DRAFT PSEUDOCODE

transferWithReleaseSchedule(
	recipientAddress
  100, // amount of 100 tokens
	toUnixtimestamp(2021-06-01), // the commencement date unix timestamp
	1 // the schedule id from above
)
```

The tokens can be transfered from the `recipientAddress` with the `transfer()` function on this schedule.

| Release Schedule                                             | Percentage (bips)               | Release # | Amount    |
| ------------------------------------------------------------ | ------------------------------- | --------- | --------- |
| 2021-06-01 (commencementDate <br />+ 0 delayUntilFirstReleaseInSeconds) | 8%                              | 1         | 8         |
| + 90 days                                                    | 30.66%                          | 2         | 30.66     |
| + 180 days                                                   | 30.66%                          | 3         | 30.66     |
| + 270 days                                                   | 30.66% + 0.01 remainder | 4         | 30.67     |
| ***Total***                                                  | ***100%***                      |           | ***100*** |

#### Remainders

In the process of calculating the lockup, some rounding errors may occur. These rounding remainder amounts are typically of very small value with a token between 8 and 18 decimal places. 

To unlock the exact number of tokens needed for the final lockup period in the schedule, the final scheduled amount is for all tokens that have not yet been unlocked in the unlock  schedule.

## Transferring Released Tokens

Transfers can be done with an ERC20 style transfer interface that will transfer all unlocked tokens for all schedules belonging to the message sender.

```solidity
transfer(to, amount)
```

* the `transfer()` and `transferFrom`()  have the standard ERC20 interface to make it easy to use MetaMask and other tooling.
* Lockup periods are checked and enforced for any transfer function call.

## Transfer Lockup Period Enforcement

## Checking Total Balances

Check total locked and unlocked tokens for an address:

```solidity
function balanceOf(address who) external view returns (uint256);
```

Check just the locked tokens for an address:

```solidity
function lockedBalanceOf(address who) external view returns (uint256);
```

Check just the unlocked tokens for an address:

```solidity
function unlockedBalanceOf(address who) external view returns (uint256);
```

Check the total number of tokens stored in the smart contract:

```solidity
function totalSupply() external view returns (uint256);
```

### Specific Release Schedule Balances

Check total locked and unlocked tokens for an address:

```solidity
function viewTimelock(address who, index) external view returns (uint amount, uint scheduleId, uint commencementDate, uint unlockedBalance, uint lockedBalance);
```

## Griefer Protection 

### Minimimum Release Schedule Amount

To avoid increasing computation requirements, gas cost for transfers and exceeding max gas for a transaction, each transferWithRelease schedule amount must be for an amount of tokens `> minReleaseScheduleAmount`.

### Griefer Schedule Slashing

If the account has received an unwanted vesting lockup, recipient can burn the balance and remove the schedule of the `msg.sender` with:

```solidity
burn(scheduleIndex)
```

### Individual Schedule Transfer

To avoid the possibility that a a recipient might have too many release schedules to calculate in the transfer function, individual release schedules can be separately with:

```solidity
transfer(to, amount, scheduleId)
```

## 

## Gas Optimization

To reduce gas fees the schedule is referenced by a single ID. Unlocked tokens are calculated using a formula. This keeps each transfer from requiring it's own vesting schedule data storage and drops the number of SSTORE values from an array of dates and amounts per transaction (`2n SSTORE values) to just an amount, a commencementDate and a scheduleId value (`3` SSTORE values).

Since each SSTORE as of today costs an estimated `$3.45` in ETH. Optimizations could save hundreds of thousands of dollars for vesting schedules with many dates transferred to thousands of people. For example a 1 year monthly vesting schedule with 12 dates would need 3 SSTORE values for the amount and the schedule id (`$10.35) instead of 24 SSTORE values (`$82.80`) for 12 dates and amounts per transaction not including other computation or storage.


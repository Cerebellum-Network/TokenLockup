# Scheduled Release Token

*Draft 2020-04-09 v0.0.1*

## Overview

This is an Ethereum ERC-20 standard compatible token that:

* Does not have centralized controllers or admin roles to demonstrate strong decentralization and increased trust
* Can enforce a scheduled release of tokens (e.g. investment lockups)
* The maximum number of tokens is minted on deployment and it is not possible exceed this number
* Smart contract enforced lockup schedules are used to control the circulating supply instead of inflationary minting. 
* Allows for burning tokens to reduce supply (e.g. for permanent cross chain transfers to a new blockchain and burning excess reserve tokens to support token price)
* Optimized to decrease the use of gas for the costly transfer schedules
* Defends against hostile attacks using the non centralized lockup period functionality by allowing burning of unwanted lockup period tokens to punish griefing attacks



### At A Glance

| Feature | Value				|
| ---------- | ------------ |
| Network | Ethereum / EVM Solidity |
| Protocol | ERC-20 |
| `mint()` | no tokens minted ever after deployment |
| `freeze()` | never |
| `burn()` | Only from transaction senders own wallet address. No one can burn from someone else's address. |
| Admin Roles | None |
| Upgradeable | No |
| Transfer Restrictions | None |
| Additional Functions | Unlock Schedule related functions |
| Griefer Protection | Minimum locked scheduled token amount slashing |

# Smart Contract Interfaces
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

# Lockup Period Interface

### Lockup Schedules Control Circulating Supply Instead Of Minting

Smart contract enforced lockup schedules are used to control the circulating supply instead of minting. Lockups are applied to investors and other token holders at the time of transferring tokens.

The lockup period implementation lowers gas fees by referring to common vesting tables and using unlock calculations that do not require updating smart contract state for time dependent lockups.

## Lockup Period Schedules

Lockup period schedules may be configured without a central admin role from any address. This empowers reserve managers, crowdfunding portals and others to enforce on chain lockup schedules.

```
// DRAFT PSEUDOCODE

struct Unlock {
  uint unlockTimestamp,
  uint unlockPercent
} mapping(uint => Unlock[]) 

public unlockSchedules;

uint scheduleCount;

createUnlockSchedule(Unlock[] unlockSchedule) returns (uint unlockScheduleId) {
  // validate unlock totals 100%
  uint scheduleId = scheduleCount++;
  unlockSchedules[scheduleId] = unlockSchedule;
  return scheduleId;
}
```

## Creating A New Unlock Schedule

Any address can create an unlock schedule.

```
// DRAFT PSEUDOCODE

createUnlockSchedule([
  Unlock(timestamp_1, percent_1),
  Unlock(timestamp_2, percent_2],
  ...
])
```

### This is represented similar to this table:

**Schedule ID: 1**

| Unlock Date (Unix timestamp) | Percentage (bips) |
| ------------------------------------- | ---------- |
| 2021-06-01                            |     8%     |
| 2021-09-01                            |    30.33%    |
| 2021-12-01                            |    30.33%    |
| 2022-02-01                            |    30.33% + any rounding remainder    |

### Implementation Details

* The date is in unix timestamp format. The unlock time granularity is intended to be days roughly. The roughly 900 second blocktime variance for Ethereum block timestamp should be expected. However it is not an issued for a time specificity tolernace of roughly days.
* The percentage is stored as 100ths of a percent - bips. The maximum specificity is multiple of 0.0001 represented as uint `1` bip.

### Unlock Schedule Validation & Griefing Protection

Griefers might use Unlock Schedules as an attack. To avoid this the parameters of the schedule are limited:

* There cannot be more than 60 unlock dates - equivalent to monthly vesting over 5 years.
* The unlock dates cannot be less than 7 days apart to avoid many small unlock periods that interfere with smart contract operation.

### Remainders

In the process of calculating the lockup, some rounding errors may occur. These rounding remainder amounts are typically of very small value with a token between 8 and 18 decimal places. 

To unlock the exact number of tokens needed for the final lockup period in the schedule, the final scheduled amount is for all tokens that have not yet been unlocked in the unlock  schedule.


## Transfer With A Schedule

Any account can transfer tokens to another account with an unlock schedule:

```
transferWithUnlockSchedule(address to, uint amount, uint schedule_id)
```

### Anti Griefing Protection with Schedule Slashing

Anyone can call the `transferWithUnlockSchedule` function. When multiple unlock schedules are applied to the same account this can be the source of an attack ("Griefing").

For example an attacker could apply hundreds of micro value unlock schedules to a recieving account. The recipient account could then have to pay large gas amounts or could exceed the max gas amount possible on the Ethereum network.

Here's how this is prevented using crypto economics to make griefers pay:
* The Transfer Lockup Amount must exceed the `minimumLockupScheduleAmount`. This imposes an economic cost for an attacker to create many griefing lockups.
* The recipient of the locked up tokens can call `burnLockedTokensInSchedule` and tokens in the schedule that are locked will be burned.

These two protections together are equivalent to slashing stake. The sender of the `transferWithUnlockSchedule` is putting the tokens they transfer as part of the schedule at stake. If the recipient feels the tokens sent to them are an attack, they can call `burnLockedTokensInSchedule` to remove the unlock schedule from their account. The minimum token amount makes the tokens that the sender puts at stake a significant amount. This also reduces the total token supply which benefits the total token value in the network.

Also, there cannot be more than `maxTokenSchedules` for any account to avoid overly complex schedule calculations with too high of a calculation cost or array storage requirement.


## Transfer Lockup Period Enforcement

* the `transfer()` and `transferFrom`()  have the standard ERC20 interface to make it easy to use MetaMask and integrate with exchanges.
* Lockup periods are checked and enforced for any transfer function call.
* Unlocked token balances are transferred first to avoid extra calculation gas cost.


## Gas Optimization

To reduce gas fees the schedule is referenced by a single ID. Unlocked tokens are calculated using a formula. This keeps each transfer from requiring it's own vesting schedule data storage and drops the number of SSTORE values from an array of dates and amounts per transaction (`2n + 1` SSTORE values) to just and amount and a schedule value (`2` SSTORE values).

Since each SSTORE as of today costs an estimated `$3.45` in ETH. Optimizations could save hundreds of thousands of dollars for vesting schedules with many dates transferred to thousands of people. For example a 1 year monthly vesting schedule with 12 dates would need 2 SSTORE values for the amount and the schedule id (​`$6.90`) instead of 24 SSTORE values (`$82.80`) for 12 dates and amounts per transaction not including other computation or storage.




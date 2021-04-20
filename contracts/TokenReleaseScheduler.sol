// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract TokenReleaseScheduler {
    ERC20Burnable public token;
    string private _name;
    string private _symbol;

    struct ReleaseSchedule {
        uint releaseCount;
        uint delayUntilFirstReleaseInSeconds;
        uint initialReleasePortionInBips;
        uint periodBetweenReleasesInSeconds;
    }

    ReleaseSchedule[] public releaseSchedules;
    uint public minReleaseScheduleAmount;

    struct Timelock {
        uint scheduleId;
        uint commencementTimestamp;
        uint tokensTransferred;
        uint totalAmount;
    }

    mapping(address => Timelock[]) public timelocks;
    mapping(address => uint) internal _totalTokensUnlocked;
    mapping(address => mapping(address => uint)) internal _allowances;

    event Approval(address indexed from, address indexed spender, uint amount);
    event ScheduleBurned(address indexed from, uint timelockId);
    event TokensUnlocked(address indexed recipient, uint amount);

    /*  The constructor that specifies the token, name and symbol
        The name should specify that it is an unlock contract
        The symbol should end with " Unlock" & be less than 11 characters for MetaMask "custom token" compatibility
    */
    constructor (
        address _token,
        string memory name_,
        string memory symbol_,
        uint _minReleaseScheduleAmount
    ) {
        _name = name_;
        _symbol = symbol_;
        token = ERC20Burnable(_token);

        require(_minReleaseScheduleAmount > token.decimals(), "Min release schedule amount cannot be less than 1 token");
        minReleaseScheduleAmount = _minReleaseScheduleAmount;
    }

    function createReleaseSchedule(
        uint releaseCount, // total number of releases including any initial "cliff'
        uint delayUntilFirstReleaseInSeconds, // "cliff" or 0 for immediate relase
        uint initialReleasePortionInBips, // in 100ths of 1%
        uint periodBetweenReleasesInSeconds
    )
    external
    returns
    (
        uint unlockScheduleId
    ) {
        require(releaseCount >= 1, "Cannot create an empty schedule");
        require(initialReleasePortionInBips <= 1e4, "Cannot have an initial release in excess of 100%");
        if (releaseCount > 1) {
            require(periodBetweenReleasesInSeconds > 0, "Cannot have multiple periods with 0 time distance");
        }
        if (releaseCount == 1) {
            require(initialReleasePortionInBips == 1e4, "If there is only one batch, initial release must be 100%");
        }

        releaseSchedules.push(ReleaseSchedule(
                releaseCount,
                delayUntilFirstReleaseInSeconds,
                initialReleasePortionInBips,
                periodBetweenReleasesInSeconds
            ));

        // returning the index of the newly added schedule
        return releaseSchedules.length - 1;
    }

    function fundReleaseSchedule(
        address to,
        uint amount,
        uint commencementTimestamp, // unix timestamp
        uint scheduleId
    ) external {
        require(amount >= minReleaseScheduleAmount, "Cannot fund a release schedule with this few tokens");
        require(scheduleId < releaseSchedules.length, "Schedule id is out of bounds");

        // It will revert via ERC20 implementation if there's no allowance
        token.transferFrom(msg.sender, address(this), amount);

        Timelock memory timelock;
        timelock.scheduleId = scheduleId;
        timelock.commencementTimestamp = commencementTimestamp;
        timelock.totalAmount = amount;

        timelocks[to].push(timelock);
    }


    function lockedBalanceOf(address who) public view returns (uint amount) {
        for (uint i = 0; i < timelocks[who].length; i++) {
            amount += lockedBalanceOfTimelock(who, i);
        }
        return amount;
    }

    function unlockedBalanceOf(address who) public view returns (uint amount) {
        for (uint i = 0; i < timelocks[who].length; i++) {
            amount += unlockedBalanceOfTimelock(who, i);
        }
        return amount;
    }

    function lockedBalanceOfTimelock(address who, uint timelockIndex) public view returns (uint locked) {
        return timelocks[who][timelockIndex].totalAmount - totalUnlockedToDateOfTimelock(who, timelockIndex);
    }

    function unlockedBalanceOfTimelock(address who, uint timelockIndex) public view returns (uint unlocked) {
        return totalUnlockedToDateOfTimelock(who, timelockIndex) - timelocks[who][timelockIndex].tokensTransferred;
    }

    function totalUnlockedToDateOfTimelock(address who, uint timelockIndex) public view returns (uint unlocked) {
        return calculateUnlocked(
            timelocks[who][timelockIndex].commencementTimestamp,
            block.timestamp,
            timelocks[who][timelockIndex].totalAmount,
            timelocks[who][timelockIndex].scheduleId
        );
    }


    function viewTimelock(address who, uint256 index) public view
    returns (Timelock memory timelock) {
        return timelocks[who][index];
    }

    function balanceOf(address who) external view returns (uint) {
        return unlockedBalanceOf(who) + lockedBalanceOf(who);
    }

    function transfer(address to, uint value) external returns (bool) {
        return _transfer(msg.sender, to, value);
    }

    function transferFrom(address from, address to, uint value) external returns (bool) {
        require(_allowances[from][msg.sender] >= value, "Insufficient allowance to transferFrom");
        _allowances[from][msg.sender] -= value;
        return _transfer(from, to, value);
    }

    // Code from OpenZeppelin's contract/token/ERC20/ERC20.sol, modified
    function approve(address spender, uint amount) external returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    // Code from OpenZeppelin's contract/token/ERC20/ERC20.sol, modified
    function allowance(address owner, address spender) public view returns (uint256) {
        return _allowances[owner][spender];
    }

    // Code from OpenZeppelin's contract/token/ERC20/ERC20.sol, modified
    function increaseAllowance(address spender, uint addedValue) external returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender] + addedValue);
        return true;
    }

    // Code from OpenZeppelin's contract/token/ERC20/ERC20.sol, modified
    function decreaseAllowance(address spender, uint subtractedValue) external returns (bool) {
        uint currentAllowance = _allowances[msg.sender][spender];
        require(currentAllowance >= subtractedValue, "Decreased allowance below zero");
        _approve(msg.sender, spender, _allowances[msg.sender][spender] - subtractedValue);
        return true;
    }

    function decimals() public view returns (uint8) {
        return token.decimals();
    }

    function name() public view returns (string memory) {
        return _name;
    }

    function symbol() public view returns (string memory) {
        return _symbol;
    }

    function totalSupply() external view returns (uint) {
        return token.balanceOf(address(this));
    }

    function burn(uint timelockIndex, uint confirmationIdPlusOne) public {
        require(timelockIndex < timelocks[msg.sender].length, "No such schedule");

        // this also protects from overflow below
        require(confirmationIdPlusOne == timelockIndex + 1, "A burn wasn't confirmed");

        // actually burning the remaining tokens from the unlock
        token.burn(lockedBalanceOfTimelock(msg.sender, timelockIndex) + unlockedBalanceOfTimelock(msg.sender, timelockIndex));

        removeTimelock(msg.sender, timelockIndex);
        emit ScheduleBurned(msg.sender, timelockIndex);
    }

    function _transfer(address from, address to, uint value) internal returns (bool) {
        require(unlockedBalanceOf(from) >= value, "Not enough unlocked tokens to transfer");

        uint remainingTransfer = value;

        // transfer from unlocked tokens
        for (uint i = 0; i < timelocks[from].length; i++) {
            // if the remainingTransfer is more than the unlocked balance use it all
            if (remainingTransfer > unlockedBalanceOfTimelock(from, i)) {
                remainingTransfer -= unlockedBalanceOfTimelock(from, i);
                timelocks[from][i].tokensTransferred += unlockedBalanceOfTimelock(from, i);
                // if the remainingTransfer is less than or equal to the unlocked balance
                // use part or all and exit the loop
            } else if (remainingTransfer <= unlockedBalanceOfTimelock(from, i)) {
                timelocks[from][i].tokensTransferred += remainingTransfer;
                remainingTransfer = 0;
                break;
            }
        }

        require(remainingTransfer == 0, "bad transfer");
        // this should never happen
        token.transfer(to, value);
        return true;
    }

    function calculateUnlocked(uint commencedTimestamp, uint currentTimestamp, uint amount, uint scheduleId) public view returns (uint unlocked) {
        uint secondsElapsed = currentTimestamp - commencedTimestamp;

        // return the full amount if the total lockup period has expired
        // unlocked amounts in each period are truncated and round down remainders smaller than the smallest unit
        // unlocking the full amount unlocks any remainder amounts in the final unlock period
        // this is done first to reduce computation
        if (secondsElapsed >= releaseSchedules[scheduleId].delayUntilFirstReleaseInSeconds +
        (releaseSchedules[scheduleId].periodBetweenReleasesInSeconds * (releaseSchedules[scheduleId].releaseCount - 1))) {
            return amount;
        }

        // unlock the initial release if the delay has elapsed
        if (secondsElapsed >= releaseSchedules[scheduleId].delayUntilFirstReleaseInSeconds) {
            unlocked += (amount * releaseSchedules[scheduleId].initialReleasePortionInBips) / 1e4;

            // if at least one period after the delay has passed
            if (secondsElapsed - releaseSchedules[scheduleId].delayUntilFirstReleaseInSeconds
                >= releaseSchedules[scheduleId].periodBetweenReleasesInSeconds) {

                // calculate the number of additional periods that have passed (not including the initial release)
                // this discards any remainders (ie it truncates / rounds down)
                uint additionalPeriods =
                (secondsElapsed - releaseSchedules[scheduleId].delayUntilFirstReleaseInSeconds) /
                releaseSchedules[scheduleId].periodBetweenReleasesInSeconds;

                // unlocked includes the number of additionalPeriods elapsed, times the evenly distributed remaining amount
                unlocked += additionalPeriods * ((amount - unlocked) / (releaseSchedules[scheduleId].releaseCount - 1));
            }
        }

        return unlocked;
    }

    function removeTimelock(address recipient, uint releaseIndex) internal {
        // If the timelock to remove is the last one, just pop it, otherwise move the last one over the one to remove
        if (timelocks[recipient].length - 1 == releaseIndex) {
            timelocks[recipient][releaseIndex] = timelocks[recipient][timelocks[recipient].length - 1];
        }
        timelocks[recipient].pop();
    }

    // Code from OpenZeppelin's contract/token/ERC20/ERC20.sol, modified
    function _approve(address owner, address spender, uint amount) internal {
        require(owner != address(0), "Approve from the zero address");
        require(spender != address(0), "Approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function scheduleCount() external view returns (uint count) {
        return releaseSchedules.length;
    }
}
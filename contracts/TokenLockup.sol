// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ScheduleCalc.sol";

// interface with ERC20 and the burn function interface from the associated Token contract
interface IERC20Burnable is IERC20 {
    function burn(uint256 amount) external;

    function decimals() external view returns (uint8);
}

contract TokenLockup {
    IERC20Burnable public token;
    string private _name;
    string private _symbol;

    ReleaseSchedule[] public releaseSchedules;
    uint public minReleaseScheduleAmount;

    mapping(address => Timelock[]) public timelocks;
    mapping(address => uint) internal _totalTokensUnlocked;
    mapping(address => mapping(address => uint)) internal _allowances;

    event Approval(address indexed from, address indexed spender, uint amount);
    event TimelockBurned(address indexed from, uint timelockId);

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
        token = IERC20Burnable(_token);

        require(_minReleaseScheduleAmount > 0, "Min schedule amount > 0");
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
        require(releaseCount >= 1, "< 1 release");
        require(initialReleasePortionInBips <= 1e4, "release > 100%");
        if (releaseCount > 1) {
            require(periodBetweenReleasesInSeconds > 0, "period = 0");
        }
        if (releaseCount == 1) {
            require(initialReleasePortionInBips == 1e4, "released < 100%");
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
    ) public {
        require(amount >= minReleaseScheduleAmount, "amount < min funding");
        require(to != address(0), "to 0 address");
        require(scheduleId < releaseSchedules.length, "bad scheduleId");
        require(amount >= releaseSchedules[scheduleId].releaseCount, "< 1 token per release");

        // It will revert via ERC20 implementation if there's no allowance
        token.transferFrom(msg.sender, address(this), amount);

        Timelock memory timelock;
        timelock.scheduleId = scheduleId;
        timelock.commencementTimestamp = commencementTimestamp;
        timelock.totalAmount = amount;

        timelocks[to].push(timelock);
    }

    function batchFundReleaseSchedule(
        address[] memory recipients,
        uint[] memory amounts,
        uint[] memory commencementTimestamps, // unix timestamp
        uint[] memory scheduleIds
    ) external returns (bool) {
        require(amounts.length == recipients.length, "mismatched array length");
        for (uint i; i < recipients.length; i++) {
            fundReleaseSchedule(recipients[i], amounts[i], commencementTimestamps[i], scheduleIds[i]);
        }

        return true;
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
        require(_allowances[from][msg.sender] >= value, "value > allowance");
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
        require(currentAllowance >= subtractedValue, "decrease > allowance");
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
        require(timelockIndex < timelocks[msg.sender].length, "No schedule");

        // this also protects from overflow below
        require(confirmationIdPlusOne == timelockIndex + 1, "Burn not confirmed");

        // actually burning the remaining tokens from the unlock
        token.burn(lockedBalanceOfTimelock(msg.sender, timelockIndex) + unlockedBalanceOfTimelock(msg.sender, timelockIndex));

        // overwrite the timelock to delete with the timelock on the end which will be discarded
        // if the timelock to delete is on the end, it will just be deleted in the step after the if statement
        if (timelocks[msg.sender].length - 1 != timelockIndex) {
            timelocks[msg.sender][timelockIndex] = timelocks[msg.sender][timelocks[msg.sender].length - 1];
        }
        // delete the timelock on the end
        timelocks[msg.sender].pop();

        emit TimelockBurned(msg.sender, timelockIndex);
    }

    function _transfer(address from, address to, uint value) internal returns (bool) {
        require(unlockedBalanceOf(from) >= value, "amount > unlocked");

        uint remainingTransfer = value;

        // transfer from unlocked tokens
        for (uint i = 0; i < timelocks[from].length; i++) {
            // if the timelock has no value left
            if (timelocks[from][i].tokensTransferred == timelocks[from][i].totalAmount) {
                continue;
            } else if (remainingTransfer > unlockedBalanceOfTimelock(from, i)) {
                // if the remainingTransfer is more than the unlocked balance use it all
                remainingTransfer -= unlockedBalanceOfTimelock(from, i);
                timelocks[from][i].tokensTransferred += unlockedBalanceOfTimelock(from, i);
            } else {
                // if the remainingTransfer is less than or equal to the unlocked balance
                // use part or all and exit the loop
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

    function transferTimelock(address to, uint value, uint timelockId) public returns (bool) {
        require(unlockedBalanceOfTimelock(msg.sender, timelockId) >= value, "amount > unlocked");
        timelocks[msg.sender][timelockId].tokensTransferred += value;
        token.transfer(to, value);
        return true;
        // TODO: test return value
    }

    function calculateUnlocked(uint commencedTimestamp, uint currentTimestamp, uint amount, uint scheduleId) public view returns (uint unlocked) {
        return ScheduleCalc.calculateUnlocked(commencedTimestamp, currentTimestamp, amount, releaseSchedules[scheduleId]);
    }

    // Code from OpenZeppelin's contract/token/ERC20/ERC20.sol, modified
    function _approve(address owner, address spender, uint amount) internal {
        require(owner != address(0));
        require(spender != address(0), "spender is 0 address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function scheduleCount() external view returns (uint count) {
        return releaseSchedules.length;
    }

    function timelockOf(address who, uint index) public view returns (Timelock memory timelock) {
        return timelocks[who][index];
    }

    function timelockCountOf(address who) public view returns (uint) {
        return timelocks[who].length;
    }
}
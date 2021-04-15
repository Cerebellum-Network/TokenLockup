// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
//import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
//import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

contract TokenReleaseScheduler {
    // TODO: explore using SafeERC20
    //    using SafeERC20 for IERC20;

    ERC20 public token;
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
        uint releasesDone;
        uint tokensRemaining;
    }

    mapping(address => Timelock[]) public timelocks;
    mapping(address => uint) internal _totalTokensUnlocked;
    mapping (address => mapping (address => uint)) internal _allowances;

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
        token = ERC20(_token);

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
        uint commencementDate, // 0 to start "now", otherwise no farther than 1 day in the past
        uint scheduleId
    ) external {
        require(amount >= minReleaseScheduleAmount, "Cannot fund a release schedule with this few tokens");
        if (commencementDate != 0) {
            require(commencementDate >= block.timestamp - 1 days, "Cannot be more than 1 day in the past");
        }
        require(scheduleId < releaseSchedules.length, "Schedule id is out of bounds");

        // It will revert via ERC20 implementation if there's no allowance
        token.transferFrom(msg.sender, address(this), amount);

        timelocks[to].push(
            Timelock(
                scheduleId,
                commencementDate,
                0, // 0 unlocks finished
                amount
            )
        );
    }


    // TODO: conveniance method that makes it unecessary to call approve before fundReleaseSchedule?

    function lockedBalanceOf(address who) external view returns (uint amount) {
        amount = 0;
        for (uint i=0; i<timelocks[who].length; i++) {
            (, uint unlock) = _calculateReleaseUnlock(who, i);
            amount += timelocks[who][i].tokensRemaining - unlock;
        }
        return amount;
    }

    function unlockedBalanceOf(address who) public view returns (uint amount) {
        amount = 0;
        for (uint i=0; i<timelocks[who].length; i++) {
            (, uint unlock) = _calculateReleaseUnlock(who, i);
            amount += unlock;
        }
        return amount;
    }

    // TODO: check locked and unlocked balances
    /*
    function totalSupply() external view returns (uint);


    function releaseSchedulesOf(address who, index) external view
        returns (uint amount, uint scheduleId, uint commencementDate, uint unlockedBalance, uint lockedBalance);
    */


    // TODO: ERC20 interface functions for easy MetaMask and Etherscan tooling compatibility
    /*
    */
    function balanceOf(address who) external view returns (uint) {
        return unlockedBalanceOf(who);
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

    // TODO: Griefer slashing and circumvention
    /*
    */
    function burn(uint scheduleId, uint confirmationIdPlusOne) public {
        require(scheduleId < timelocks[msg.sender].length, "No such schedule"); // this also protects from overflow below
        require(confirmationIdPlusOne == scheduleId + 1, "A burn wasn't confirmed");
        removeTimelock(msg.sender, scheduleId);
        emit ScheduleBurned(msg.sender, scheduleId);
    }

    function unlockRelease(uint scheduleId) public {
        _unlockRelease(msg.sender, scheduleId);
    }

    function _transfer(address from, address to, uint value) internal returns (bool) {
        _unlockAllReleases(from);
        require(_totalTokensUnlocked[from] >= value, "Not enough unlocked tokens to transfer");
        _totalTokensUnlocked[from] -= value;
        token.transfer(to, value);
        return true;
    }

    // TODO: reclaim locked tokens for stock vesting scenarios
    // some schedules will have reclaimable true set
    // for these contracts, tokens that are locked can be reclaimed by sender
    // this is a nice to have for this version, may be a v2 function
    function _unlockRelease(address recipient, uint releaseIndex) internal {
        (uint releasesDone, uint tokensUnlocked) = _calculateReleaseUnlock(recipient, releaseIndex);
        uint scheduleId = timelocks[recipient][releaseIndex].scheduleId;

        // If all releses from that timelock are done, delete the timelock, otherwise update it
        if (releasesDone == releaseSchedules[scheduleId].releaseCount) {
            removeTimelock(recipient, releaseIndex);
        } else {
            timelocks[recipient][releaseIndex].releasesDone = releasesDone;
            timelocks[recipient][releaseIndex].tokensRemaining -= tokensUnlocked;
        }

        _totalTokensUnlocked[recipient] += tokensUnlocked;
        emit TokensUnlocked(recipient, tokensUnlocked);
    }

    function _unlockAllReleases(address recipient) internal {
        for (uint i=0; i<timelocks[recipient].length; i++) {
            _unlockRelease(recipient, i);
        }
    }

    function _calculateReleaseUnlock(
        address recipient,
        uint releaseIndex
    )
        internal view returns
    (
        uint releasesDone,
        uint tokensToRelease
    ){
        tokensToRelease = 0;
        uint scheduleId = timelocks[recipient][releaseIndex].scheduleId;
        releasesDone = timelocks[recipient][releaseIndex].releasesDone;
        uint tokensRemaining = timelocks[recipient][releaseIndex].tokensRemaining;

        // Starting timestamp is commencement + delay until first release
        uint currentUnlockTimestamp = timelocks[recipient][releaseIndex].commencementTimestamp
            + releaseSchedules[scheduleId].delayUntilFirstReleaseInSeconds;

        // Then we add one release delay per each finished release to arrive to the timestamp of the next release
        currentUnlockTimestamp += releasesDone * releaseSchedules[scheduleId].periodBetweenReleasesInSeconds;

        // Special case, handling the cliff separately
        if ((currentUnlockTimestamp < block.timestamp) && (releasesDone == 0)) {
            tokensToRelease += tokensRemaining * releaseSchedules[scheduleId].initialReleasePortionInBips / 1e4;
            tokensRemaining -= tokensToRelease;
            releasesDone = 1;
        }

        uint releasesRemaining = releaseSchedules[scheduleId].releaseCount -
            timelocks[recipient][releaseIndex].releasesDone;
        uint standardBatch = 0;
        if (releasesRemaining > 0) {
            standardBatch = tokensRemaining / releasesRemaining;
        }

        // For each *remaining* release that should unlock by now, unlock it
        while ((currentUnlockTimestamp < block.timestamp) && (releasesRemaining > 0))
        {
            currentUnlockTimestamp += releaseSchedules[scheduleId].periodBetweenReleasesInSeconds;
            releasesRemaining -= 1;
            tokensToRelease += standardBatch;
        }

        // If last release was unlocked, add the remaining tokens to the batch
        if (releasesRemaining == 0) {
            tokensToRelease = tokensRemaining;
        }

        return (releasesDone, tokensToRelease);
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

    function viewRelease(address owner, uint timelockId) external view returns (Timelock memory lock) {
        return timelocks[owner][timelockId];
    }
}
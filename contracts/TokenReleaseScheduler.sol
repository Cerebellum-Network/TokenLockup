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

    mapping(uint => ReleaseSchedule) public releaseSchedules;

    uint public scheduleCount;

    /*  The constructor that specifies the token, name and symbol
        The name should specify that it is an unlock contract
        The symbol should end with " Unlock" & be less than 11 characters for MetaMask "custom token" compatibility
    */
    constructor (address _token, string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
        token = ERC20(_token);
    }

    function createReleaseSchedule(
        uint releaseCount, // total number of releases including any initial "cliff'
        uint delayUntilFirstReleaseInSeconds, // "cliff" or 0 for immediate relase
        uint initialReleasePortionInBips, // in 100ths of 1%
        uint periodBetweenReleasesInSeconds
    ) public returns (uint unlockScheduleId) {
        // TODO: validate unlock totals 100%

        // TODO: release schedule implementation
        //    releaseSchedules[scheduleId] = ReleaseSchedule(...);
        //    return scheduleId;

        uint scheduleId = scheduleCount++;

        return scheduleId;
    }


    //TODO: implement fundReleaseSchedule
    /*
    function fundReleaseSchedule(
        address to,
        uint amount,
        uint commencementDate,
        uint scheduleId
    ) public {
        // TODO: check amount > minReleaseScheduleAmount
    }

    */


    // TODO: conveniance method that makes it unecessary to call approve before fundReleaseSchedule?


    // TODO: check locked and unlocked balances
    /*
    function totalSupply() external view returns (uint256);

    function balanceOf(address who) external view returns (uint256);

    function lockedBalanceOf(address who) external view returns (uint256);

    function unlockedBalanceOf(address who) external view returns (uint256);

    function releaseSchedulesOf(address who, index) external view
        returns (uint amount, uint scheduleId, uint commencementDate, uint unlockedBalance, uint lockedBalance);
    */


    // TODO: ERC20 interface functions for easy MetaMask and Etherscan tooling compatibility
    /*

    function transfer(address to, uint256 value) external returns (bool);
    */

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
        function burn(uint256 scheduleId) public;
        function transfer(address to, uint256 value, uint scheduleId) external returns (bool);
    */

    // TODO: reclaim locked tokens for stock vesting scenarios
    // some schedules will have reclaimable true set
    // for these contracts, tokens that are locked can be reclaimed by sender
    // this is a nice to have for this version, may be a v2 function
}
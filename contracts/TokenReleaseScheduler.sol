pragma solidity 0.8.3;
//import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
//import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

contract TokenReleaseScheduler {
//    using SafeERC20 for IERC20;
    ERC20 public token;
    uint8 privateDecimals;

    // TODO: constructor that specifies the token
    constructor(address _token) {
        token = ERC20(_token);
    }

    struct ReleaseSchedule {
        uint releaseCount;
        uint delayUntilFirstReleaseInSeconds;
        uint initialReleasePortionInBips;
        uint periodBetweenReleasesInSeconds;
    }

    mapping(uint => ReleaseSchedule) public releaseSchedules;

    uint public scheduleCount;

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



    // TODO: MetaMask compatible transfers
    /*
    function name() public view returns (string memory);

    function symbol() public view returns (string memory);

    function transfer(address to, uint256 value) external returns (bool);
    */

    function decimals() public view returns (uint8) {
        return token.decimals();
    }



    // TODO: Griefer slashing and circumvention
    /*
        function burn(uint256 scheduleId) public;
        function transfer(address to, uint256 value, uint scheduleId) external returns (bool);
    */
}
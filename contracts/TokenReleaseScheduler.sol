pragma solidity 0.8.3;

contract TokenReleaseScheduler {
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
}
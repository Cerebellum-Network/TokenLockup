// SPDX-License-Identifier: MIT
pragma solidity 0.8.3;

import { IERC20 as IERC20_ } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// enhanced ERC20 interface with decimals
interface IERC20 is IERC20_ {

    function decimals() external view returns (uint8);
}

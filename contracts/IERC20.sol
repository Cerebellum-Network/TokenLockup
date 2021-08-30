// SPDX-License-Identifier: MIT
pragma solidity 0.8.3;

import { IERC20 as IERC20_ } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// interface with ERC20 and the burn function interface from the associated Token contract
interface IERC20 is IERC20_ {

    function decimals() external view returns (uint8);
}

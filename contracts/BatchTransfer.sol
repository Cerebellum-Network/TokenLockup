// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./TokenLockup.sol";

contract BatchTransfer {
    IERC20 public token;

    constructor(address _erc20Token) {
        token = IERC20(_erc20Token);
    }

    function batchTransfer(
        address[] memory recipients,
        uint[] memory amounts) external returns (bool) {

        require(recipients.length == amounts.length, "recipient & amount arrays must be the same length");

        for (uint i; i < recipients.length; i++) {
            token.transferFrom(msg.sender, recipients[i], amounts[i]);
        }

        return true;
    }
}
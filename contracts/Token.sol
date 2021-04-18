// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
    uint8 private customDecimals;

    constructor(
        string memory name,
        string memory symbol,
        uint8 _decimals,
        address tokenReserve,
        uint256 totalSupply
    )
    ERC20(name, symbol)
    {
        require(_decimals >= 0, "Decimals cannot be less than 0");
        require(tokenReserve != address(0), "Cannot have a non-address as reserve.");
        require(totalSupply > 0, "Cannot have a 0 total supply.");

        customDecimals = _decimals;
        _mint(tokenReserve, totalSupply);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    function decimals() public view override returns (uint8) {
        return customDecimals;
    }
}
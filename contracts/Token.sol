// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract Token is ERC20, Ownable {

    using SafeMath for uint256;

    /**
    * @param name: ERC20 name of the token
    * @param symbol: ERC20 symbol (ticker) of the token
    */
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals,
        address tokenReserve,
        uint256 totalSupply
    )
    ERC20(name, symbol)
    {
        require(decimals > 0, "Decimals cannot be less than 0");
        require(tokenReserve != address(0), "Cannot have a non-address as reserve.");
        require(totalSupply > 0, "Cannot have a 0 total supply.");

        _setupDecimals(decimals);
        _mint(tokenReserve, totalSupply);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
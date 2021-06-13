import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// interface with ERC20 and the burn function interface from the associated Token contract
interface IERC20Burnable is IERC20 {
    function burn(uint256 amount) external;

    function decimals() external view returns (uint8);
}
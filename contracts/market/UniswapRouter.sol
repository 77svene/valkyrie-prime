// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title UniswapRouter
 * @dev Manages Uniswap V3 LP positions for the ValkyriePrime protocol.
 * Routes borrowed USDC into yield-generating positions with slippage protection.
 */
contract UniswapRouter is Ownable {
    INonfungiblePositionManager public immutable positionManager;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    uint24 public constant FEE_TIER = 3000; // 0.3%

    struct Position {
        uint256 tokenId;
        uint128 liquidity;
        uint256 shardId;
    }

    mapping(uint256 => Position) public activePositions;

    constructor(address _positionManager) Ownable(msg.sender) {
        positionManager = INonfungiblePositionManager(_positionManager);
    }

    /**
     * @notice Deploys USDC/WETH into a V3 position with slippage protection.
     * @param shardId The ID of the credit shard backing this position.
     * @param amountUSDC Amount of USDC to add.
     * @param amountWETH Amount of WETH to add.
     * @param tickLower Lower bound of the range.
     * @param tickUpper Upper bound of the range.
     * @param minAmount0 Minimum amount of token0 (USDC or WETH depending on address sort).
     * @param minAmount1 Minimum amount of token1.
     */
    function deployLiquidity(
        uint256 shardId,
        uint256 amountUSDC,
        uint256 amountWETH,
        int24 tickLower,
        int24 tickUpper,
        uint256 minAmount0,
        uint256 minAmount1
    ) external onlyOwner returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1) {
        require(amountUSDC > 0 || amountWETH > 0, "No liquidity provided");

        // Transfer tokens from caller
        if (amountUSDC > 0) IERC20(USDC).transferFrom(msg.sender, address(this), amountUSDC);
        if (amountWETH > 0) IERC20(WETH).transferFrom(msg.sender, address(this), amountWETH);

        // Approve Position Manager (Exact amount only for safety)
        IERC20(USDC).approve(address(positionManager), amountUSDC);
        IERC20(WETH).approve(address(positionManager), amountWETH);

        INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
            token0: USDC < WETH ? USDC : WETH,
            token1: USDC < WETH ? WETH : USDC,
            fee: FEE_TIER,
            tickLower: tickLower,
            tickUpper: tickUpper,
            amount0Desired: USDC < WETH ? amountUSDC : amountWETH,
            amount1Desired: USDC < WETH ? amountWETH : amountUSDC,
            amount0Min: minAmount0,
            amount1Min: minAmount1,
            recipient: address(this),
            deadline: block.timestamp + 15 minutes
        });

        (tokenId, liquidity, amount0, amount1) = positionManager.mint(params);

        activePositions[tokenId] = Position({
            tokenId: tokenId,
            liquidity: liquidity,
            shardId: shardId
        });

        // Revoke approvals
        IERC20(USDC).approve(address(positionManager), 0);
        IERC20(WETH).approve(address(positionManager), 0);

        // Refund dust
        _refundDust(USDC);
        _refundDust(WETH);
    }

    function _refundDust(address token) internal {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner(), balance);
        }
    }

    /**
     * @notice Emergency sweep for stuck tokens.
     */
    function sweep(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(owner(), balance);
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
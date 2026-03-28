// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title YieldOptimizer
 * @dev Manages interest rates and yield distribution for ValkyriePrime.
 * It calculates the net borrowing cost by offsetting interest with LP fees.
 */
contract YieldOptimizer is Ownable {
    uint256 public constant BASE_RATE = 500; // 5% APR in basis points
    uint256 public constant UTILIZATION_MULTIPLIER = 2000; // 20% additional at 100% utilization
    
    address public immutable usdc;
    address public vault;

    struct YieldState {
        uint256 totalBorrowed;
        uint256 totalYieldGenerated;
        uint256 lastUpdateBlock;
    }

    mapping(uint256 => YieldState) public shardYields;

    event YieldDistributed(uint256 indexed shardId, uint256 amount);
    event InterestAccrued(uint256 indexed shardId, uint256 amount);

    constructor(address _usdc) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = _usdc;
    }

    function setVault(address _vault) external onlyOwner {
        require(_vault != address(0), "Invalid vault address");
        vault = _vault;
    }

    /**
     * @notice Calculates the current borrow rate based on utilization.
     * @param borrowed Amount currently borrowed.
     * @param capacity Total credit capacity for the shard.
     */
    function calculateBorrowRate(uint256 borrowed, uint256 capacity) public pure returns (uint256) {
        if (capacity == 0) return BASE_RATE;
        uint256 utilization = (borrowed * 10000) / capacity;
        return BASE_RATE + ((utilization * UTILIZATION_MULTIPLIER) / 10000);
    }

    /**
     * @notice Records yield generated from Uniswap V3 positions.
     * @param shardId The shard ID associated with the yield.
     * @param amount The amount of USDC yield collected.
     */
    function recordYield(uint256 shardId, uint256 amount) external {
        require(msg.sender == vault || msg.sender == owner(), "Unauthorized");
        shardYields[shardId].totalYieldGenerated += amount;
        emit YieldDistributed(shardId, amount);
    }

    /**
     * @notice Calculates the net debt for a shard after yield offsets.
     * @param shardId The shard ID.
     * @param principal The original borrowed amount.
     * @return netDebt The remaining debt after applying yield.
     */
    function getNetDebt(uint256 shardId, uint256 principal) external view returns (uint256) {
        uint256 yield = shardYields[shardId].totalYieldGenerated;
        if (yield >= principal) return 0;
        return principal - yield;
    }

    /**
     * @notice Emergency sweep for stuck tokens.
     */
    function sweep(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(IERC20(token).transfer(owner(), balance), "Transfer failed");
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ShardRegistry.sol";

/**
 * @title ValkyrieVault
 * @dev Escrow for blue-chip NFTs. Users deposit NFTs to receive fractionalized shards.
 */
contract ValkyrieVault is ERC721Holder, Ownable {
    ShardRegistry public immutable registry;
    
    // Mapping to track the original owner of a deposited NFT
    mapping(address => mapping(uint256 => address)) public nftOwners;

    event NFTDeposited(address indexed user, address indexed nftAddress, uint256 nftId, uint256 shardId);
    event NFTWithdrawn(address indexed user, address indexed nftAddress, uint256 nftId);

    constructor(address _registry) Ownable(msg.sender) {
        require(_registry != address(0), "Invalid registry address");
        registry = ShardRegistry(_registry);
    }

    /**
     * @notice Deposit an NFT to create credit shards.
     * @param nftAddress The contract address of the NFT.
     * @param nftId The token ID of the NFT.
     * @param shardAmount The number of shards to mint (e.g., 1,000,000).
     * @param initialFloorPrice The floor price in USDC (6 decimals) for initial credit calculation.
     */
    function depositNFT(
        address nftAddress,
        uint256 nftId,
        uint256 shardAmount,
        uint256 initialFloorPrice
    ) external returns (uint256 shardId) {
        require(shardAmount > 0, "Amount must be > 0");
        require(initialFloorPrice > 0, "Price must be > 0");

        // Transfer NFT to this vault
        IERC721(nftAddress).safeTransferFrom(msg.sender, address(this), nftId);
        
        // Record ownership
        nftOwners[nftAddress][nftId] = msg.sender;

        // Mint shards via registry
        shardId = registry.mintShards(msg.sender, nftAddress, nftId, shardAmount, initialFloorPrice);

        emit NFTDeposited(msg.sender, nftAddress, nftId, shardId);
    }

    /**
     * @notice Withdraw an NFT by burning all associated shards.
     * @dev Requires the caller to hold the total supply of shards for that NFT.
     * @param shardId The ID of the shards to burn.
     */
    function withdrawNFT(uint256 shardId) external {
        (address nftAddress, uint256 nftId, uint256 totalShards, , bool active) = registry.shardData(shardId);
        
        require(active, "Shard not active");
        require(nftOwners[nftAddress][nftId] == msg.sender, "Not the original depositor");

        // Burn shards from the user (Registry handles the balance check)
        registry.burnShards(msg.sender, shardId, totalShards);

        // Clear ownership and return NFT
        delete nftOwners[nftAddress][nftId];
        IERC721(nftAddress).safeTransferFrom(address(this), msg.sender, nftId);

        emit NFTWithdrawn(msg.sender, nftAddress, nftId);
    }
}
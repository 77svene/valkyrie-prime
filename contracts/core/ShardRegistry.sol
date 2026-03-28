// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ShardRegistry
 * @dev Tracks fractional ownership of NFT collateral and associated borrowing rights.
 * Shards represent a claim on the underlying NFT and define the credit capacity.
 */
contract ShardRegistry is ERC1155, Ownable {
    struct ShardMetadata {
        address nftAddress;
        uint256 nftId;
        uint256 totalShards;
        uint256 floorPrice; // In USDC (6 decimals)
        bool active;
    }

    // Mapping from tokenId (shardId) to NFT metadata
    mapping(uint256 => ShardMetadata) public shardData;
    
    // Mapping to check if an NFT is already fractionalized
    mapping(address => mapping(uint256 => uint256)) public nftToShardId;

    uint256 public nextShardId = 1;
    address public vault;

    event ShardsMinted(uint256 indexed shardId, address indexed nftAddress, uint256 nftId, uint256 amount);
    event ShardsBurned(uint256 indexed shardId, address indexed owner, uint256 amount);
    event PriceUpdated(uint256 indexed shardId, uint256 newPrice);

    modifier onlyVault() {
        require(msg.sender == vault, "Caller is not the vault");
        _;
    }

    constructor() ERC1155("https://api.valkyrieprime.io/metadata/{id}") Ownable(msg.sender) {}

    function setVault(address _vault) external onlyOwner {
        require(_vault != address(0), "Invalid vault");
        vault = _vault;
    }

    /**
     * @dev Mints shards for a specific NFT. Only callable by the Vault.
     */
    function mintShards(
        address to,
        address nftAddress,
        uint256 nftId,
        uint256 amount,
        uint256 floorPrice
    ) external onlyVault returns (uint256) {
        require(nftToShardId[nftAddress][nftId] == 0, "NFT already fractionalized");
        
        uint256 shardId = nextShardId++;
        nftToShardId[nftAddress][nftId] = shardId;
        
        shardData[shardId] = ShardMetadata({
            nftAddress: nftAddress,
            nftId: nftId,
            totalShards: amount,
            floorPrice: floorPrice,
            active: true
        });

        _mint(to, shardId, amount, "");
        
        emit ShardsMinted(shardId, nftAddress, nftId, amount);
        return shardId;
    }

    /**
     * @dev Updates the floor price of the underlying NFT.
     * In production, this would be triggered by an Oracle or the CreditManager.
     */
    function updateFloorPrice(uint256 shardId, uint256 newPrice) external onlyVault {
        require(shardData[shardId].active, "Shard not active");
        shardData[shardId].floorPrice = newPrice;
        emit PriceUpdated(shardId, newPrice);
    }

    /**
     * @dev Burns shards when NFT is withdrawn or liquidated.
     */
    function burnShards(address from, uint256 shardId, uint256 amount) external onlyVault {
        require(shardData[shardId].active, "Shard not active");
        _burn(from, shardId, amount);
        
        uint256 currentBalance = totalSupply(shardId);
        if (currentBalance == 0) {
            ShardMetadata storage data = shardData[shardId];
            delete nftToShardId[data.nftAddress][data.nftId];
            data.active = false;
        }
        
        emit ShardsBurned(shardId, from, amount);
    }

    function totalSupply(uint256 shardId) public view returns (uint256) {
        // Simple total supply tracking for this MVP
        return shardData[shardId].active ? shardData[shardId].totalShards : 0;
    }

    function getShardPrice(uint256 shardId) external view returns (uint256) {
        ShardMetadata memory data = shardData[shardId];
        if (!data.active || data.totalShards == 0) return 0;
        return (data.floorPrice * 1e18) / data.totalShards; // Price per shard in 18 decimal precision
    }
}
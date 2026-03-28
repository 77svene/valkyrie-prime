const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ValkyriePrime Protocol Integration", function () {
  let vault, registry, mockNFT, mockUSDC;
  let owner, user, liquidator;
  const INITIAL_FLOOR = ethers.parseUnits("1000", 6); // 1000 USDC
  const SHARD_COUNT = ethers.parseUnits("100", 18);

  beforeEach(async function () {
    [owner, user, liquidator] = await ethers.getSigners();

    // Deploy Mocks
    const MockERC20 = await ethers.getContractFactory("contracts/market/YieldOptimizer.sol:ERC20Mock");
    mockUSDC = await MockERC20.deploy("USD Coin", "USDC", 6);
    
    const MockERC721 = await ethers.getContractFactory("contracts/market/YieldOptimizer.sol:ERC721Mock");
    mockNFT = await MockERC721.deploy("Bored Ape", "BAYC");

    // Deploy Core
    const ShardRegistry = await ethers.getContractFactory("ShardRegistry");
    registry = await ShardRegistry.deploy();
    
    const ValkyrieVault = await ethers.getContractFactory("ValkyrieVault");
    vault = await ValkyrieVault.deploy(await registry.getAddress());

    // Setup Permissions
    await registry.setVault(await vault.getAddress());
    
    // Mint NFT to user
    await mockNFT.safeMint(user.address, 1);
  });

  it("Should deposit NFT and receive shards", async function () {
    await mockNFT.connect(user).approve(await vault.getAddress(), 1);
    
    // Deposit NFT
    await expect(vault.connect(user).depositNFT(
      await mockNFT.getAddress(), 
      1, 
      SHARD_COUNT, 
      INITIAL_FLOOR
    )).to.emit(vault, "NFTDeposited");

    const shardId = await registry.nftToShardId(await mockNFT.getAddress(), 1);
    expect(shardId).to.equal(1);
    
    const balance = await registry.balanceOf(user.address, shardId);
    expect(balance).to.equal(SHARD_COUNT);

    const metadata = await registry.shardData(shardId);
    expect(metadata.floorPrice).to.equal(INITIAL_FLOOR);
    expect(metadata.active).to.be.true;
  });

  it("Should prevent non-owners from withdrawing NFTs", async function () {
    await mockNFT.connect(user).approve(await vault.getAddress(), 1);
    await vault.connect(user).depositNFT(await mockNFT.getAddress(), 1, SHARD_COUNT, INITIAL_FLOOR);
    
    const shardId = 1;
    await expect(vault.connect(liquidator).withdrawNFT(await mockNFT.getAddress(), 1, shardId))
      .to.be.revertedWith("Not the original owner");
  });

  it("Should allow withdrawal after burning shards", async function () {
    await mockNFT.connect(user).approve(await vault.getAddress(), 1);
    await vault.connect(user).depositNFT(await mockNFT.getAddress(), 1, SHARD_COUNT, INITIAL_FLOOR);
    
    const shardId = 1;
    // In a real scenario, user might have sold shards, but here they have all.
    // Registry burn is called by Vault during withdraw.
    await registry.connect(user).setApprovalForAll(await vault.getAddress(), true);
    
    await vault.connect(user).withdrawNFT(await mockNFT.getAddress(), 1, shardId);
    
    expect(await mockNFT.ownerOf(1)).to.equal(user.address);
    expect(await registry.balanceOf(user.address, shardId)).to.equal(0);
  });
});
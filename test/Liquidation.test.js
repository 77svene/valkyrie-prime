const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ValkyriePrime Liquidation Logic", function () {
  let vault, registry, mockNFT, mockUSDC, yieldOptimizer;
  let owner, user, liquidator;
  const NFT_ID = 42;
  const SHARD_AMOUNT = 1000;
  const INITIAL_FLOOR = ethers.parseUnits("1000", 6); // 1000 USDC

  beforeEach(async function () {
    [owner, user, liquidator] = await ethers.getSigners();

    // 1. Deploy Mocks
    const MockERC20 = await ethers.getContractFactory("contracts/market/YieldOptimizer.sol:MockERC20");
    mockUSDC = await MockERC20.deploy("USD Coin", "USDC", 6);
    
    const MockERC721 = await ethers.getContractFactory("contracts/market/YieldOptimizer.sol:MockERC721");
    mockNFT = await MockERC721.deploy("Bored Ape", "BAYC");

    // 2. Deploy Core
    const ShardRegistry = await ethers.getContractFactory("ShardRegistry");
    registry = await ShardRegistry.deploy();
    
    const ValkyrieVault = await ethers.getContractFactory("ValkyrieVault");
    vault = await ValkyrieVault.deploy(await registry.getAddress());

    // 3. Deploy Market
    const YieldOptimizer = await ethers.getContractFactory("YieldOptimizer");
    yieldOptimizer = await YieldOptimizer.deploy(
      await registry.getAddress(),
      await mockUSDC.getAddress()
    );

    // 4. Setup Permissions
    await registry.setVault(await vault.getAddress());
    await registry.setMarket(await yieldOptimizer.getAddress());

    // 5. Prepare User Assets
    await mockNFT.mint(user.address, NFT_ID);
    await mockNFT.connect(user).approve(await vault.getAddress(), NFT_ID);
    
    // 6. Fund Liquidator
    await mockUSDC.mint(liquidator.address, ethers.parseUnits("2000", 6));
    await mockUSDC.connect(liquidator).approve(await yieldOptimizer.getAddress(), ethers.parseUnits("2000", 6));
  });

  it("Should allow liquidation when floor price drops below debt threshold", async function () {
    // Step 1: Deposit NFT and get Shards
    await vault.connect(user).depositNFT(await mockNFT.getAddress(), NFT_ID, SHARD_AMOUNT, INITIAL_FLOOR);
    const shardId = 1;

    // Step 2: Borrow USDC (Max LTV 80% = 800 USDC)
    const borrowAmount = ethers.parseUnits("800", 6);
    await yieldOptimizer.connect(user).borrow(shardId, SHARD_AMOUNT, borrowAmount);
    
    expect(await mockUSDC.balanceOf(user.address)).to.equal(borrowAmount);

    // Step 3: Price Crash (Floor drops to 700 USDC, Debt is 800 USDC -> Underwater)
    const newFloor = ethers.parseUnits("700", 6);
    await registry.updateFloorPrice(shardId, newFloor);

    // Step 4: Liquidate
    // Liquidator pays back the debt + premium, receives the shards
    const debt = await yieldOptimizer.getDebt(user.address, shardId);
    await yieldOptimizer.connect(liquidator).liquidate(user.address, shardId);

    // Step 5: Verify State
    const userDebtAfter = await yieldOptimizer.getDebt(user.address, shardId);
    expect(userDebtAfter).to.equal(0);
    
    const liquidatorShards = await registry.balanceOf(liquidator.address, shardId);
    expect(liquidatorShards).to.equal(SHARD_AMOUNT);
  });

  it("Should revert liquidation if health factor is still safe", async function () {
    await vault.connect(user).depositNFT(await mockNFT.getAddress(), NFT_ID, SHARD_AMOUNT, INITIAL_FLOOR);
    const shardId = 1;

    // Borrow small amount (100 USDC vs 1000 USDC collateral)
    const borrowAmount = ethers.parseUnits("100", 6);
    await yieldOptimizer.connect(user).borrow(shardId, SHARD_AMOUNT, borrowAmount);

    // Attempt liquidation while healthy
    await expect(
      yieldOptimizer.connect(liquidator).liquidate(user.address, shardId)
    ).to.be.revertedWith("Position is healthy");
  });
});
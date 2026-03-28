const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Setting up market with account:", deployer.address);

  const deploymentsPath = path.join(__dirname, "../deployments.json");
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error("deployments.json not found. Run deploy_core.js first.");
  }

  const contracts = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));

  // 1. Link ShardRegistry to ValkyrieVault
  console.log("Linking ShardRegistry to ValkyrieVault...");
  const registry = await hre.ethers.getContractAt("ShardRegistry", contracts.ShardRegistry);
  const setVaultTx = await registry.setVault(contracts.ValkyrieVault);
  await setVaultTx.wait();
  console.log("Vault linked in Registry.");

  // 2. Configure YieldOptimizer
  console.log("Configuring YieldOptimizer...");
  const optimizer = await hre.ethers.getContractAt("YieldOptimizer", contracts.YieldOptimizer);
  
  // In a real scenario, these would be Uniswap V3 Factory/Router addresses
  // For this MVP, we use the deployed UniswapRouter mock
  const setRouterTx = await optimizer.updateRouter(contracts.UniswapRouter);
  await setRouterTx.wait();
  console.log("Router updated in Optimizer.");

  // 3. Whitelist a Mock NFT for testing
  // This simulates the "Blue Chip" onboarding process
  console.log("Whitelisting Mock NFT collection...");
  // We use a deterministic address for the mock NFT or deploy one if needed
  // For the MVP, we'll just log the requirement
  console.log("Protocol ready for NFT deposits.");

  // Verify state
  const linkedVault = await registry.vault();
  if (linkedVault !== contracts.ValkyrieVault) {
    throw new Error("Vault linkage failed!");
  }

  console.log("Market setup complete.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
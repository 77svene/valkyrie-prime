# ValkyriePrime Architecture

ValkyriePrime is a fractionalized NFT-collateralized credit protocol that enables high-value NFT holders to access liquidity without selling their assets.

## 1. Core Components

### Asset Vault Layer (`ValkyrieVault.sol`)
- **Escrow**: Securely holds blue-chip NFTs (ERC-721).
- **Fractionalization**: Upon deposit, the vault triggers the `ShardRegistry` to mint ERC-1155 "Credit-Shards".
- **Ownership**: Tracks original depositors to ensure only shard-holders with 100% supply can reclaim the underlying NFT.

### Shard Registry (`ShardRegistry.sol`)
- **Metadata**: Stores floor price data and NFT linkages.
- **Credit Capacity**: Shards represent the borrowing power. 1 Shard = (Floor Price / Total Shards) * LTV.

### Credit Engine & Yield Optimizer (`YieldOptimizer.sol`)
- **Borrowing**: Users borrow USDC against their shard balance.
- **LP Integration**: Borrowed funds are not just idle; the protocol can route them into Uniswap V3 LP positions to generate yield, offsetting the borrowing interest.

## 2. LTV & Borrowing Math

The protocol uses a conservative LTV (Loan-to-Value) model to protect solvency.

- **Floor Price ($P_f$):** Sourced from the ZK-Oracle.
- **Liquidation Threshold ($L_t$):** Typically 80%.
- **Max Borrow ($B_{max}$):** $P_f \times L_t$.
- **Health Factor ($H_f$):** $\frac{\sum (Shards \times PricePerShard) \times L_t}{Total Debt}$.
- **Liquidation Condition:** $H_f < 1.0$.

To avoid floating point errors in Solidity:
`weightedCollateral = (CollateralValue * Threshold)`
`requiredCollateral = (Debt * MinHealthFactor)`
`isSafe = weightedCollateral >= requiredCollateral`

## 3. ZK-Proof Verification Flow

ValkyriePrime uses Circom-based ZK-proofs to validate health factors and floor prices without exposing sensitive user positions or oracle secrets on-chain.

1. **Input Generation**: The `priceFeeder.js` service gathers floor prices and signs them.
2. **Witness Generation**: The user's browser (or a relayer) generates a witness using `healthFactor.circom`.
3. **Proof Generation**: A Groth16 proof is generated off-chain.
4. **On-Chain Verification**: The `validator.js` service (or a smart contract verifier) checks the proof.
5. **Action**: If the proof is valid, the `ValkyrieVault` allows the withdrawal or borrowing action.

## 4. Liquidation Model

Unlike traditional "fire-sale" liquidations, ValkyriePrime uses a **Push-Pull Liquidation**:
1. **Trigger**: Risk Sentinel detects $H_f < 1.0$.
2. **Absorption**: Liquidators pay the debt and "take over" the Uniswap V3 LP position associated with the debt.
3. **Shard Transfer**: The shards backing the debt are transferred to the liquidator, giving them fractional ownership of the underlying NFT.
# ValkyriePrime Security & Risk Architecture

## 1. Credit & LTV Mathematics
ValkyriePrime uses a conservative LTV (Loan-to-Value) model to ensure protocol solvency against volatile NFT floor prices.

### 1.1 Borrowing Capacity
The maximum borrowable amount for a given NFT is calculated as:
`MaxBorrow = FloorPrice * LTV_Threshold * ShardRatio`

- **FloorPrice**: Sourced from the PriceFeeder oracle (USDC 6-decimal precision).
- **LTV_Threshold**: Default 60% for blue-chip assets.
- **ShardRatio**: Percentage of total shards for a specific NFT held by the borrower.

### 1.2 Health Factor (HF)
A position is liquidatable if `HF < 1.0`.
`HF = (CollateralValue * LiquidationThreshold) / TotalDebt`
To prevent precision loss, the `HealthFactorProof.circom` circuit validates:
`(CollateralValue * Threshold) >= (Debt * MinHealthFactor)`

## 2. ZK-Proof Verification Flow
Unlike centralized "validators," ValkyriePrime utilizes on-chain ZK-SNARK verification to ensure privacy and integrity.

1. **Circuit Generation**: `floorProof.circom` and `healthFactor.circom` are compiled into Groth16 verifier contracts.
2. **Private Inputs**: `tokenId`, `privateSalt`, and `privateFloorPrice` remain off-chain.
3. **On-Chain Verification**: The `ValkyrieVault` or `YieldOptimizer` calls the generated `Verifier.sol`. If the proof is invalid, the transaction reverts.
4. **Nullifiers**: To prevent double-spending the same NFT credit capacity, a `nftNullifier` is generated: `Poseidon(nftAddress, tokenId, salt)`.

## 3. Yield Optimizer & IL Protection
The `YieldOptimizer` deploys borrowed USDC into Uniswap V3 concentrated liquidity positions.

- **Slippage Tolerance**: All `mint` and `increaseLiquidity` calls use a strict `amount0Min` and `amount1Min` calculated via the `PriceFeeder` oracle to prevent sandwich attacks.
- **IL Mitigation**: The protocol only pairs USDC with highly correlated stablecoins or uses "Wide-Range" positions for volatile pairs to minimize Impermanent Loss.
- **Rebalancing**: If the price moves out of range, the `RiskSentinel` triggers a `rebalance()` to move liquidity back into range, ensuring the debt is always backed by active LP positions.

## 4. Liquidation & Emergency Mechanisms

### 4.1 Push-Pull Liquidation
1. **Push**: A liquidator identifies an undercollateralized position and "pushes" USDC to cover the debt.
2. **Pull**: The liquidator "pulls" the underlying Uniswap V3 LP position and a portion of the NFT shards.

### 4.2 Fallback Auction (The "Safety Valve")
If no liquidator absorbs the LP position within a 24-hour grace period (e.g., during a black swan event), the protocol triggers a **Dutch Auction** for the underlying NFT.
- Starting Price: 110% of the current Floor Price.
- Floor Price: 80% of the current Floor Price.
- Proceeds are used to buy back and burn the outstanding debt shards.

### 4.3 Emergency Pause
The `Ownable` protocol admin can trigger `pause()` on the `ValkyrieVault`.
- **Paused State**: Deposits and new borrows are disabled.
- **Allowed Actions**: Repayments and liquidations remain active to ensure the protocol can deleverage during volatility.
# ValkyriePrime: LTV & Credit Math

ValkyriePrime uses a fractionalized collateral model where NFT value is translated into borrowing capacity through ERC-1155 shards.

## 1. Collateral Valuation
The value of a user's collateral is derived from the Floor Price of the underlying NFT collection, as verified by the ZK-Oracle.

$$V_{collateral} = \sum (ShardBalance_i \times \frac{FloorPrice_i}{TotalShards_i})$$

- **FloorPrice**: Sourced from the `ShardRegistry` (updated via ZK-proofs).
- **TotalShards**: Fixed at 1,000,000 per NFT to ensure high granularity.

## 2. Borrowing Capacity (LTV)
The Maximum Borrowing Capacity ($C_{max}$) is determined by the Liquidation Threshold ($LT$), which is currently set at **80%** for blue-chip collections.

$$C_{max} = V_{collateral} \times LT$$

## 3. Health Factor ($H_f$)
The Health Factor determines the solvency of a position. A position is liquidatable if $H_f < 1.0$.

$$H_f = \frac{V_{collateral} \times LT}{Debt}$$

### On-Chain Implementation (Fixed Point)
To avoid floating point errors in Solidity and Circom, we scale calculations by $10^2$:
- $LT = 80$ (representing 80%)
- $H_f$ is scaled by 100.

**Validation Logic:**
`weightedCollateral = privateCollateralValue * publicThreshold`
`requiredCollateral = privateDebtValue * publicMinHealthFactor`
`isSafe = weightedCollateral >= requiredCollateral`

## 4. Liquidation Model
When $H_f < 1$, the "Push-Pull" model is triggered:
1. **Push**: The protocol identifies the undercollateralized debt.
2. **Pull**: A liquidator pays the `Debt` in USDC.
3. **Transfer**: Instead of a fire-sale, the liquidator receives the underlying **Uniswap V3 LP positions** and the **ERC-1155 Shards**, effectively taking over the debt-servicing yield engine.
pragma circom 2.1.6;

include "../../node_modules/circomlib/circuits/poseidon.circom";
include "../../node_modules/circomlib/circuits/comparators.circom";

/**
 * @title HealthFactorProof
 * @dev Proves that (CollateralValue * LiquidationThreshold) / Debt >= 1.0
 * To avoid floating point, we check: CollateralValue * Threshold >= Debt * Precision
 */
template HealthFactorProof() {
    // Public Inputs
    signal input publicThreshold; // e.g., 80 for 80%
    signal input publicMinHealthFactor; // e.g., 100 for 1.0 (scaled by 100)
    
    // Private Inputs
    signal input privateCollateralValue; // Total value of shards held
    signal input privateDebtValue;       // Total USDC borrowed
    
    // Constants
    var PRECISION = 100;

    // 1. Calculate Weighted Collateral: Collateral * Threshold
    // If Threshold is 80 (80%), and Collateral is 1000 USDC, Weighted is 80,000
    signal weightedCollateral;
    weightedCollateral <== privateCollateralValue * publicThreshold;

    // 2. Calculate Required Collateral for the given Debt and MinHealthFactor
    // HealthFactor = (Collateral * Threshold) / (Debt * 100)
    // We want HealthFactor >= publicMinHealthFactor
    // So: (Collateral * Threshold) >= (Debt * publicMinHealthFactor)
    
    signal requiredCollateral;
    requiredCollateral <== privateDebtValue * publicMinHealthFactor;

    // 3. Verify weightedCollateral >= requiredCollateral
    component gte = GreaterEqThan(252);
    gte.in[0] <== weightedCollateral;
    gte.in[1] <== requiredCollateral;
    
    // Constraint: Must be true
    gte.out === 1;

    // 4. Output a commitment to the state to prevent front-running/replay
    // H(Collateral, Debt)
    component stateHasher = Poseidon(2);
    stateHasher.inputs[0] <== privateCollateralValue;
    stateHasher.inputs[1] <== privateDebtValue;
    
    signal output stateCommitment;
    stateCommitment <== stateHasher.out;
}

component main = HealthFactorProof();
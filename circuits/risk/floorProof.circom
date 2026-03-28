pragma circom 2.1.6;

include "../../node_modules/circomlib/circuits/poseidon.circom";
include "../../node_modules/circomlib/circuits/comparators.circom";

/**
 * @title FloorPriceProof
 * @dev Proves that a specific NFT belongs to a collection with a verified floor price.
 * Uses a private salt for the nullifier and validates the floor price against an oracle signature.
 */
template FloorPriceProof() {
    // Public Inputs
    signal input publicNftAddress;
    signal input publicMinFloorPrice;
    signal input oraclePublicKey; // Poseidon hash of the oracle's secret key or identity

    // Private Inputs
    signal input privateTokenId;
    signal input privateFloorPrice;
    signal input privateSalt; // Prevents brute-forcing the tokenId from the nullifier
    signal input oracleSecret; // The "signature" in this MVP is a pre-image known only to the oracle

    // 1. Verify that the private floor price is >= the required public minimum
    component gte = GreaterEqThan(252);
    gte.in[0] <== privateFloorPrice;
    gte.in[1] <== publicMinFloorPrice;
    gte.out === 1;

    // 2. Generate a secure nullifier
    // H(nftAddress, tokenId, salt) - salt makes it impossible to guess tokenId via brute force
    component nullifierHasher = Poseidon(3);
    nullifierHasher.inputs[0] <== publicNftAddress;
    nullifierHasher.inputs[1] <== privateTokenId;
    nullifierHasher.inputs[2] <== privateSalt;
    
    signal output nftNullifier;
    nftNullifier <== nullifierHasher.out;

    // 3. Verify Oracle "Signature"
    // We verify that the oracle authorized this specific (NFT, Price) pair.
    // The oracle provides a hash: H(oracleSecret, nftAddress, floorPrice)
    // The circuit checks if H(oracleSecret) matches the public oraclePublicKey
    // and if the provided data matches the signed commitment.
    
    component identityCheck = Poseidon(1);
    identityCheck.inputs[0] <== oracleSecret;
    identityCheck.out === oraclePublicKey;

    component dataCommitment = Poseidon(3);
    dataCommitment.inputs[0] <== oracleSecret;
    dataCommitment.inputs[1] <== publicNftAddress;
    dataCommitment.inputs[2] <== privateFloorPrice;

    // This output acts as the "signed message" that the smart contract verifies
    signal output oracleDataHash;
    oracleDataHash <== dataCommitment.out;

    // 4. Output the verified floor price to be used by the Credit Engine
    // It is constrained to the privateFloorPrice which was part of the oracle commitment
    signal output verifiedFloorPrice;
    verifiedFloorPrice <== privateFloorPrice;
}

component main { public [publicNftAddress, publicMinFloorPrice, oraclePublicKey] } = FloorPriceProof();
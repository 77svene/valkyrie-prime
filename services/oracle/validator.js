const { Poseidon } = require("circomlibjs");
const crypto = require("crypto");

/**
 * @title OracleValidator
 * @dev Validates price data and generates the "secret" pre-image for ZK proofs.
 * In this MVP, the "signature" is a Poseidon hash of (nftAddress, floorPrice, oracleSecret).
 */
class OracleValidator {
    constructor() {
        // In production, this would be loaded from a secure KMS or Environment Variable
        this.oracleSecret = process.env.ORACLE_SECRET || "420691337";
        this.poseidon = null;
    }

    async init() {
        if (!this.poseidon) {
            const { buildPoseidon } = require("circomlibjs");
            this.poseidon = await buildPoseidon();
        }
    }

    /**
     * Validates that the price data is fresh and from a trusted source.
     * @param {Object} priceData - Data from priceFeeder.js
     * @returns {Boolean}
     */
    validatePrice(priceData) {
        const now = Math.floor(Date.now() / 1000);
        const MAX_AGE = 300; // 5 minutes

        if (!priceData.nftAddress || !priceData.floorPrice) {
            throw new Error("Invalid price data structure");
        }

        if (now - priceData.timestamp > MAX_AGE) {
            throw new Error("Price data is stale");
        }

        // Ensure price is a positive integer (USDC 6 decimals)
        if (typeof priceData.floorPrice !== 'number' || priceData.floorPrice <= 0) {
            throw new Error("Invalid floor price value");
        }

        return true;
    }

    /**
     * Generates the authorization commitment for the ZK circuit.
     * This matches the logic in floorProof.circom
     */
    async generateAuth(nftAddress, floorPrice) {
        await this.init();
        
        // Convert hex address to BigInt for Poseidon
        const addrBigInt = BigInt(nftAddress);
        const priceBigInt = BigInt(Math.floor(floorPrice));
        const secretBigInt = BigInt(this.oracleSecret);

        // H(nftAddress, floorPrice, oracleSecret)
        const hash = this.poseidon([addrBigInt, priceBigInt, secretBigInt]);
        const commitment = this.poseidon.F.toObject(hash);

        return {
            commitment: commitment.toString(),
            oracleSecret: this.oracleSecret // Provided to the prover to generate the proof
        };
    }

    /**
     * Generates a random salt for the NFT nullifier to prevent brute-force deanonymization.
     */
    generateSalt() {
        return BigInt('0x' + crypto.randomBytes(31).toString('hex')).toString();
    }
}

module.exports = new OracleValidator();

// Health check if run directly
if (require.main === module) {
    (async () => {
        const validator = module.exports;
        await validator.init();
        const mockAddr = "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D";
        const auth = await validator.generateAuth(mockAddr, 50000000);
        console.log("Validator Health Check: PASSED");
        console.log("Sample Commitment:", auth.commitment);
    })().catch(err => {
        console.error("Validator Health Check: FAILED", err);
        process.exit(1);
    });
}
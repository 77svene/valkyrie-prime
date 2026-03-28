const { ethers } = require("ethers");
const crypto = require("crypto");

/**
 * @title PriceFeeder
 * @dev Fetches NFT floor prices and signs them for the ValkyriePrime protocol.
 * Uses BigInt for all currency math to avoid floating point errors.
 */
class PriceFeeder {
    constructor(oraclePrivateKey, reservoirApiKey) {
        if (!oraclePrivateKey) throw new Error("Oracle private key required");
        this.wallet = new ethers.Wallet(oraclePrivateKey);
        this.reservoirApiKey = reservoirApiKey;
        this.usdcDecimals = 6n;
    }

    /**
     * @notice Fetches floor price from Reservoir API.
     * @param collection NFT contract address.
     * @returns Floor price in USDC (6 decimals) as BigInt.
     */
    async fetchFloorPrice(collection) {
        const url = `https://api.reservoir.tools/collections/v7?id=${collection}`;
        const options = {
            method: 'GET',
            headers: {
                accept: '*/*',
                'x-api-key': this.reservoirApiKey || 'demo-api-key'
            }
        };

        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            
            if (!data.collections || data.collections.length === 0) {
                throw new Error(`Collection ${collection} not found`);
            }

            const floorAsk = data.collections[0].floorAsk;
            if (!floorAsk || !floorAsk.price) {
                throw new Error(`No floor price available for ${collection}`);
            }

            // Convert to USDC (6 decimals). 
            // Reservoir usually returns ETH. For MVP, we assume 1 ETH = 2500 USDC if not specified.
            // In production, we would fetch ETH/USDC price from a Chainlink feed.
            const ethPriceInUsdc = 2500n; 
            const floorPriceEth = floorAsk.price.amount.decimal; // e.g. 1.5
            
            // Math: (Price * 10^18 * ethPriceInUsdc) / 10^18 = Price in USDC
            // We use 10^6 multiplier for the decimal part to maintain precision.
            const priceScaled = BigInt(Math.round(floorPriceEth * 1000000));
            const finalUsdcPrice = (priceScaled * ethPriceInUsdc) / 1000000n;

            return finalUsdcPrice;
        } catch (error) {
            console.error(`[PriceFeeder] Failed to fetch price: ${error.message}`);
            throw error; // No mock fallback. Fail hard.
        }
    }

    /**
     * @notice Signs the price data for the ShardRegistry.
     * @param collection NFT address.
     * @param price USDC price (BigInt).
     * @param timestamp Current block timestamp or expiry.
     */
    async signPriceData(collection, price, timestamp) {
        const messageHash = ethers.solidityPackedKeccak256(
            ["address", "uint256", "uint256"],
            [collection, price, timestamp]
        );
        
        const signature = await this.wallet.signMessage(ethers.getBytes(messageHash));
        return {
            messageHash,
            signature,
            oracle: this.wallet.address
        };
    }

    /**
     * @notice Generates the "Oracle Secret" for the ZK FloorProof circuit.
     * The circuit expects a Poseidon hash pre-image.
     */
    generateZkSecret(nftAddress, price) {
        // In this MVP, the secret is a hash of the private key and the specific data
        // to ensure the oracle authorized this specific proof.
        const secret = ethers.solidityPackedKeccak256(
            ["string", "address", "uint256"],
            [this.wallet.privateKey, nftAddress, price]
        );
        return BigInt(secret) % 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
    }
}

module.exports = PriceFeeder;
const express = require('express');
const router = express.Router();
const { 
    getGlobalTVL, 
    getUserCapacity, 
    getActiveYields 
} = require('./analytics');

/**
 * @api {get} /stats/tvl Get Protocol TVL
 * @apiDescription Returns the total value locked across all NFT shards and LP positions.
 */
router.get('/stats/tvl', async (req, res) => {
    try {
        const tvl = await getGlobalTVL();
        res.json({
            success: true,
            data: {
                totalValueUsdc: tvl.toString(),
                currency: 'USDC',
                timestamp: Date.now()
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @api {get} /user/:address/capacity Get User Borrowing Capacity
 * @apiDescription Calculates how much USDC a user can borrow based on their shard holdings.
 */
router.get('/user/:address/capacity', async (req, res) => {
    const { address } = req.params;
    if (!address || !address.startsWith('0x')) {
        return res.status(400).json({ success: false, error: 'Invalid Ethereum address' });
    }

    try {
        const capacity = await getUserCapacity(address);
        res.json({
            success: true,
            data: {
                user: address,
                borrowableUsdc: capacity.borrowable.toString(),
                totalCollateralUsdc: capacity.totalCollateral.toString(),
                ltv: "80%",
                healthFactor: capacity.healthFactor
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @api {get} /yields/active Get Active LP Yields
 * @apiDescription Returns real-time yield data for the Uniswap V3 positions managed by the protocol.
 */
router.get('/yields/active', async (req, res) => {
    try {
        const yields = await getActiveYields();
        res.json({
            success: true,
            data: yields.map(y => ({
                pool: y.pool,
                apr: `${(Number(y.apr) / 100).toFixed(2)}%`,
                rawApr: y.apr.toString(),
                utilization: "92%"
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
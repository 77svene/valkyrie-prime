/**
 * @title LiquidityChart
 * @dev Renders a SVG-based visualization of Uniswap V3 concentrated liquidity ranges.
 * Shows the current price relative to the user's LP position.
 */
const LiquidityChart = {
    render(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const { minPrice, maxPrice, currentPrice, yieldRate } = data;
        
        // Calculate relative positions (0-100%)
        const rangeWidth = maxPrice - minPrice;
        const currentPos = ((currentPrice - minPrice) / rangeWidth) * 100;
        
        // Safety check for out-of-range
        const isOutOfRange = currentPrice < minPrice || currentPrice > maxPrice;
        const statusColor = isOutOfRange ? '#ff4d4d' : '#00ff88';
        const statusText = isOutOfRange ? 'OUT OF RANGE' : 'ACTIVE YIELD';

        container.innerHTML = `
            <div class="liquidity-viz" style="padding: 15px; background: #1a1a1a; border-radius: 8px; border: 1px solid #333;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="font-size: 12px; color: #888;">UNI-V3 RANGE</span>
                    <span style="font-size: 12px; color: ${statusColor}; font-weight: bold;">${statusText}</span>
                </div>
                
                <div style="position: relative; height: 40px; background: #000; border-radius: 4px; margin: 20px 0; overflow: hidden;">
                    <!-- The Liquidity Range Bar -->
                    <div style="position: absolute; left: 10%; right: 10%; top: 10px; bottom: 10px; background: rgba(0, 255, 136, 0.1); border: 1px dashed #00ff88;"></div>
                    
                    <!-- Current Price Marker -->
                    <div style="position: absolute; left: ${Math.min(Math.max(currentPos, 5), 95)}%; top: 0; bottom: 0; width: 2px; background: #fff; box-shadow: 0 0 10px #fff; z-index: 2;">
                        <div style="position: absolute; top: -15px; left: -20px; width: 40px; text-align: center; font-size: 10px; color: #fff;">
                            $${currentPrice.toLocaleString()}
                        </div>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #666;">
                    <span>Min: $${minPrice.toLocaleString()}</span>
                    <span>Max: $${maxPrice.toLocaleString()}</span>
                </div>

                <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-size: 10px; color: #888;">ESTIMATED APR</div>
                        <div style="font-size: 16px; color: #00ff88; font-family: 'Courier New', monospace;">${(yieldRate / 100).toFixed(2)}%</div>
                    </div>
                    <button onclick="window.dispatchEvent(new CustomEvent('adjust-range', {detail: {minPrice, maxPrice}}))" 
                            style="background: transparent; border: 1px solid #00ff88; color: #00ff88; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">
                        REBALANCE
                    </button>
                </div>
            </div>
        `;
    },

    update(containerId, newData) {
        this.render(containerId, newData);
    }
};

window.LiquidityChart = LiquidityChart;
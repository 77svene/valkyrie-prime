/**
 * @title VaultCard
 * @dev Displays NFT collateral status and borrowing capacity using BigInt for precision.
 */
const VaultCard = (props) => {
    const { nftAddress, nftId, shardId, floorPrice, totalShards, userShards, image } = props;

    // Use BigInt for all financial calculations to prevent precision loss
    // floorPrice is in USDC (6 decimals), totalShards is base units
    const calculateCapacity = () => {
        try {
            const floor = BigInt(floorPrice || 0);
            const total = BigInt(totalShards || 1);
            const held = BigInt(userShards || 0);
            const ltv = 80n; // 80% LTV constant

            // (Floor * Held / Total) * LTV / 100
            const userValue = (floor * held) / total;
            const capacity = (userValue * ltv) / 100n;
            
            // Format for display: USDC has 6 decimals
            const integerPart = capacity / 1000000n;
            const fractionalPart = capacity % 1000000n;
            return `${integerPart}.${fractionalPart.toString().padStart(6, '0').substring(0, 2)}`;
        } catch (e) {
            console.error("Capacity calculation error:", e);
            return "0.00";
        }
    };

    const handleBorrowClick = () => {
        // Secure event dispatching using CustomEvent with structured detail object
        const event = new CustomEvent('open-borrow-modal', {
            detail: { 
                shardId: String(shardId),
                nftAddress: String(nftAddress),
                nftId: String(nftId),
                maxBorrow: calculateCapacity()
            },
            bubbles: true,
            composed: true
        });
        window.dispatchEvent(event);
    };

    // Robust image fallback logic
    const displayImage = image && image.startsWith('http') 
        ? image 
        : `https://via.placeholder.com/400?text=NFT+${nftId}`;

    return `
        <div class="vault-card" data-shard-id="${shardId}">
            <div class="vault-card-image">
                <img src="${displayImage}" alt="NFT ${nftId}" onerror="this.src='https://via.placeholder.com/400?text=Metadata+Error'">
                <div class="vault-badge">ID #${nftId}</div>
            </div>
            <div class="vault-card-content">
                <h3>${nftAddress.substring(0, 6)}...${nftAddress.substring(38)}</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <label>Floor Price</label>
                        <span>${(Number(floorPrice) / 1000000).toFixed(2)} USDC</span>
                    </div>
                    <div class="stat-item">
                        <label>Your Shards</label>
                        <span>${userShards} / ${totalShards}</span>
                    </div>
                </div>
                <div class="capacity-box">
                    <label>Borrowing Capacity</label>
                    <div class="capacity-value">$${calculateCapacity()}</div>
                </div>
                <button class="btn-primary full-width" onclick="this.closest('.vault-card').dispatchEvent(new CustomEvent('open-borrow-modal', {detail: {shardId: '${shardId}', maxBorrow: '${calculateCapacity()}'}, bubbles: true}))">
                    Manage Credit
                </button>
            </div>
        </div>
    `;
};

window.VaultCard = VaultCard;
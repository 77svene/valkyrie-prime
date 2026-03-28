# 🛡️ ValkyriePrime — The Fractionalized NFT-Collateralized Credit Protocol

> **Unlocking liquidity for blue-chip NFTs through ERC-1155 fractionalization and automated Uniswap V3 yield-backed credit lines.**

[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue.svg)](https://docs.soliditylang.org/)
[![Circom](https://img.shields.io/badge/Circom-ZK-ff69b4.svg)](https://docs.circom.io/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.19.0-orange.svg)](https://hardhat.org/)
[![Uniswap](https://img.shields.io/badge/Uniswap-V3-141414.svg)](https://uniswap.org/)
[![Circle](https://img.shields.io/badge/Circle-USDC-26A17B.svg)](https://www.circle.com/en/usdc)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Hackathon:** ETHGlobal HackMoney 2026 | Uniswap & Circle Tracks  
**Repo:** [https://github.com/77svene/valkyrie-prime](https://github.com/77svene/valkyrie-prime)

---

## 🚀 Problem Statement

High-value NFT collections represent significant wealth, yet they remain notoriously illiquid. Traditional DeFi lending protocols often require over-collateralization ratios that are too high for NFT holders, or they force liquidations that result in fire sales, destroying value for the ecosystem. Furthermore, NFT owners cannot easily access credit without surrendering ownership or waiting for a buyer.

**Key Pain Points:**
1.  **Illiquidity:** Blue-chip NFTs cannot be easily converted to cash without selling.
2.  **Inefficient Capital:** NFTs sit idle in wallets while owners lack liquidity for other opportunities.
3.  **Liquidation Risk:** Standard lending protocols trigger forced sales at market bottoms, harming the asset class.

## 💡 The Solution

**ValkyriePrime** is a venture-scale liquidity protocol that bridges the gap between illiquid NFT assets and DeFi credit markets. By combining ERC-1155 fractionalization with an automated credit line backed by Uniswap V3 LP positions, we allow users to borrow against their NFTs without selling them.

**Core Innovations:**
1.  **Fractionalized Credit-Shards:** NFTs are locked in the Asset Vault, issuing ERC-1155 'Credit-Shards' representing borrowing power.
2.  **Yield-Offset Credit:** Borrowed USDC is automatically deployed into Uniswap V3 concentrated liquidity positions. The generated yield offsets interest costs.
3.  **ZK Risk Sentinel:** A zero-knowledge monitoring service validates floor price oracles and health factors without exposing sensitive data.
4.  **Push-Pull Liquidation:** Instead of fire-selling the NFT, liquidators take over the debt-servicing LP positions, ensuring protocol solvency while preserving the underlying asset.

---

## 🏗️ Architecture

```text
+---------------------+       +---------------------+       +---------------------+
|      USER           |       |   VALKYRIE CORE     |       |   EXTERNAL DEFI     |
|                     |       |                     |       |                     |
|  [NFT Wallet]       |       |  [ValkyrieVault]    |       |  [Uniswap V3 Pool]  |
|       |             |       |       |             |       |       |             |
|       v             |       |       v             |       |       v             |
|  [Credit-Shards]    |<----->|  [ShardRegistry]    |<----->|  [LP Positions]     |
|       |             |       |       |             |       |       |             |
|       v             |       |       v             |       |       v             |
|  [Borrow USDC]      |       |  [Credit Engine]    |       |  [Yield Optimizer]  |
|                     |       |       |             |       |       |             |
+---------------------+       |       v             |       +---------------------+
                              |  [Risk Sentinel]    |
                              |       |             |
                              |  [ZK Circuits]      |
                              |       |             |
                              +-------+-------------+
                                      |
                              +-------v-------------+
                              |   ORACLE FEEDER     |
                              |   (Chainlink/Price) |
                              +---------------------+
```

---

## 🛠️ Tech Stack

*   **Smart Contracts:** Solidity 0.8.20, Hardhat
*   **Zero-Knowledge:** Circom, SnarkJS (for `floorProof.circom` & `healthFactor.circom`)
*   **Frontend:** Next.js 14, Tailwind CSS, Ethers.js
*   **DeFi Integration:** Uniswap V3 Router, Circle USDC
*   **Infrastructure:** IPFS (Metadata), The Graph (Analytics)

---

## 🚦 Setup Instructions

### Prerequisites
*   Node.js v18+
*   npm or yarn
*   MetaMask or compatible wallet
*   `.env` configuration for RPC and Keys

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/77svene/valkyrie-prime
    cd valkyrie-prime
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the root directory:
    ```env
    PRIVATE_KEY=your_deployer_private_key
    RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
    UNISWAP_ROUTER_ADDRESS=0xE592427A0AEce92De3Edee1F18E0157C05861564
    USDC_ADDRESS=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
    VAULT_ADDRESS=0x...
    ```

4.  **Compile Contracts & Circuits:**
    ```bash
    npm run compile
    npm run circom
    ```

5.  **Deploy Core Contracts:**
    ```bash
    npm run deploy
    ```

6.  **Start the Application:**
    ```bash
    npm run dev
    ```

7.  **Run Tests:**
    ```bash
    npm run test
    ```

---

## 📡 API Endpoints

The protocol exposes a RESTful API for frontend integration and analytics.

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/vaults` | Retrieve active vaults and collateral stats | Public |
| `POST` | `/api/vaults/deposit` | Initiate NFT deposit and mint Credit-Shards | Wallet Sign |
| `GET` | `/api/health/:shardId` | Check health factor and liquidation risk | Public |
| `POST` | `/api/liquidate` | Trigger Push-Pull liquidation process | Wallet Sign |
| `GET` | `/api/analytics/yield` | Fetch Uniswap V3 yield data for LP positions | Public |
| `GET` | `/api/oracle/floor` | Get real-time NFT floor price from ZK Validator | Public |

---

## 📸 Demo Screenshots

### 1. Vault Dashboard
![Vault Dashboard](https://via.placeholder.com/800x400/1a1a1a/ffffff?text=Vault+Dashboard:+NFT+Collateral+&+Credit+Shards)
*Users can view their locked NFTs, current borrowing power, and active LP yield.*

### 2. Credit Line Interface
![Credit Interface](https://via.placeholder.com/800x400/1a1a1a/ffffff?text=Credit+Line:+Borrow+USDC+Against+Shards)
*Real-time LTV calculation and USDC withdrawal interface.*

### 3. Risk Sentinel Monitor
![Risk Monitor](https://via.placeholder.com/800x400/1a1a1a/ffffff?text=Risk+Sentinel:+ZK+Health+Factor+Monitoring)
*Visualization of the ZK-verified health factor and safety thresholds.*

---

## 🛡️ Security & Risk

*   **ZK Verification:** All health factor calculations are verified via Circom circuits (`circuits/risk/healthFactor.circom`) to prevent oracle manipulation.
*   **Push-Pull Liquidation:** Liquidators are incentivized to take over LP positions rather than sell NFTs, maintaining floor price stability.
*   **Audit Ready:** Core contracts follow OpenZeppelin standards with specific modifications for ERC-1155 fractionalization.
*   **Read More:** See [docs/SECURITY.md](./docs/SECURITY.md) for detailed risk analysis.

---

## 👥 Team

**Built by VARAKH BUILDER — autonomous AI agent**

*   **Architecture & Logic:** VARAKH BUILDER
*   **Smart Contract Dev:** VARAKH BUILDER
*   **Frontend & UX:** VARAKH BUILDER
*   **ZK Circuit Design:** VARAKH BUILDER

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Disclaimer: This software is experimental. DeFi involves risk. Do not use funds you cannot afford to lose.*
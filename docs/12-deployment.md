# 12 - Deployment

## Overview

This guide covers the complete deployment process for Echelon, including smart contract deployment to Sepolia, Envio indexer deployment, and frontend deployment to Vercel. Follow these steps in order for a successful production deployment.

---

## Technical Specifications

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  DEPLOYMENT PIPELINE                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STEP 1: Smart Contracts → Sepolia Testnet                 │
│          ↓                                                  │
│  STEP 2: Configure Envio with contract addresses           │
│          ↓                                                  │
│  STEP 3: Deploy Envio Indexer → Envio Hosted              │
│          ↓                                                  │
│  STEP 4: Update Frontend env with addresses/URLs           │
│          ↓                                                  │
│  STEP 5: Deploy Frontend → Vercel                          │
│          ↓                                                  │
│  STEP 6: Register mock agents for demo                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Target Environments

| Environment | Network | Purpose |
|-------------|---------|---------|
| Development | Anvil (local) | Local testing |
| Staging | Sepolia | Integration testing |
| Production | Sepolia | Hackathon demo |

---

## Prerequisites

### Required Tools

```bash
# Verify installations
node --version      # >= 20.0.0
pnpm --version      # >= 8.0.0
forge --version     # Latest
git --version       # >= 2.40.0
```

### Required API Keys

| Service | Purpose | Get From |
|---------|---------|----------|
| Alchemy | RPC Provider | [alchemy.com](https://alchemy.com) |
| Pimlico | Bundler | [pimlico.io](https://pimlico.io) |
| Envio | Indexer | [envio.dev](https://envio.dev) |
| Etherscan | Verification | [etherscan.io](https://etherscan.io) |

### Environment Setup

```bash
# Copy example env
cp .env.example .env.local

# Edit with your values
nano .env.local
```

---

## Step 1: Deploy Smart Contracts

### 1.1 Prepare Deployment

```bash
# Navigate to contracts package
cd packages/contracts

# Install dependencies
forge install

# Build contracts
forge build

# Run tests
forge test
```

### 1.2 Configure Environment

```bash
# packages/contracts/.env
PRIVATE_KEY=0x...           # Deployer wallet private key
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
ETHERSCAN_API_KEY=...       # For verification
```

### 1.3 Deploy to Sepolia

```bash
# Deploy contracts
forge script script/Deploy.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  -vvvv

# Output example:
# AgentRegistry deployed to: 0x1234...
# AgentExecution deployed to: 0x5678...
```

### 1.4 Save Deployment Addresses

Create `deployments/sepolia.json`:

```json
{
  "network": "sepolia",
  "chainId": 11155111,
  "registry": "0x1234...",
  "execution": "0x5678...",
  "deployedAt": "2024-12-01T00:00:00Z",
  "deployer": "0xYOUR_ADDRESS"
}
```

### 1.5 Verify Contracts (if not auto-verified)

```bash
# Verify AgentRegistry
forge verify-contract \
  --chain sepolia \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  0x1234... \
  src/AgentRegistry.sol:AgentRegistry

# Verify AgentExecution
forge verify-contract \
  --chain sepolia \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address)" 0x1234...) \
  0x5678... \
  src/AgentExecution.sol:AgentExecution
```

---

## Step 2: Deploy Envio Indexer

### 2.1 Update Configuration

Edit `packages/indexer/config.yaml`:

```yaml
name: echelon-indexer
version: 1.0.0

networks:
  - id: 11155111  # Sepolia
    start_block: 1234567  # Block number of deployment
    contracts:
      - name: AgentRegistry
        address:
          - "0x1234..."  # Your deployed address
        handler: src/EventHandlers.ts
        events:
          - event: AgentRegistered(...)
          - event: AgentUpdated(...)
          - event: AgentDeactivated(...)
          - event: AgentReactivated(...)

      - name: AgentExecution
        address:
          - "0x5678..."  # Your deployed address
        handler: src/EventHandlers.ts
        events:
          - event: ExecutionStarted(...)
          - event: ExecutionCompleted(...)
          - event: RedelegationCreated(...)
```

### 2.2 Test Locally

```bash
cd packages/indexer

# Generate types
envio codegen

# Start local indexer
envio dev

# Verify GraphQL is working
# Open http://localhost:8080/v1/graphql
```

### 2.3 Deploy to Envio Hosted

```bash
# Login to Envio
envio login

# Deploy
envio deploy

# Output example:
# Deployed to: https://indexer.envio.dev/echelon/v1/graphql
```

### 2.4 Verify Indexer

```graphql
# Test query at your deployed URL
query {
  globalStats(id: "global") {
    totalAgents
    totalExecutions
  }
}
```

---

## Step 3: Deploy Frontend

### 3.1 Update Environment Variables

Create `packages/frontend/.env.local`:

```bash
# Network
NEXT_PUBLIC_CHAIN_ID=11155111

# RPC
NEXT_PUBLIC_ALCHEMY_API_KEY=your_key

# Contracts
NEXT_PUBLIC_REGISTRY_ADDRESS=0x1234...
NEXT_PUBLIC_EXECUTION_ADDRESS=0x5678...

# Envio
NEXT_PUBLIC_ENVIO_GRAPHQL_URL=https://indexer.envio.dev/echelon/v1/graphql

# Pimlico
NEXT_PUBLIC_PIMLICO_API_KEY=your_key

# Tokens
NEXT_PUBLIC_USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
```

### 3.2 Build and Test

```bash
cd packages/frontend

# Install dependencies
pnpm install

# Build
pnpm build

# Test locally
pnpm start
# Open http://localhost:3000
```

### 3.3 Deploy to Vercel

#### Option A: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Set environment variables
vercel env add NEXT_PUBLIC_CHAIN_ID
# ... add all variables
```

#### Option B: Vercel Dashboard

1. Connect GitHub repository
2. Import project
3. Set environment variables in dashboard
4. Deploy

### 3.4 Verify Deployment

```bash
# Check deployed URL
curl https://your-app.vercel.app/api/health

# Should return: { "status": "ok" }
```

---

## Step 4: Register Mock Agents

### 4.1 Create Registration Script

```solidity
// script/RegisterMockAgents.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentRegistry.sol";

contract RegisterMockAgents is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address registry = vm.envAddress("REGISTRY_ADDRESS");

        vm.startBroadcast(deployerKey);

        AgentRegistry reg = AgentRegistry(registry);

        // Agent 1: DCA Bot
        reg.registerAgent(
            makeAddr("agent1"),
            "AlphaBot DCA",
            "DCA",
            3,
            "ipfs://QmAgent1Metadata"
        );

        // Agent 2: Arbitrage Bot
        reg.registerAgent(
            makeAddr("agent2"),
            "SwiftArb",
            "Arbitrage",
            7,
            "ipfs://QmAgent2Metadata"
        );

        // Agent 3: Yield Optimizer
        reg.registerAgent(
            makeAddr("agent3"),
            "YieldMax",
            "Yield",
            5,
            "ipfs://QmAgent3Metadata"
        );

        vm.stopBroadcast();
    }
}
```

### 4.2 Run Registration

```bash
forge script script/RegisterMockAgents.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast
```

### 4.3 Verify Registration

```graphql
# Query your GraphQL endpoint
query {
  agents(first: 10) {
    id
    name
    strategyType
    reputationScore
  }
}
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] API keys obtained and tested
- [ ] Deployer wallet funded with Sepolia ETH

### Contract Deployment

- [ ] Contracts deployed to Sepolia
- [ ] Contracts verified on Etherscan
- [ ] Addresses saved to deployments/

### Indexer Deployment

- [ ] config.yaml updated with addresses
- [ ] start_block set correctly
- [ ] Local testing successful
- [ ] Deployed to Envio hosted
- [ ] GraphQL endpoint responding

### Frontend Deployment

- [ ] Environment variables set
- [ ] Local build successful
- [ ] Deployed to Vercel
- [ ] Connected to correct network
- [ ] GraphQL queries working

### Post-Deployment

- [ ] Mock agents registered
- [ ] Leaderboard displaying agents
- [ ] Permission granting functional
- [ ] Activity feed updating

---

## Troubleshooting

### Contract Issues

```bash
# If deployment fails
forge script script/Deploy.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --resume  # Resume failed deployment

# If verification fails
forge verify-contract --watch  # Wait for verification
```

### Indexer Issues

```bash
# Check logs
envio logs

# Restart indexer
envio restart

# Clear and resync
envio clear && envio dev
```

### Frontend Issues

```bash
# Check environment variables
vercel env ls

# Rebuild
vercel --force
```

---

## Production URLs

After deployment, you should have:

| Component | URL |
|-----------|-----|
| Frontend | `https://echelon.vercel.app` |
| GraphQL API | `https://indexer.envio.dev/echelon/v1/graphql` |
| Registry Contract | `https://sepolia.etherscan.io/address/0x...` |
| Execution Contract | `https://sepolia.etherscan.io/address/0x...` |

---

## Maintenance

### Updating Contracts

1. Deploy new version
2. Update indexer config
3. Redeploy indexer
4. Update frontend env
5. Redeploy frontend

### Monitoring

- Check Envio dashboard for indexer health
- Monitor Vercel analytics
- Watch for unusual on-chain activity

---

*See also: [Project Setup](./00-project-setup.md), [Testing](./11-testing.md)*

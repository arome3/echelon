# Echelon

**Trustless AI Agent Marketplace with Performance-Gated Permissions**

Echelon is a decentralized marketplace where AI agents compete for user permissions based on verifiable on-chain performance. Users delegate spending authority to top-ranked agents without blind trust - every agent's track record is transparently indexed and scored.

## Key Features

- **Trust Through Verification**: Reputation scores derived from indexed on-chain history
- **Granular Permissions**: ERC-7715 enables time-bound, amount-limited delegations
- **Agent Hierarchy**: A2A redelegation allows fund managers to hire specialists
- **Instant Revocation**: Users maintain full control and can revoke permissions instantly
- **Decentralized Registry**: ERC-8004 compliant agent identity system

## Tech Stack

| Layer | Technology |
|-------|------------|
| Smart Contracts | Solidity ^0.8.24 (Foundry) |
| Indexer | Envio HyperIndex |
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Web3 | wagmi, viem |
| Wallet | **MetaMask Flask 13.5.0+**, Smart Accounts Kit |

> **Important**: This project requires [MetaMask Flask](https://metamask.io/flask/) - the developer version of MetaMask that supports experimental features like ERC-7715 Advanced Permissions. Standard MetaMask will not work.

## Project Structure

```
echelon/
├── packages/
│   ├── contracts/    # Foundry smart contracts
│   ├── indexer/      # Envio indexer
│   ├── frontend/     # Next.js application
│   └── agents/       # Demo agent implementations
├── docs/             # Documentation
└── scripts/          # Utility scripts
```

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Foundry (forge, cast, anvil)
- **MetaMask Flask >= 13.5.0** (required for ERC-7715 permissions)

### MetaMask Flask Setup

Echelon uses ERC-7715 Advanced Permissions, which requires MetaMask Flask (not regular MetaMask).

1. **Install MetaMask Flask**
   - Download from [metamask.io/flask](https://metamask.io/flask/)
   - Or install directly: [Chrome Web Store](https://chrome.google.com/webstore/detail/metamask-flask/ljfoeinjpaedjfecbmggjgodbgkmjkjk)
   - **Note**: Flask and regular MetaMask cannot run simultaneously. Disable regular MetaMask first.

2. **Verify Version**
   - Open Flask → Settings → About
   - Ensure version is **13.5.0 or higher**

3. **Connect to Sepolia**
   - Flask should auto-detect Sepolia network
   - If not, add manually: Chain ID `11155111`, RPC: `https://sepolia.infura.io/v3/YOUR_KEY`

4. **Get Test ETH**
   - Use [Sepolia Faucet](https://sepoliafaucet.com/) to get test ETH

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/echelon.git
cd echelon

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your API keys

# Install Foundry dependencies
cd packages/contracts && forge install && cd ../..
```

### Development

```bash
# Start all development servers
pnpm dev

# Or run individual packages
pnpm frontend:dev    # Start frontend
pnpm indexer:dev     # Start indexer
pnpm contracts:test  # Run contract tests
```

### Build

```bash
# Build all packages
pnpm build

# Build specific package
pnpm contracts:build
pnpm frontend:build
```

### Deploy

```bash
# Deploy contracts to Sepolia
pnpm deploy:contracts

# Deploy indexer to Envio hosted service
pnpm deploy:indexer

# Deploy frontend to Vercel
pnpm deploy:frontend
```

### Oracle Sync Service

The Oracle Sync service bridges reputation scores from the Envio indexer to the on-chain oracle, enabling reputation-gated permissions. See [docs/13-oracle-sync-service.md](./docs/13-oracle-sync-service.md) for full documentation.

```bash
# Quick start with PM2 (recommended)
cd packages/agents
cp .env.example .env  # Configure with your values
npm install -g pm2
npm run pm2:start
npm run pm2:logs

# Or with Docker
docker-compose up -d oracle-sync
docker-compose logs -f oracle-sync
```

## Environment Variables

See `.env.example` for required environment variables:

- `NEXT_PUBLIC_ALCHEMY_API_KEY` - Alchemy RPC provider
- `NEXT_PUBLIC_PIMLICO_API_KEY` - Pimlico bundler
- `ENVIO_API_KEY` - Envio indexer
- `PRIVATE_KEY` - Deployer wallet (DO NOT COMMIT!)

## Documentation

- [Project Setup](./docs/00-project-setup.md)
- [Smart Contracts](./docs/01-smart-contracts.md)
- [Envio Indexer](./docs/02-envio-indexer.md)
- [Frontend Application](./docs/03-frontend-application.md)
- [Permission System](./docs/04-permission-system.md)
- [Agent Implementation](./docs/05-agent-implementation.md)
- [A2A Delegation](./docs/06-a2a-delegation.md)
- [Reputation System](./docs/07-reputation-system.md)
- [Oracle Sync Service](./docs/13-oracle-sync-service.md)

## Network

- **Target Network**: Sepolia Testnet
- **Chain ID**: 11155111
- **USDC Address**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`

## Related Standards

- [ERC-7715](https://eips.ethereum.org/EIPS/eip-7715) - Grant Permissions Standard (requires Flask)
- [ERC-7710](https://eips.ethereum.org/EIPS/eip-7710) - Signed Delegation Standard (A2A)
- [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) - Agent Registry Standard
- [ERC-721](https://eips.ethereum.org/EIPS/eip-721) - Non-Fungible Token Standard

## Hackathon

This project was built for the **MetaMask Advanced Permissions Hackathon**.

**Tracks:**
- Most Creative Use of Advanced Permissions
- Best Use of Envio

**Demo Requirements:**
- MetaMask Flask 13.5.0+ installed
- Connected to Sepolia testnet
- Test ETH for gas fees

## License

MIT

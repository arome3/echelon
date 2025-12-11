# 00 - Project Setup

## Overview

This document covers the complete setup process for the Echelon platform, including the monorepo structure, development environment requirements, dependencies installation, and environment configuration. Following this guide will prepare your development environment for working with all Echelon components.

---

## Technical Specifications

### Development Environment Requirements

```bash
# Required software
- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Foundry (forge, cast, anvil)
- Git >= 2.40.0
- Docker (optional, for local Envio)

# Recommended IDE
- VS Code with extensions:
  - Solidity (Juan Blanco)
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
```

### External Services Required

| Service | Purpose | Required |
|---------|---------|----------|
| Alchemy/Infura | RPC Provider | Yes |
| Pimlico | Bundler + Paymaster | Yes |
| Envio Hosted | Indexer Hosting | Yes |
| Vercel | Frontend Hosting | Optional |
| IPFS (Pinata) | Metadata Storage | Optional |

---

## Key Capabilities

- **Monorepo Management**: Turborepo for efficient builds and caching
- **Package Management**: pnpm workspaces for dependency management
- **Multi-Package Development**: Simultaneous development of contracts, indexer, frontend, and agents
- **Environment Isolation**: Separate configurations for development, staging, and production

---

## Implementation Guide

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/your-org/echelon.git
cd echelon

# Install dependencies using pnpm
pnpm install

# Verify installation
pnpm --version  # Should be >= 8.0.0
node --version  # Should be >= 20.0.0
```

### 2. Install Foundry

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash

# Reload shell
source ~/.bashrc  # or ~/.zshrc

# Install Foundry tools
foundryup

# Verify installation
forge --version
cast --version
anvil --version
```

### 3. Project Structure

```
echelon/
│
├── packages/
│   ├── contracts/                 # Smart contracts (Foundry)
│   │   ├── src/
│   │   │   ├── AgentRegistry.sol
│   │   │   ├── AgentExecution.sol
│   │   │   ├── interfaces/
│   │   │   │   ├── IAgentRegistry.sol
│   │   │   │   └── IAgentExecution.sol
│   │   │   └── libraries/
│   │   │       └── ReputationLib.sol
│   │   ├── test/
│   │   ├── script/
│   │   ├── foundry.toml
│   │   └── remappings.txt
│   │
│   ├── indexer/                   # Envio indexer
│   │   ├── src/
│   │   │   ├── EventHandlers.ts
│   │   │   ├── utils/
│   │   │   └── types/
│   │   ├── schema.graphql
│   │   ├── config.yaml
│   │   └── package.json
│   │
│   ├── frontend/                  # Next.js application
│   │   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── graphql/
│   │   └── package.json
│   │
│   └── agents/                    # Mock agents for demo
│       ├── src/
│       └── package.json
│
├── docs/                          # Documentation
├── scripts/                       # Utility scripts
├── .github/                       # CI/CD workflows
│
├── package.json                   # Root package.json
├── pnpm-workspace.yaml
├── turbo.json
├── .env.example
└── README.md
```

### 4. Configure Root Package

#### package.json

```json
{
  "name": "echelon",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "deploy:contracts": "pnpm --filter contracts run deploy",
    "deploy:indexer": "pnpm --filter indexer run deploy",
    "deploy:frontend": "pnpm --filter frontend run deploy"
  },
  "devDependencies": {
    "turbo": "^1.10.0",
    "typescript": "^5.3.0"
  }
}
```

#### pnpm-workspace.yaml

```yaml
packages:
  - "packages/*"
```

#### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "out/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    }
  }
}
```

### 5. Environment Configuration

#### .env.example Template

```bash
# ===========================================
# Network Configuration
# ===========================================
NEXT_PUBLIC_CHAIN_ID=11155111

# ===========================================
# RPC Providers
# ===========================================
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_key

# ===========================================
# Contract Addresses (update after deployment)
# ===========================================
NEXT_PUBLIC_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_EXECUTION_ADDRESS=0x...

# ===========================================
# Envio Configuration
# ===========================================
NEXT_PUBLIC_ENVIO_GRAPHQL_URL=http://localhost:8080/v1/graphql
ENVIO_API_KEY=your_envio_key

# ===========================================
# Bundler (Pimlico)
# ===========================================
NEXT_PUBLIC_PIMLICO_API_KEY=your_pimlico_key

# ===========================================
# WalletConnect (optional)
# ===========================================
NEXT_PUBLIC_WALLETCONNECT_ID=your_wc_project_id

# ===========================================
# Token Addresses (Sepolia)
# ===========================================
NEXT_PUBLIC_USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238

# ===========================================
# Deployment (DO NOT COMMIT!)
# ===========================================
PRIVATE_KEY=0x...
ETHERSCAN_API_KEY=your_etherscan_key
```

### 6. Obtain API Keys

#### Alchemy

1. Create account at [alchemy.com](https://www.alchemy.com/)
2. Create new app for Sepolia network
3. Copy API key to `NEXT_PUBLIC_ALCHEMY_API_KEY`

#### Pimlico

1. Create account at [pimlico.io](https://pimlico.io/)
2. Create API key for Sepolia
3. Copy to `NEXT_PUBLIC_PIMLICO_API_KEY`

#### Envio

1. Sign up at [envio.dev](https://envio.dev/)
2. Get API key from dashboard
3. Copy to `ENVIO_API_KEY`

#### Etherscan

1. Create account at [etherscan.io](https://etherscan.io/)
2. Generate API key
3. Copy to `ETHERSCAN_API_KEY`

### 7. Verify Setup

```bash
# Run all checks
pnpm install

# Test contracts compilation
cd packages/contracts && forge build

# Test frontend build
cd packages/frontend && pnpm build

# Start development server
pnpm dev
```

---

## Dependencies

### Root Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| turbo | ^1.10.0 | Monorepo build system |
| typescript | ^5.3.0 | Type checking |

### Per-Package Dependencies

See individual package documentation:
- [Smart Contracts](./01-smart-contracts.md#dependencies)
- [Envio Indexer](./02-envio-indexer.md#dependencies)
- [Frontend](./03-frontend-application.md#dependencies)
- [Agents](./05-agent-implementation.md#dependencies)

---

## Common Commands

```bash
# Development
pnpm dev                    # Start all dev servers
pnpm build                  # Build all packages
pnpm test                   # Run all tests
pnpm lint                   # Lint all packages

# Individual packages
pnpm --filter contracts     # Run command in contracts package
pnpm --filter frontend      # Run command in frontend package
pnpm --filter indexer       # Run command in indexer package
```

---

## Next Steps

1. [Deploy Smart Contracts](./01-smart-contracts.md)
2. [Set up Envio Indexer](./02-envio-indexer.md)
3. [Configure Frontend](./03-frontend-application.md)

---

*See also: [Deployment Guide](./12-deployment.md)*

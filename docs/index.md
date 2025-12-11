# Echelon Documentation

**Trustless AI Agent Marketplace with Performance-Gated Permissions**

---

## Overview

Echelon is a trustless marketplace where AI agents compete for user permissions based on verifiable on-chain performance. Users delegate spending authority to top-ranked agents without blind trust—every agent's track record is transparently indexed and scored by Envio.

### Core Innovation

Traditional approaches to agent delegation require users to either:
- Trust agents blindly (risky)
- Give full wallet access (dangerous)
- Avoid agents entirely (miss opportunities)

Echelon introduces **performance-gated permissions**: agents earn the right to manage user funds through demonstrated on-chain competence, not promises.

### Key Differentiators

| Feature | Description |
|---------|-------------|
| **Trust Through Verification** | Reputation scores derived from indexed on-chain history |
| **Granular Permissions** | ERC-7715 enables time-bound, amount-limited delegations |
| **Agent Hierarchy** | A2A redelegation allows fund managers to hire specialists |
| **Instant Revocation** | Users maintain full control and can revoke any permission instantly |
| **Decentralized Registry** | ERC-8004 compliant agent identity system |

---

## Documentation Index

### Setup & Configuration

| Document | Description |
|----------|-------------|
| [00 - Project Setup](./00-project-setup.md) | Monorepo structure, dependencies, environment configuration |
| [12 - Deployment](./12-deployment.md) | Contract, indexer, and frontend deployment guide |

### Smart Contracts

| Document | Description |
|----------|-------------|
| [01 - Smart Contracts](./01-smart-contracts.md) | AgentRegistry (ERC-8004) and AgentExecution contracts |
| [04 - Permission System](./04-permission-system.md) | ERC-7715 permission granting, revoking, management |

### Indexing & API

| Document | Description |
|----------|-------------|
| [02 - Envio Indexer](./02-envio-indexer.md) | GraphQL schema, event handlers, configuration |
| [07 - Reputation System](./07-reputation-system.md) | Score calculation algorithm, metrics |
| [08 - GraphQL API](./08-graphql-api.md) | Queries, fragments, subscriptions |

### Frontend

| Document | Description |
|----------|-------------|
| [03 - Frontend Application](./03-frontend-application.md) | Next.js setup, components, routing |
| [09 - User Dashboard](./09-user-dashboard.md) | Permission management, activity monitoring |

### Agents

| Document | Description |
|----------|-------------|
| [05 - Agent Implementation](./05-agent-implementation.md) | Base agent class, specialized agents |
| [06 - A2A Delegation](./06-a2a-delegation.md) | Agent-to-agent redelegation flow |

### Quality & Security

| Document | Description |
|----------|-------------|
| [10 - Security](./10-security.md) | Contract, frontend, and agent security considerations |
| [11 - Testing](./11-testing.md) | Testing strategies for all components |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ECHELON SYSTEM                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │   CONTRACTS │  │    ENVIO    │  │  FRONTEND   │  │   AGENTS  │ │
│  │             │  │   INDEXER   │  │             │  │           │ │
│  │ - Registry  │  │             │  │ - Next.js   │  │ - Manager │ │
│  │ - Execution │  │ - Schema    │  │ - React     │  │ - Workers │ │
│  │             │  │ - Handlers  │  │ - wagmi     │  │           │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘ │
│         │                │                │                │       │
│         └────────────────┴────────────────┴────────────────┘       │
│                              │                                      │
│                      ┌───────────────┐                             │
│                      │    SEPOLIA    │                             │
│                      │   TESTNET     │                             │
│                      └───────────────┘                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Smart Contracts | Solidity | ^0.8.24 |
| Contract Framework | Foundry | Latest |
| Indexer | Envio HyperIndex | ^2.0.0 |
| Frontend Framework | Next.js | 14.x |
| React | React | 18.x |
| Styling | Tailwind CSS | 3.x |
| Web3 Library | viem | ^2.0.0 |
| Wallet Hooks | wagmi | ^2.0.0 |
| GraphQL Client | Apollo Client | ^3.8.0 |
| MetaMask SDK | @metamask/delegation-toolkit | Latest |
| Smart Accounts | @metamask/smart-accounts-kit | Latest |
| Node.js | Node.js | ^20.0.0 |
| Package Manager | pnpm | ^8.0.0 |

---

## Quick Start

```bash
# Clone repository
git clone https://github.com/your-org/echelon.git
cd echelon

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your values

# Start development
pnpm dev
```

See [00 - Project Setup](./00-project-setup.md) for detailed setup instructions.

---

## Target Network

- **Network**: Sepolia Testnet
- **Chain ID**: 11155111
- **USDC Address**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`

---

## Related Standards

- [ERC-7715](https://eips.ethereum.org/EIPS/eip-7715) - Grant Permissions Standard
- [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) - Agent Registry Standard
- [ERC-721](https://eips.ethereum.org/EIPS/eip-721) - Non-Fungible Token Standard

---

*Documentation Version: 1.0.0*
*Last Updated: December 2024*

# 10 - Security

## Overview

Security is paramount for Echelon as it handles user permissions and financial operations. This document covers security considerations and mitigations across all system layers: smart contracts, frontend, agents, and infrastructure.

---

## Technical Specifications

### Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              SMART CONTRACT LAYER                    │  │
│  │  - ReentrancyGuard                                  │  │
│  │  - Access Control (Ownable)                         │  │
│  │  - Input Validation                                 │  │
│  │  - Integer Overflow Protection (Solidity ^0.8)      │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                 FRONTEND LAYER                       │  │
│  │  - XSS Prevention (React escaping)                  │  │
│  │  - Input Sanitization                               │  │
│  │  - No Private Key Handling                          │  │
│  │  - HTTPS Only                                       │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                  AGENT LAYER                         │  │
│  │  - Secure Key Management                            │  │
│  │  - Rate Limiting                                    │  │
│  │  - Permission Boundary Enforcement                  │  │
│  │  - Error Handling                                   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              INFRASTRUCTURE LAYER                    │  │
│  │  - Environment Variable Management                  │  │
│  │  - API Key Rotation                                 │  │
│  │  - Secure RPC Endpoints                             │  │
│  │  - Access Logging                                   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Smart Contract Security

### Vulnerabilities & Mitigations

| Vulnerability | Risk | Mitigation |
|--------------|------|------------|
| Reentrancy | High | `ReentrancyGuard` on all state-changing functions |
| Integer Overflow | High | Solidity ^0.8 built-in checks |
| Access Control | High | `onlyOwner` and require statements |
| Front-running | Medium | Not critical (logging only) |
| Signature Replay | Medium | ERC-7715 standard handles this |
| Denial of Service | Medium | Gas-efficient loops, pagination |

### Security Patterns Used

```solidity
// ReentrancyGuard implementation
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract AgentRegistry is ReentrancyGuard {
    function registerAgent(...) external nonReentrant {
        // State changes protected from reentrancy
    }
}

// Access control
import "@openzeppelin/contracts/access/Ownable.sol";

contract AgentRegistry is Ownable {
    function addStrategyType(string calldata strategyType) external onlyOwner {
        // Only owner can modify
    }
}

// Input validation
function registerAgent(
    address walletAddress,
    string calldata name,
    uint8 riskLevel
) external {
    require(walletAddress != address(0), "Invalid wallet address");
    require(bytes(name).length >= 3, "Name too short");
    require(riskLevel >= 1 && riskLevel <= 10, "Invalid risk level");
    // ...
}
```

### Audit Checklist

- [ ] All external functions have reentrancy protection
- [ ] No unbounded loops that could cause gas issues
- [ ] All user inputs are validated
- [ ] Access control on admin functions
- [ ] Events emitted for all state changes
- [ ] No hardcoded addresses (use constructor params)
- [ ] Contracts are upgradeable if needed

---

## Frontend Security

### Vulnerabilities & Mitigations

| Vulnerability | Risk | Mitigation |
|--------------|------|------------|
| XSS | High | React's built-in escaping, no `dangerouslySetInnerHTML` |
| CSRF | Medium | SameSite cookies, origin verification |
| Private Key Exposure | Critical | Never handle keys in frontend |
| Malicious Agents | High | Display reputation scores prominently |
| Clickjacking | Medium | X-Frame-Options header |
| Open Redirects | Medium | Validate all redirect URLs |

### Security Best Practices

```typescript
// Never store sensitive data in localStorage
// BAD:
localStorage.setItem("privateKey", key);

// GOOD: Use wallet connection only
const { address } = useAccount();

// Sanitize user input before display
// React escapes by default, but extra caution with URLs
function AgentLink({ agent }) {
  // Validate URL before rendering
  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return url.startsWith("https://");
    } catch {
      return false;
    }
  };

  return isValidUrl(agent.metadataUri) ? (
    <a href={agent.metadataUri}>View Metadata</a>
  ) : null;
}

// Validate transaction parameters
function validatePermissionParams(params: PermissionParams) {
  if (!params.agentAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    throw new Error("Invalid agent address");
  }
  if (parseFloat(params.amount) <= 0) {
    throw new Error("Amount must be positive");
  }
  if (params.duration < 3600) {
    throw new Error("Minimum duration is 1 hour");
  }
}
```

### Content Security Policy

```typescript
// next.config.js
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval';
      style-src 'self' 'unsafe-inline';
      connect-src 'self' https://*.alchemy.com https://*.envio.dev;
      frame-ancestors 'none';
    `.replace(/\n/g, ""),
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
];
```

---

## Agent Security

### Vulnerabilities & Mitigations

| Vulnerability | Risk | Mitigation |
|--------------|------|------------|
| Private Key Theft | Critical | Secure key management, HSM |
| API Key Exposure | High | Environment variables, never commit |
| Permission Abuse | High | Rate limiting, per-trade limits |
| Code Injection | High | Input validation on all parameters |
| Memory Leaks | Medium | Proper cleanup, monitoring |

### Secure Key Management

```typescript
// NEVER do this:
const PRIVATE_KEY = "0x1234..."; // Hardcoded key

// ALWAYS use environment variables:
const privateKey = process.env.AGENT_PRIVATE_KEY;
if (!privateKey) {
  throw new Error("AGENT_PRIVATE_KEY not configured");
}

// For production, use secure key management:
// - AWS Secrets Manager
// - HashiCorp Vault
// - Hardware Security Modules (HSM)

// Example with AWS Secrets Manager:
import { SecretsManager } from "@aws-sdk/client-secrets-manager";

async function getAgentKey(): Promise<string> {
  const client = new SecretsManager({ region: "us-east-1" });
  const response = await client.getSecretValue({
    SecretId: "echelon/agent/private-key",
  });
  return response.SecretString!;
}
```

### Rate Limiting

```typescript
class RateLimiter {
  private executions: number[] = [];
  private readonly maxPerHour: number;

  constructor(maxPerHour: number = 60) {
    this.maxPerHour = maxPerHour;
  }

  canExecute(): boolean {
    const now = Date.now();
    const hourAgo = now - 3600000;

    // Remove old entries
    this.executions = this.executions.filter((t) => t > hourAgo);

    if (this.executions.length >= this.maxPerHour) {
      return false;
    }

    this.executions.push(now);
    return true;
  }
}

// Usage in agent
const rateLimiter = new RateLimiter(60);

async function executeStrategy() {
  if (!rateLimiter.canExecute()) {
    console.log("Rate limit exceeded, waiting...");
    return;
  }
  // Execute strategy
}
```

---

## Infrastructure Security

### Environment Variables

```bash
# .env - NEVER COMMIT THIS FILE

# Private keys - use secure secrets management in production
PRIVATE_KEY=0x...                    # Deployer key
AGENT_PRIVATE_KEY=0x...              # Agent execution key

# API Keys - rotate regularly
ALCHEMY_API_KEY=...
PIMLICO_API_KEY=...
ENVIO_API_KEY=...
ETHERSCAN_API_KEY=...

# Public values (safe to expose)
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_REGISTRY_ADDRESS=0x...
```

### .gitignore Security

```gitignore
# Environment files
.env
.env.local
.env.*.local
*.pem
*.key

# Deployment artifacts with sensitive data
deployments/*.json

# IDE
.idea/
.vscode/settings.json

# Build outputs
node_modules/
.next/
out/
```

### Secure Deployment

```bash
# Verify contract before deployment
forge verify-contract \
  --chain sepolia \
  --compiler-version v0.8.24 \
  $CONTRACT_ADDRESS \
  src/AgentRegistry.sol:AgentRegistry

# Use hardware wallet for production deployments
# Never use plaintext private keys in production

# Rotate API keys after suspected exposure
# Monitor for unusual activity patterns
```

---

## Security Monitoring

### Key Metrics to Monitor

| Metric | Threshold | Action |
|--------|-----------|--------|
| Failed executions spike | >20% | Investigate agent behavior |
| Large permission grants | >$10k | Manual review |
| Rapid permission changes | >10/hour | Check for automation |
| New agent with high volume | First 24h | Monitor closely |

### Incident Response

1. **Detection**: Automated alerts for anomalies
2. **Containment**: Ability to pause agents/permissions
3. **Analysis**: Full audit trail via Envio
4. **Recovery**: Transparent communication
5. **Prevention**: Update security measures

---

## Security Checklist

### Pre-Launch

- [ ] Smart contract audit completed
- [ ] Frontend security review
- [ ] Penetration testing
- [ ] API key rotation policy
- [ ] Incident response plan

### Ongoing

- [ ] Monitor for unusual patterns
- [ ] Regular dependency updates
- [ ] Security advisory reviews
- [ ] Periodic access review
- [ ] Backup verification

---

*See also: [Smart Contracts](./01-smart-contracts.md), [Testing](./11-testing.md)*

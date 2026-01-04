import { createWalletClient, createPublicClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import dotenv from 'dotenv';

dotenv.config();

const EXECUTION_ADDRESS = process.env.EXECUTION_ADDRESS as `0x${string}`;
const FUND_MANAGER_KEY = process.env.PRIVATE_KEY as `0x${string}`;
const USER_ADDRESS = '0xb9dEb04d8a1ddf65444aC0e4473Bc8A7aD0AbAf1' as `0x${string}`;

// Use PublicNode to avoid rate limits
const RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';

const account = privateKeyToAccount(FUND_MANAGER_KEY);

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(RPC_URL),
});

const abi = parseAbi([
  'function logRedelegation(uint256 childAgentId, address userAddress, uint256 amount, uint256 duration) external'
]);

const agents = [
  { id: 3, name: 'ArbitrageKing', amount: 250_000000n },
  { id: 4, name: 'DCAWizard', amount: 250_000000n },
  { id: 5, name: 'MomentumMaster', amount: 150_000000n },
];

async function main() {
  console.log('Creating redelegations for failed agents...\n');

  for (const agent of agents) {
    const amountFormatted = (Number(agent.amount) / 1e6).toFixed(2);
    console.log(`→ Delegating to ${agent.name} (ID ${agent.id}): ${amountFormatted} USDC`);

    try {
      const hash = await walletClient.writeContract({
        address: EXECUTION_ADDRESS,
        abi,
        functionName: 'logRedelegation',
        args: [BigInt(agent.id), USER_ADDRESS, agent.amount, 604800n],
      });

      console.log(`  📨 TX: ${hash}`);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`  ✅ Confirmed in block ${receipt.blockNumber}\n`);

      // Small delay between transactions
      await new Promise(r => setTimeout(r, 2000));
    } catch (err: any) {
      const msg = err.message || String(err);
      console.log(`  ❌ Failed: ${msg.slice(0, 100)}\n`);
    }
  }

  console.log('Done!');
}

main();

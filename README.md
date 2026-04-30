# Kickstarter for Plans

> On-chain group commitment + escrow for real-world events.
> Organizers set a cost, an attendee threshold, and a deadline. USDC sits in the
> contract until the threshold is hit — then it pays out, or refunds, automatically.

NYU Stern Blockchain & Fintech Club · Mentee Capstone · Dev Track · 2025–26

---

## What's in this repo

This is a **working frontend prototype** of the dApp described in the capstone deck,
plus the production Solidity contract that the frontend will eventually talk to.

```
.
├── contracts/              # Production Solidity contract (Foundry)
│   └── PlanEscrow.sol      # Plan struct, state machine, USDC escrow, claim
├── test/                   # Foundry tests
│   └── PlanEscrow.t.sol    # Happy path, refunds, reentrancy, double-claim
├── src/                    # React + Vite + TypeScript frontend
│   ├── components/         # Browse, Create, PlanDetail views
│   ├── lib/                # Simulated contract store + types + format helpers
│   └── data/seed.ts        # Pre-seeded demo plans (Atera dinner)
├── foundry.toml
├── vercel.json
└── package.json
```

The frontend currently runs in **demo mode** with a simulated wallet and an
in-browser state store that mirrors the contract's behavior 1-to-1
(`Pending → Confirmed/Failed`, `approve` → `commit`, organizer claim, refund claim).
This means the deployed Vercel site is fully interactive without any wallet, RPC,
or testnet USDC. The Solidity contract sits in `/contracts` ready for deployment;
swapping the simulated store for `viem`/`wagmi` reads and writes is a Week 4 task.

## Stack

| Layer        | Tools                                                            |
| ------------ | ---------------------------------------------------------------- |
| Smart contract | Solidity 0.8.24 · Foundry · OpenZeppelin (`SafeERC20`, `ReentrancyGuard`) |
| Frontend     | React 18 · Vite · TypeScript · Tailwind CSS                      |
| Future wallet/auth | Privy (embedded wallets + social login)                    |
| Future RPC layer | viem (`publicClient` / `walletClient`) · wagmi hooks         |
| Network      | Base Sepolia (USDC, 6 decimals)                                  |
| Hosting      | Vercel (frontend) · Base Sepolia (contract)                      |

## Run locally

```bash
npm install
npm run dev      # → http://localhost:5173
```

## Deploy to Vercel

The repo includes `vercel.json` so it's a one-click deploy.

```bash
# option 1: CLI
npm install -g vercel
vercel --prod

# option 2: GitHub
# 1. push this repo to GitHub
# 2. go to vercel.com/new
# 3. import the repo — Vercel auto-detects Vite, no config needed
```

## Push to GitHub

```bash
cd kickstarter-for-plans
git init
git add .
git commit -m "feat: initial prototype"
git branch -M main
git remote add origin https://github.com/<your-username>/kickstarter-for-plans.git
git push -u origin main
```

## Demo flow

1. Open the site → **Connect Wallet** → you get a sandboxed wallet with 5,000 mock USDC.
2. **Browse** → click the seeded **Dinner at Atera** plan.
3. **Commit $300 USDC** → watch the two-step `approve → commit` sequence.
4. **Fast-forward to deadline** (demo cheat in the action card) → call **Finalize**.
5. If threshold is met → organizer hits **Claim**. If not → committers hit **Refund**.

There's a **Reset** button in the demo banner to wipe state and start fresh.

## Smart contract

The contract in `contracts/PlanEscrow.sol` is the real one — it'll be what's
deployed to Base Sepolia. Key properties:

- `SafeERC20` for all USDC transfers (handles non-standard ERC-20s defensively)
- `ReentrancyGuard` on `commit()` and `claim()`
- `hasClaimed` mapping prevents double-claims/refunds
- Custom errors instead of `require` strings (cheaper)
- All state transitions go through `finalize()` — no implicit state changes
- USDC 6-decimal math: $300 = `300_000_000`

### Run the tests

```bash
forge install OpenZeppelin/openzeppelin-contracts foundry-rs/forge-std
forge test -vv
```

### Deploy the contract

```bash
cp .env.example .env
# fill in DEPLOYER_PRIVATE_KEY and BASE_SEPOLIA_RPC_URL

forge create contracts/PlanEscrow.sol:PlanEscrow \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --constructor-args 0x036CbD53842c5426634e7929541eC2318f3dCF7e
# (Base Sepolia USDC address)
```

Then set `VITE_PLAN_CONTRACT_ADDRESS` in `.env.local` and start swapping the
simulated `store.ts` for real `viem` reads/writes.

## License

MIT

# SETTL-ECO

SETTL-ECO is a HashKey-native receivables financing and settlement stack. It combines a React operator surface, a Hardhat contract suite, compliance-aware gating, buyer acknowledgement, capital deployment, settlement routing, disputes, and reputation updates into one end-to-end flow.

This repo contains:

- a Vite/React frontend for seller, buyer, LP, and admin workspaces
- Solidity v2 contracts for the HashKey lifecycle
- deployment and smoke-test scripts for HashKey testnet
- demo mode and live mode runtime wiring

## What The Product Does

SETTL-ECO turns a receivable into an operational workflow:

1. A seller creates a receivable with amount, due date, requested advance, holdback, and document hash.
2. A buyer acknowledges or rejects it.
3. Compliance approval determines whether the receivable can move into finance eligibility.
4. A liquidity provider funds the advance.
5. The buyer settles the receivable through the settlement router.
6. Funds are split into protocol fee, LP repayment, seller net proceeds, and optional holdback.
7. Reputation updates and dispute handling remain onchain and auditable.

## HashKey End-To-End Flow

### 1. Compliance

`ComplianceGate` supports two paths:

- official HashKey KYC sync when `VITE_HASHKEY_KYC_SBT_ADDRESS` is configured
- self-serve fallback in local/test flows when no official KYC contract is wired

The frontend surfaces the official HashKey KYC portal and reads live KYC state when available.

### 2. Receivable Origination

`ReceivableRegistryV2.createReceivable(...)` stores:

- seller
- buyer
- receivable amount
- requested advance
- holdback basis points
- issue and due dates
- document metadata hash
- reference code

Status progression starts at `Issued`.

### 3. Buyer Acknowledgement

`ReceivableRegistryV2.acknowledgeReceivable(...)` is buyer-only.

- rejection moves the receivable to `Rejected`
- approval moves it to `BuyerAcknowledged`
- if both sides are compliant, it advances to `FinanceEligible`

### 4. Advance Funding

`AdvanceEngineV2.fundReceivable(...)` lets an approved LP fund a finance-eligible receivable.

- the LP transfers DemoUSDC to the seller
- the registry marks the receivable as `Funded`
- reputation records financing history
- expected repayment is derived from the requested advance plus yield

Current default yield in the contract is `600` bps.

### 5. Settlement Routing

`SettlementRouterV2.settleReceivable(...)` accepts buyer payment and executes the waterfall:

- protocol fee to treasury
- LP repayment if the receivable was funded
- seller net transfer
- holdback retained inside router accounting until release
- HSP settlement request + completion record through `HspSettlementAdapter`
- reputation updates based on timing and cleared status

Current deployed protocol fee is `50` bps.

### 6. Holdback Release

`SettlementRouterV2.releaseHoldback(...)` can clear retained holdback to the seller and finalize the receivable as `Cleared`.

### 7. Disputes

`DisputeEscrow` allows seller or buyer to:

- open a dispute
- push the receivable into `Disputed`
- resolve it back to `Paid` or `FinanceEligible`

### 8. Reputation

`ReputationV2` tracks:

- financed volume
- settled volume
- on-time settlements
- dispute count
- cleared receivables
- recommended advance bands

## Contract Stack

The current v2 stack is:

- `contracts/v2/ComplianceGate.sol`
- `contracts/v2/ReceivableRegistryV2.sol`
- `contracts/v2/FundingPoolV2.sol`
- `contracts/v2/AdvanceEngineV2.sol`
- `contracts/v2/HspSettlementAdapter.sol`
- `contracts/v2/SettlementRouterV2.sol`
- `contracts/v2/DisputeEscrow.sol`
- `contracts/v2/ReputationV2.sol`
- `contracts/DemoUSDC.sol`

`FundingPoolV2` exists in the deployment topology, although the tested lifecycle currently routes LP funding directly through `AdvanceEngineV2`.

## Frontend Surface

The app runs as a role-aware operating system with:

- landing and connect flows
- seller workspace
- buyer workspace
- capital workspace
- risk workspace
- settlement workspace
- admin workspace
- analytics, activity, and settings

Live mode uses:

- Privy embedded wallet auth
- Wagmi + viem
- HashKey testnet chain configuration
- live contract reads and writes when addresses are configured

Demo mode keeps the entire UX interactive with seeded users, receivables, disputes, settlements, and analytics.

## Runtime Modes

### Demo mode

Use demo mode when you want the UI without live contract dependencies.

Recommended env:

```bash
VITE_SETTL_MODE=demo
VITE_HSP_MODE=mock
```

### Live mode

Use live mode when you want to connect a wallet and interact with deployed HashKey contracts.

Recommended env:

```bash
VITE_SETTL_MODE=live
VITE_HSP_MODE=live
```

## Local Setup

```bash
cp .env.example .env
npm install
npm run build
npm run dev
```

App URL defaults to Vite local dev output.

## Environment Variables

### Chain and RPC

- `VITE_HASHKEY_TESTNET_CHAIN_ID=133`
- `VITE_HASHKEY_TESTNET_RPC_URL`
- `VITE_HASHKEY_TESTNET_EXPLORER`
- `VITE_HASHKEY_MAINNET_CHAIN_ID=177`
- `VITE_HASHKEY_MAINNET_RPC_URL`
- `VITE_HASHKEY_MAINNET_EXPLORER`
- `HASHKEY_TESTNET_RPC_URL`
- `HASHKEY_MAINNET_RPC_URL`

### Deployment

- `DEPLOYER_PRIVATE_KEY`
- `HASHKEY_EXPLORER_API_KEY`

### Privy

- `VITE_PRIVY_APP_ID`
- `PRIVY_APP_SECRET`

### HSP

- `VITE_HSP_API_BASE_URL`
- `HSP_API_KEY`

### HashKey integrations

- `VITE_HASHKEY_KYC_SBT_ADDRESS`
- `HASHKEY_KYC_SBT_ADDRESS`
- `VITE_HASHKEY_KYC_PORTAL_URL`
- `VITE_HASHKEY_SAFE_TESTNET_URL`
- `VITE_HASHKEY_SAFE_MAINNET_URL`
- `VITE_HASHKEY_SAFE_TX_SERVICE_URL`

### Contract addresses

- `VITE_DEMO_USDC_ADDRESS`
- `VITE_COMPLIANCE_GATE_ADDRESS`
- `VITE_RECEIVABLE_REGISTRY_ADDRESS`
- `VITE_RECEIVABLE_TOKEN_ADDRESS`
- `VITE_FUNDING_POOL_ADDRESS`
- `VITE_ADVANCE_ENGINE_ADDRESS`
- `VITE_REPUTATION_ADDRESS`
- `VITE_SETTLEMENT_ROUTER_ADDRESS`
- `VITE_HSP_SETTLEMENT_ADAPTER_ADDRESS`
- `VITE_DISPUTE_ESCROW_ADDRESS`

## NPM Scripts

```bash
npm run dev
npm run build
npm run lint
npm run compile
npm run test
npm run deploy:hashkey:testnet
npm run deploy:hashkey:mainnet
npm run verify
```

Notes:

- `npm run build` compiles contracts before building the frontend
- `npm run test` runs the Hardhat test suite
- `npm run deploy:hashkey:testnet` writes deployment output to `contracts.v2.json`

## Deployment

HashKey deployment entrypoint:

```bash
npm run deploy:hashkey:testnet
```

The deploy script:

- deploys DemoUSDC
- deploys the compliance, registry, funding, advance, adapter, router, dispute, and reputation contracts
- assigns operator permissions across modules
- writes contract addresses and metadata into `contracts.v2.json`

## Live Smoke Flow

The repo includes a HashKey smoke script:

```bash
npx hardhat run scripts/live-smoke-hashkey-v2.cjs --network hashkeyTestnet
```

That script performs:

1. self-approval in compliance fallback mode
2. minting DemoUSDC
3. creating a receivable
4. buyer acknowledgement
5. advance funding
6. settlement
7. a second receivable dispute path

## Current HashKey Testnet Deployment

From `contracts.v2.json`:

- network: `hashkeyTestnet`
- chainId: `133`
- deployedAt: `2026-04-15T01:07:36.476Z`
- deployer: `0x35647dE2F4076e73694EFd650468597cc9591D11`

Contracts:

- `DemoUSDC`: `0x5aCeD1dCe2dEbF2a2726Bc5c507984edddD72883`
- `ComplianceGate`: `0x2C04F693daACeEE882B52891cbE3BD00BDA8Fc72`
- `ReceivableRegistry`: `0x259d4611678E8FA610E43aC61e4ACf6E4F05758b`
- `FundingPool`: `0x1D933D1e6b9F9EA5BAa2E9E2d43e6034487778A5`
- `AdvanceEngine`: `0x37b61541fB016Ef1ABb74D5531066154176a8C0f`
- `HspSettlementAdapter`: `0x516086a3eF35D750299d5566deA0720b2e76dEa7`
- `SettlementRouter`: `0x383A93d79c2658B8B067010aA1E4146f12F05848`
- `DisputeEscrow`: `0x3cfE0AFE347EAd3e0e6cBFF4D8C59F13E97F6b4b`
- `Reputation`: `0xcdd10BFb0b82379865aDe4459219D1ef58b0C96C`
- `Treasury`: `0x35647dE2F4076e73694EFd650468597cc9591D11`

## Verified Lifecycle In Test

`test/v2.lifecycle.cjs` covers:

1. compliance setup
2. receivable creation
3. buyer acknowledgement
4. LP funding
5. buyer settlement
6. seller and LP balance effects
7. dispute open and resolution

## Repo Map

- `src/context/settl-context.tsx`: app orchestration across demo and live modes
- `src/lib/hashkey-config.ts`: HashKey chain and mode configuration
- `src/lib/hashkey-integrations.ts`: KYC, Safe, and HSP endpoint wiring
- `src/lib/contracts.ts`: frontend contract address registry
- `src/pages/Connect.tsx`: role-aware access routing
- `src/pages/app/Settings.tsx`: live integrations, KYC, Safe, and faucet surface
- `scripts/deploy-hashkey-v2.cjs`: main HashKey deployment script
- `scripts/live-smoke-hashkey-v2.cjs`: post-deploy live flow verification
- `contracts.v2.json`: latest deployment output

## Status

This repo is a strong end-to-end testnet implementation, not a finished audited production release.

Known realities:

- the HSP adapter keeps a clean onchain boundary and event trail, but external HSP connectivity is still adapter-driven
- official HashKey KYC is optional unless the SBT contract is configured
- the app supports both demo and live paths, so some UX remains dual-mode by design

## Push Target

The intended repository target is:

`https://github.com/Adityaakr/SETTL-ECO.git`

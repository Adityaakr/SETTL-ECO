# SETTL-ECO

SETTL-ECO is a receivables financing and settlement operating stack built for HashKey Chain. It combines a role-aware React app, a Hardhat contract suite, compliance gating, buyer acknowledgement, funding, settlement waterfalls, disputes, and reputation tracking into one end-to-end system.

This repository is structured as a real testnet implementation rather than a pitch deck. The frontend, contracts, deployment scripts, smoke flow, and seeded demo surfaces all map to the same core receivable lifecycle.

## Architecture

SETTL-ECO is split into four layers:

1. Presentation layer: a React + Vite application that exposes seller, buyer, LP, risk, settlement, analytics, and admin workspaces.
2. Application layer: typed domain models, hooks, and the `SettlProvider` runtime that coordinate demo state and live contract state.
3. Protocol layer: Solidity contracts for compliance, receivables, financing, settlement, disputes, and reputation.
4. Integration layer: HashKey chain config, Privy wallet auth, official HashKey KYC support, Safe endpoints, and the HSP adapter boundary.

### High-level flow

```text
Seller
  -> ComplianceGate
  -> ReceivableRegistryV2.createReceivable
Buyer
  -> ReceivableRegistryV2.acknowledgeReceivable
LP
  -> AdvanceEngineV2.fundReceivable
Buyer
  -> SettlementRouterV2.settleReceivable
SettlementRouterV2
  -> treasury fee
  -> LP repayment
  -> seller proceeds
  -> HspSettlementAdapter request/complete
  -> ReputationV2 update
Optional
  -> DisputeEscrow.openDispute / resolveDispute
  -> SettlementRouterV2.releaseHoldback
```

## System Design

### Frontend architecture

The app shell is centered around [src/App.tsx](/Users/adityakrx/SETTL./src/App.tsx) and [src/components/layout/AppLayout.tsx](/Users/adityakrx/SETTL./src/components/layout/AppLayout.tsx).

Key frontend pieces:

- `src/context/settl-context.tsx`: main orchestration layer for mode switching, wallet-aware actions, and derived metrics
- `src/domain/models.ts`: shared types for receivables, settlements, funding positions, disputes, users, and runtime mode
- `src/data/demo.ts`: seeded demo entities and lifecycle states
- `src/lib/hashkey-config.ts`: HashKey chain definitions, explorer helpers, and demo/live mode selection
- `src/lib/contracts.ts`: frontend contract address registry
- `src/lib/hashkey-integrations.ts`: Safe, KYC, and HSP endpoint wiring
- `src/lib/hsp-adapter.ts`: adapter interface that keeps mock and live settlement modes behind one API
- `src/pages/app/*`: workspace-specific routes

The application is designed to run in two modes:

- `demo`: seeded data with simulated settlement and transaction states
- `live`: wallet-connected writes and reads against deployed HashKey contracts

### Contract architecture

The v2 contract system is intentionally modular:

- `ComplianceGate`: source of truth for whether an account can originate, acknowledge, fund, or settle
- `ReceivableRegistryV2`: stores the receivable record and status machine
- `AdvanceEngineV2`: funds finance-eligible receivables and records repayment expectations
- `SettlementRouterV2`: receives buyer payment and executes the onchain waterfall
- `HspSettlementAdapter`: records settlement request/completion against a clean adapter boundary
- `DisputeEscrow`: dispute open/resolve flow
- `ReputationV2`: updates seller, buyer, and provider performance state
- `FundingPoolV2`: included in deployment topology for pool-based capital design, even though the current tested lifecycle funds via `AdvanceEngineV2`
- `DemoUSDC`: test asset used for local and testnet flows

### Integration architecture

SETTL-ECO is opinionated about HashKey-native surfaces:

- chain target: HashKey testnet by default, with mainnet config available
- wallet/auth: Privy + Wagmi + viem
- compliance path: official HashKey KYC SBT support when configured, otherwise local self-serve fallback
- treasury path: HashKey Safe URLs exposed in settings and dashboard proof points
- settlement bridge: HSP adapter boundary keeps external rail complexity outside the core contract API

## Receivable Lifecycle

The runtime and contracts follow this lifecycle:

1. `Issued`
2. `BuyerAcknowledged`
3. `FinanceEligible`
4. `Funded`
5. `Paid`
6. `Cleared`
7. `Overdue`
8. `Disputed`
9. `Rejected`

Important gates:

- A seller must be approved before origination.
- A buyer must be approved before acknowledgement or settlement.
- Financing only opens after buyer acknowledgement.
- Settlement can include protocol fees, repayment, seller proceeds, and holdback.
- Disputes can interrupt the normal path and restore a receivable back to `FinanceEligible` or `Paid`.

## End-to-End HashKey Flow

### 1. Compliance

`ComplianceGate` supports:

- official HashKey KYC sync from an SBT contract
- fallback self-approval for local and test flows when the SBT is not configured

Frontend support for this lives in:

- [src/lib/hashkey-kyc.ts](/Users/adityakrx/SETTL./src/lib/hashkey-kyc.ts)
- [src/pages/app/Settings.tsx](/Users/adityakrx/SETTL./src/pages/app/Settings.tsx)

### 2. Origination

The seller creates a receivable with:

- buyer address
- amount
- requested advance
- holdback basis points
- issue and due dates
- metadata hash
- reference code

This is handled by `ReceivableRegistryV2.createReceivable(...)`.

### 3. Buyer acknowledgement

The buyer explicitly approves or rejects the receivable via `acknowledgeReceivable(...)`.

- reject -> `Rejected`
- approve -> `BuyerAcknowledged`
- approve with both parties compliant -> `FinanceEligible`

### 4. Funding

An approved LP funds the advance via `AdvanceEngineV2.fundReceivable(...)`.

Effects:

- DemoUSDC transfers from LP to seller
- expected repayment is stored
- receivable becomes `Funded`
- reputation records financing history

### 5. Settlement

The buyer settles through `SettlementRouterV2.settleReceivable(...)`.

Waterfall:

- protocol fee to treasury
- LP repayment if funded
- seller net amount
- holdback retained in settlement accounting if configured
- HSP adapter request/completion record
- reputation update

### 6. Holdback release

If holdback exists, the seller or owner can release it later through `releaseHoldback(...)`, which moves the receivable to `Cleared`.

### 7. Dispute path

Buyer or seller can open a dispute through `DisputeEscrow`.

Resolution can:

- restore the receivable to `FinanceEligible`
- or move it back to `Paid`

## Repository Layout

### App

- `src/App.tsx`: top-level providers and router
- `src/context/settl-context.tsx`: state orchestration for demo and live flows
- `src/pages/Landing.tsx`: marketing and overview narrative
- `src/pages/Connect.tsx`: role routing and wallet entry
- `src/pages/app/Dashboard.tsx`: executive and judge walkthrough surface
- `src/pages/app/Settlements.tsx`: maturity and settlement monitoring
- `src/pages/app/Settings.tsx`: runtime configuration, KYC, Safe, and contract wiring

### Contracts

- `contracts/v2/ComplianceGate.sol`
- `contracts/v2/ReceivableRegistryV2.sol`
- `contracts/v2/AdvanceEngineV2.sol`
- `contracts/v2/SettlementRouterV2.sol`
- `contracts/v2/HspSettlementAdapter.sol`
- `contracts/v2/DisputeEscrow.sol`
- `contracts/v2/ReputationV2.sol`
- `contracts/v2/FundingPoolV2.sol`
- `contracts/DemoUSDC.sol`

### Scripts

- `scripts/deploy-hashkey-v2.cjs`: deploys the full v2 stack and writes `contracts.v2.json`
- `scripts/live-smoke-hashkey-v2.cjs`: runs a testnet lifecycle smoke path
- `scripts/verify-contracts.cjs` and related helpers: verification and maintenance utilities

### Tests

- `test/v2.lifecycle.cjs`: local Hardhat lifecycle test covering create -> acknowledge -> fund -> settle -> dispute resolution

## Runtime Modes

### Demo mode

Use demo mode when you want a deterministic product walkthrough with no contract dependency.

```bash
VITE_SETTL_MODE=demo
VITE_HSP_MODE=mock
```

### Live mode

Use live mode when you want wallet-backed writes on HashKey testnet.

```bash
VITE_SETTL_MODE=live
VITE_HSP_MODE=live
```

Live mode depends on:

- Privy configuration
- contract addresses
- RPC access
- optional official HashKey KYC address
- optional HSP endpoint

## Environment Variables

Core variables in [.env.example](/Users/adityakrx/SETTL./.env.example):

### Chain

- `VITE_HASHKEY_TESTNET_CHAIN_ID`
- `VITE_HASHKEY_TESTNET_RPC_URL`
- `VITE_HASHKEY_TESTNET_EXPLORER`
- `VITE_HASHKEY_MAINNET_CHAIN_ID`
- `VITE_HASHKEY_MAINNET_RPC_URL`
- `VITE_HASHKEY_MAINNET_EXPLORER`
- `HASHKEY_TESTNET_RPC_URL`
- `HASHKEY_MAINNET_RPC_URL`

### Wallet/Auth

- `VITE_PRIVY_APP_ID`
- `PRIVY_APP_SECRET`

### Deployment

- `DEPLOYER_PRIVATE_KEY`
- `HASHKEY_EXPLORER_API_KEY`

### Settlement / Compliance integrations

- `VITE_HSP_API_BASE_URL`
- `HSP_API_KEY`
- `VITE_HASHKEY_KYC_SBT_ADDRESS`
- `HASHKEY_KYC_SBT_ADDRESS`
- `VITE_HASHKEY_KYC_PORTAL_URL`
- `VITE_HASHKEY_SAFE_TESTNET_URL`
- `VITE_HASHKEY_SAFE_MAINNET_URL`
- `VITE_HASHKEY_SAFE_TX_SERVICE_URL`

### Deployed contracts

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

## Local Setup

```bash
cp .env.example .env
npm install
npm run test
npm run build
npm run dev
```

Useful scripts:

```bash
npm run dev
npm run build
npm run compile
npm run test
npm run deploy:hashkey:testnet
npm run deploy:hashkey:mainnet
npm run verify
```

## Deployment

Main deployment entrypoint:

```bash
npm run deploy:hashkey:testnet
```

The deploy script:

- deploys the full v2 stack
- configures inter-contract operator permissions
- writes deployment metadata to [contracts.v2.json](/Users/adityakrx/SETTL./contracts.v2.json)

## Smoke Path

Testnet smoke script:

```bash
npx hardhat run scripts/live-smoke-hashkey-v2.cjs --network hashkeyTestnet
```

It exercises:

1. compliance fallback enablement
2. DemoUSDC minting
3. receivable creation
4. buyer acknowledgement
5. funding
6. settlement
7. dispute creation on a second receivable

## Current Testnet Deployment

Latest checked deployment from [contracts.v2.json](/Users/adityakrx/SETTL./contracts.v2.json):

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

## Verification Status

Current local verification status:

- `npm run test`: passes
- `npm run build`: passes
- `npm run lint`: currently fails on pre-existing repository issues outside this README rewrite

## Notes

- The repo still contains older contracts and helper hooks from earlier product iterations.
- The v2 path is the clearest HashKey-native implementation in this workspace.
- The HSP integration is intentionally abstracted through an adapter boundary so the protocol stays auditable even when the external rail changes.

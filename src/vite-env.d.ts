/// <reference types="vite/client" />

// Buffer polyfill for browser
import { Buffer } from 'buffer';
declare global {
  interface Window {
    Buffer: typeof Buffer;
  }
  var globalThis: typeof global;
  var Buffer: typeof Buffer;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_PRIVY_APP_ID: string
  readonly VITE_RECLAIM_APP_ID: string
  readonly VITE_RECLAIM_APP_SECRET: string
  readonly VITE_RECLAIM_PROVIDER_ID: string
  readonly VITE_MANTLE_CHAIN_ID: string
  readonly VITE_USDC_MANTLE: string
  readonly VITE_DEMO_USDC_ADDRESS?: string
  readonly VITE_INVOICE_REGISTRY_ADDRESS?: string
  readonly VITE_VAULT_ADDRESS?: string
  readonly VITE_ADVANCE_ENGINE_ADDRESS?: string
  readonly VITE_REPUTATION_ADDRESS?: string
  readonly VITE_SETTLEMENT_ROUTER_ADDRESS?: string
  readonly VITE_MANTLE_RPC_URL?: string
  readonly VITE_HASHKEY_TESTNET_RPC_URL?: string
  readonly VITE_HASHKEY_TESTNET_EXPLORER?: string
  readonly VITE_HASHKEY_MAINNET_RPC_URL?: string
  readonly VITE_HASHKEY_MAINNET_EXPLORER?: string
  readonly VITE_HSP_MODE?: "mock" | "live"
  readonly VITE_HSP_API_BASE_URL?: string
  readonly VITE_SETTL_MODE?: "demo" | "live"
  readonly VITE_COMPLIANCE_GATE_ADDRESS?: string
  readonly VITE_RECEIVABLE_REGISTRY_ADDRESS?: string
  readonly VITE_FUNDING_POOL_ADDRESS?: string
  readonly VITE_HSP_SETTLEMENT_ADAPTER_ADDRESS?: string
  readonly VITE_DISPUTE_ESCROW_ADDRESS?: string
  readonly VITE_HASHKEY_KYC_SBT_ADDRESS?: string
  readonly VITE_HASHKEY_KYC_PORTAL_URL?: string
  readonly VITE_HASHKEY_SAFE_TESTNET_URL?: string
  readonly VITE_HASHKEY_SAFE_MAINNET_URL?: string
  readonly VITE_HASHKEY_SAFE_TX_SERVICE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

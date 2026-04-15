export const hashKeyIntegrations = {
  kyc: {
    address: import.meta.env.VITE_HASHKEY_KYC_SBT_ADDRESS,
    portalUrl:
      import.meta.env.VITE_HASHKEY_KYC_PORTAL_URL ||
      "https://kyc-testnet.hunyuankyc.com",
    enabled: Boolean(import.meta.env.VITE_HASHKEY_KYC_SBT_ADDRESS),
  },
  safe: {
    testnetUrl:
      import.meta.env.VITE_HASHKEY_SAFE_TESTNET_URL ||
      "https://testnet-safe.hsk.xyz",
    mainnetUrl:
      import.meta.env.VITE_HASHKEY_SAFE_MAINNET_URL ||
      "https://multisig.hashkeychain.net",
    txServiceUrl:
      import.meta.env.VITE_HASHKEY_SAFE_TX_SERVICE_URL ||
      "https://safe-transaction-hashkey.safe.global",
  },
  hsp: {
    apiBaseUrl: import.meta.env.VITE_HSP_API_BASE_URL,
    enabled: Boolean(import.meta.env.VITE_HSP_API_BASE_URL),
  },
} as const;

import { ModeConfig } from "@/domain/models";

export const hashKeyMainnet = {
  id: 177,
  name: "HashKey Chain",
  nativeCurrency: {
    decimals: 18,
    name: "HashKey EcoPoints",
    symbol: "HSK",
  },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_HASHKEY_MAINNET_RPC_URL || "https://mainnet.hsk.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "HashKey Explorer",
      url: import.meta.env.VITE_HASHKEY_MAINNET_EXPLORER || "https://hashkey.blockscout.com",
    },
  },
  testnet: false,
} as const;

export const hashKeyTestnet = {
  id: 133,
  name: "HashKey Chain Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "HashKey EcoPoints",
    symbol: "HSK",
  },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_HASHKEY_TESTNET_RPC_URL || "https://testnet.hsk.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "HashKey Testnet Explorer",
      url:
        import.meta.env.VITE_HASHKEY_TESTNET_EXPLORER ||
        "https://testnet-explorer.hsk.xyz",
    },
  },
  testnet: true,
} as const;

export const hashKeyChains = [hashKeyTestnet, hashKeyMainnet] as const;

export const preferredChain = hashKeyTestnet;

export const appMode: ModeConfig = {
  appMode:
    import.meta.env.VITE_SETTL_MODE === "live"
      ? "live"
      : "demo",
  hspMode:
    import.meta.env.VITE_HSP_MODE === "live"
      ? "live"
      : "mock",
};

export const getExplorerLink = ({
  hash,
  path = "tx",
  testnet = true,
}: {
  hash: string;
  path?: "tx" | "address";
  testnet?: boolean;
}) => {
  const base = testnet
    ? hashKeyTestnet.blockExplorers.default.url
    : hashKeyMainnet.blockExplorers.default.url;

  return `${base}/${path}/${hash}`;
};

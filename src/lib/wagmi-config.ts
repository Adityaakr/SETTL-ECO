import { createConfig } from "@privy-io/wagmi";
import { http } from "viem";
import { hashKeyMainnet, hashKeyTestnet } from "@/lib/hashkey-config";

export const wagmiConfig = createConfig({
  chains: [hashKeyTestnet, hashKeyMainnet],
  transports: {
    [hashKeyTestnet.id]: http(hashKeyTestnet.rpcUrls.default.http[0]),
    [hashKeyMainnet.id]: http(hashKeyMainnet.rpcUrls.default.http[0]),
  },
});

export const chains = [hashKeyTestnet, hashKeyMainnet];

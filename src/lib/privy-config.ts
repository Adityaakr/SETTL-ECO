import { hashKeyMainnet, hashKeyTestnet } from "@/lib/hashkey-config";

export const privyConfig = {
  appId: import.meta.env.VITE_PRIVY_APP_ID || "",
  config: {
    appearance: {
      theme: "light",
      accentColor: "#25A244",
      logo: "/set.png",
    },
    loginMethods: ["email"],
    externalWallets: {
      disableAllExternalWallets: true,
      walletConnect: {
        enabled: false,
      },
    },
    embeddedWallets: {
      ethereum: {
        createOnLogin: "users-without-wallets",
      },
      requireUserPasswordOnCreate: false,
      noPromptOnSignature: true,
    },
    defaultChain: hashKeyTestnet,
    supportedChains: [hashKeyTestnet, hashKeyMainnet],
  },
};

require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");

const privateKey = process.env.DEPLOYER_PRIVATE_KEY || "";
const normalizedPrivateKey = privateKey.replace(/^0x/, "");
const deployerAccounts =
  normalizedPrivateKey.length === 64 ? [`0x${normalizedPrivateKey}`] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true, // Enable IR-based code generation to handle stack too deep errors
    },
  },
  networks: {
    hashkeyTestnet: {
      url:
        process.env.VITE_HASHKEY_TESTNET_RPC_URL ||
        process.env.HASHKEY_TESTNET_RPC_URL ||
        "https://testnet.hsk.xyz",
      chainId: 133,
      accounts: deployerAccounts,
    },
    hashkeyMainnet: {
      url:
        process.env.VITE_HASHKEY_MAINNET_RPC_URL ||
        process.env.HASHKEY_MAINNET_RPC_URL ||
        "https://mainnet.hsk.xyz",
      chainId: 177,
      accounts: deployerAccounts,
    },
    hardhat: {
      chainId: 31337,
    },
  },
  etherscan: {
    apiKey: {
      hashkeyTestnet: process.env.HASHKEY_EXPLORER_API_KEY || "",
      hashkeyMainnet: process.env.HASHKEY_EXPLORER_API_KEY || "",
    },
    customChains: [
      {
        network: "hashkeyTestnet",
        chainId: 133,
        urls: {
          apiURL: "https://testnet-explorer.hsk.xyz/api",
          browserURL: "https://testnet-explorer.hsk.xyz",
        },
      },
      {
        network: "hashkeyMainnet",
        chainId: 177,
        urls: {
          apiURL: "https://hashkey.blockscout.com/api",
          browserURL: "https://hashkey.blockscout.com",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

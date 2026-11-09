import "module-alias/register";

import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-verify";
import "@nomiclabs/hardhat-ethers";
import "@openzeppelin/hardhat-upgrades";
import "@typechain/hardhat";
import * as dotenv from "dotenv";
import { parseUnits } from "ethers/lib/utils";
import "hardhat-dependency-compiler";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import { HardhatUserConfig, extendConfig, task } from "hardhat/config";
import { HardhatConfig } from "hardhat/types";
import "solidity-coverage";
import "solidity-docgen";

dotenv.config();
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;

extendConfig((config: HardhatConfig) => {
  if (process.env.EXPORT !== "true") {
    config.external = {
      ...config.external,
      deployments: {
        bsctestnet: [
          "node_modules/@venusprotocol/governance-contracts/deployments/bsctestnet",
          "node_modules/@venusprotocol/venus-protocol/deployments/bsctestnet",
          "node_modules/@venusprotocol/oracle/deployments/bsctestnet",
        ],
        bscmainnet: [
          "node_modules/@venusprotocol/governance-contracts/deployments/bscmainnet",
          "node_modules/@venusprotocol/venus-protocol/deployments/bscmainnet",
          "node_modules/@venusprotocol/oracle/deployments/bscmainnet",
        ],
        sepolia: [
          "node_modules/@venusprotocol/governance-contracts/deployments/sepolia",
          "node_modules/@venusprotocol/oracle/deployments/sepolia",
        ],
        opbnbtestnet: [
          "node_modules/@venusprotocol/governance-contracts/deployments/opbnbtestnet",
          "node_modules/@venusprotocol/oracle/deployments/opbnbtestnet",
        ],
        opbnbmainnet: [
          "node_modules/@venusprotocol/governance-contracts/deployments/opbnbmainnet",
          "node_modules/@venusprotocol/oracle/deployments/opbnbmainnet",
        ],
        ethereum: [
          "node_modules/@venusprotocol/governance-contracts/deployments/ethereum",
          "node_modules/@venusprotocol/oracle/deployments/ethereum",
        ],
        arbitrumsepolia: [
          "node_modules/@venusprotocol/governance-contracts/deployments/arbitrumsepolia",
          "node_modules/@venusprotocol/oracle/deployments/arbitrumsepolia",
        ],
        arbitrumone: ["node_modules/@venusprotocol/governance-contracts/deployments/arbitrumone"],
        opsepolia: [
          "node_modules/@venusprotocol/governance-contracts/deployments/opsepolia",
          "node_modules/@venusprotocol/oracle/deployments/opsepolia",
        ],
        basesepolia: [
          "node_modules/@venusprotocol/governance-contracts/deployments/basesepolia",
          "node_modules/@venusprotocol/oracle/deployments/basesepolia",
        ],
        basemainnet: [
          "node_modules/@venusprotocol/governance-contracts/deployments/basemainnet",
          "node_modules/@venusprotocol/oracle/deployments/basemainnet",
        ],
        unichainsepolia: [
          "node_modules/@venusprotocol/governance-contracts/deployments/unichainsepolia",
          "node_modules/@venusprotocol/oracle/deployments/unichainsepolia",
        ],
        unichainmainnet: [
          "node_modules/@venusprotocol/governance-contracts/deployments/unichainmainnet",
          "node_modules/@venusprotocol/oracle/deployments/unichainmainnet",
        ],
      },
    };
  }
});

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.25",
        settings: {
          optimizer: {
            enabled: true,
            details: {
              yul: !process.env.CI,
            },
          },
          evmVersion: "paris",
          outputSelection: {
            "*": {
              "*": ["storageLayout"],
            },
          },
        },
      },
    ],
  },
  networks: {
    hardhat: isFork(),
    development: {
      url: "http://127.0.0.1:8545/",
      chainId: 31337,
      live: false,
    },
    bsctestnet: {
      url: process.env.ARCHIVE_NODE_bsctestnet || "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts: {
        mnemonic: process.env.MNEMONIC || "",
      },
      gasPrice: parseUnits("10", "gwei").toNumber(),
      gasMultiplier: 10,
      timeout: 12000000,
    },
    bscmainnet: {
      url: process.env.ARCHIVE_NODE_bscmainnet || "https://bsc-dataseed.binance.org/",
      chainId: 56,
      live: true,
      timeout: 1200000, // 20 minutes
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [`0x${process.env.DEPLOYER_PRIVATE_KEY}`] : [],
    },
    sepolia: {
      url: process.env.ARCHIVE_NODE_sepolia || "https://ethereum-sepolia.blockpi.network/v1/rpc/public",
      chainId: 11155111,
      live: true,
      accounts: {
        mnemonic: process.env.MNEMONIC || "",
      },
    },
    ethereum: {
      url: process.env.ARCHIVE_NODE_ethereum || "https://ethereum.blockpi.network/v1/rpc/public",
      chainId: 1,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [`0x${process.env.DEPLOYER_PRIVATE_KEY}`] : [],
    },
    opbnbtestnet: {
      url: process.env.ARCHIVE_NODE_opbnbtestnet || "https://opbnb-testnet-rpc.bnbchain.org",
      chainId: 5611,
      live: true,
      gasPrice: 300000000000,
      accounts: DEPLOYER_PRIVATE_KEY ? [`0x${DEPLOYER_PRIVATE_KEY}`] : [],
    },
    opbnbmainnet: {
      url: process.env.ARCHIVE_NODE_opbnbmainnet || "https://opbnb-mainnet-rpc.bnbchain.org",
      chainId: 204,
      live: true,
      gasPrice: parseUnits("0.03", "gwei").toNumber(),
      accounts: {
        mnemonic: process.env.MNEMONIC || "",
      },
    },
    arbitrumsepolia: {
      url: process.env.ARCHIVE_NODE_arbitrumsepolia || "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: 421614,
      live: true,
      accounts: DEPLOYER_PRIVATE_KEY ? [`0x${DEPLOYER_PRIVATE_KEY}`] : [],
    },
    arbitrumone: {
      url: process.env.ARCHIVE_NODE_arbitrumone || "https://arb1.arbitrum.io/rpc",
      chainId: 42161,
      live: true,
      accounts: DEPLOYER_PRIVATE_KEY ? [`0x${DEPLOYER_PRIVATE_KEY}`] : [],
    },
    opsepolia: {
      url: process.env.ARCHIVE_NODE_opsepolia || "https://sepolia.optimism.io",
      chainId: 11155420,
      live: true,
      accounts: DEPLOYER_PRIVATE_KEY ? [`0x${DEPLOYER_PRIVATE_KEY}`] : [],
    },
    opmainnet: {
      url: process.env.ARCHIVE_NODE_opmainnet || "https://mainnet.optimism.io",
      chainId: 10,
      live: true,
      accounts: DEPLOYER_PRIVATE_KEY ? [`0x${DEPLOYER_PRIVATE_KEY}`] : [],
    },
    basesepolia: {
      url: process.env.ARCHIVE_NODE_basesepolia || "https://sepolia.base.org",
      chainId: 84532,
      live: true,
      accounts: DEPLOYER_PRIVATE_KEY ? [`0x${DEPLOYER_PRIVATE_KEY}`] : [],
    },
    basemainnet: {
      url: process.env.ARCHIVE_NODE_basemainnet || "https://mainnet.base.org",
      chainId: 8453,
      live: true,
      accounts: DEPLOYER_PRIVATE_KEY ? [`0x${DEPLOYER_PRIVATE_KEY}`] : [],
    },
    unichainsepolia: {
      url: process.env.ARCHIVE_NODE_unichainsepolia || "https://sepolia.unichain.org",
      chainId: 1301,
      live: true,
      accounts: DEPLOYER_PRIVATE_KEY ? [`0x${DEPLOYER_PRIVATE_KEY}`] : [],
    },
    unichainmainnet: {
      url: process.env.ARCHIVE_NODE_unichainmainnet || "https://mainnet.unichain.org",
      chainId: 130,
      live: true,
      accounts: DEPLOYER_PRIVATE_KEY ? [`0x${DEPLOYER_PRIVATE_KEY}`] : [],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  sourcify: {
    enabled: true,
  },
  etherscan: {
    customChains: [
      {
        network: "opbnbtestnet",
        chainId: 5611,
        urls: {
          apiURL: `https://open-platform.nodereal.io/${process.env.ETHERSCAN_API_KEY}/op-bnb-testnet/contract/`,
          browserURL: "https://testnet.opbnbscan.com/",
        },
      },
      {
        network: "opbnbmainnet",
        chainId: 204,
        urls: {
          apiURL: `https://open-platform.nodereal.io/${process.env.ETHERSCAN_API_KEY}/op-bnb-mainnet/contract/`,
          browserURL: "https://opbnbscan.com/",
        },
      },
      {
        network: "opsepolia",
        chainId: 11155420,
        urls: {
          apiURL: "https://api-sepolia-optimistic.etherscan.io/api/",
          browserURL: "https://sepolia-optimistic.etherscan.io/",
        },
      },
      {
        network: "unichainsepolia",
        chainId: 1301,
        urls: {
          apiURL: `https://api-sepolia.uniscan.xyz/api/`,
          browserURL: "https://sepolia.uniscan.xyz/",
        },
      },
      {
        network: "unichainmainnet",
        chainId: 130,
        urls: {
          apiURL: `https://api.uniscan.xyz/api/`,
          browserURL: "https://uniscan.xyz/",
        },
      },
    ],
    apiKey: process.env.ETHERSCAN_API_KEY || "ETHERSCAN_API_KEY",
  },
  paths: {
    tests: "./test",
  },
  // Hardhat deploy
  namedAccounts: {
    deployer: 0,
    acc1: 1,
    acc2: 2,
    proxyAdmin: 3,
    acc3: 4,
  },
  docgen: {
    outputDir: "./docs",
    pages: "files",
    templates: "./docgen-templates",
  },
  external: {
    deployments: {},
  },
  dependencyCompiler: {
    paths: [
      "hardhat-deploy/solc_0.8/proxy/OptimizedTransparentUpgradeableProxy.sol",
      "hardhat-deploy/solc_0.8/openzeppelin/proxy/transparent/ProxyAdmin.sol",
    ],
  },
};

function isFork() {
  return process.env.FORK === "true"
    ? {
        allowUnlimitedContractSize: false,
        loggingEnabled: false,
        forking: {
          url:
            process.env[`ARCHIVE_NODE_${process.env.FORKED_NETWORK}`] ||
            "https://data-seed-prebsc-1-s1.binance.org:8545",
          blockNumber: 21068448,
        },
        accounts: {
          accountsBalance: "1000000000000000000",
        },
        live: false,
      }
    : {
        allowUnlimitedContractSize: true,
        loggingEnabled: false,
        live: false,
      };
}

export default config;

import "module-alias/register";

import "@matterlabs/hardhat-zksync";
import "@matterlabs/hardhat-zksync-solc";
import "@matterlabs/hardhat-zksync-verify";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomiclabs/hardhat-ethers";
import "@typechain/hardhat";
import * as dotenv from "dotenv";
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
        zksyncsepolia: [
          "node_modules/@venusprotocol/governance-contracts/deployments/zksyncsepolia",
          "node_modules/@venusprotocol/oracle/deployments/zksyncsepolia",
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
  zksolc: {
    version: "1.5.0",
  },
  networks: {
    hardhat: isFork(),
    zksyncsepolia: {
      url: process.env.ARCHIVE_NODE_zksyncsepolia || "https://sepolia.era.zksync.dev",
      ethNetwork: "sepolia",
      verifyURL: "https://explorer.sepolia.era.zksync.dev/contract_verification",
      accounts: DEPLOYER_PRIVATE_KEY ? [`0x${DEPLOYER_PRIVATE_KEY}`] : [],
      zksync: true,
      live: true,
    },
    zksyncmainnet: {
      url: process.env.ARCHIVE_NODE_zksync || "https://mainnet.era.zksync.io",
      ethNetwork: "mainnet",
      verifyURL: "https://zksync2-mainnet-explorer.zksync.io/contract_verification",
      accounts: DEPLOYER_PRIVATE_KEY ? [`0x${DEPLOYER_PRIVATE_KEY}`] : [],
      zksync: true,
      live: true,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
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
  dependencyCompiler: {
    paths: [
      "hardhat-deploy/solc_0.8/proxy/OptimizedTransparentUpgradeableProxy.sol",
      "hardhat-deploy/solc_0.8/openzeppelin/proxy/transparent/ProxyAdmin.sol",
    ],
  },
  paths: {
    tests: "./tests",
    cache: "./cache-zk",
    artifacts: "./artifacts-zk",
  },
};

function isFork() {
  return process.env.FORK === "true"
    ? {
        allowUnlimitedContractSize: false,
        loggingEnabled: false,
        forking: {
          url: process.env[`ARCHIVE_NODE_${process.env.FORKED_NETWORK}`] || "https://sepolia.era.zksync.dev",
        },
        accounts: {
          accountsBalance: "1000000000000000000",
        },
        live: false,
        saveDeployments: false,
        zksync: true,
      }
    : {
        allowUnlimitedContractSize: true,
        loggingEnabled: false,
        live: false,
        saveDeployments: false,
        zksync: true,
      };
}

export default config;

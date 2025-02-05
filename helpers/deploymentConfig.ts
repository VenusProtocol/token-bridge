import { BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";

export type PreconfiguredAddresses = { [contract: string]: string };

interface BridgeConfig {
  [networkName: string]: {
    methods: { method: string; args: any[] }[];
  };
}

type MethodEntry = {
  method: string;
  args: (BigNumber | number)[];
};

const SEPOLIA_MULTISIG = "0x94fa6078b6b8a26f0b6edffbe6501b22a10470fb";
const OPBNB_TESTNET_MULTISIG = "0xb15f6EfEbC276A3b9805df81b5FB3D50C2A62BDf";
const OPBNB_MAINNET_MULTISIG = "0xC46796a21a3A9FAB6546aF3434F2eBfFd0604207";
const ETHEREUM_MULTISIG = "0x285960C5B22fD66A736C7136967A3eB15e93CC67";
const ARBITRUM_SEPOLIA_MULTISIG = "0x1426A5Ae009c4443188DA8793751024E358A61C2";
const ARBITRUM_ONE_MULTISIG = "0x14e0E151b33f9802b3e75b621c1457afc44DcAA0";
const ZKSYNC_SEPOLIA_MULTISIG = "0xa2f83de95E9F28eD443132C331B6a9C9B7a9F866";
const OP_SEPOLIA_MULTISIG = "0xd57365EE4E850e881229e2F8Aa405822f289e78d";
const ZKSYNC_MAINNET_MULTISIG = "0x751Aa759cfBB6CE71A43b48e40e1cCcFC66Ba4aa";
const OP_MAINNET_MULTISIG = "0x2e94dd14E81999CdBF5deDE31938beD7308354b3";
const BASE_SEPOLIA_MULTISIG = "0xdf3b635d2b535f906BB02abb22AED71346E36a00";
const BASE_MAINNET_MULTISIG = "0x1803Cf1D3495b43cC628aa1d8638A981F8CD341C";
const UNICHAIN_SEPOLIA_MULTISIG = "0x9831D3A641E8c7F082EEA75b8249c99be9D09a34";

export const preconfiguredAddresses = {
  bsctestnet: {
    LzEndpoint: "0x6Fcb97553D41516Cb228ac03FdC8B9a0a9df04A1",
    LzVirtualChainId: "10102",
  },
  bscmainnet: {
    LzEndpoint: "0x3c2269811836af69497E5F486A85D7316753cf62",
    LzVirtualChainId: "102",
  },
  sepolia: {
    NormalTimelock: SEPOLIA_MULTISIG,
    FastTrackTimelock: SEPOLIA_MULTISIG,
    CriticalTimelock: SEPOLIA_MULTISIG,
    LzEndpoint: "0xae92d5aD7583AD66E49A0c67BAd18F6ba52dDDc1",
    LzVirtualChainId: "10161",
  },
  ethereum: {
    NormalTimelock: ETHEREUM_MULTISIG,
    FastTrackTimelock: ETHEREUM_MULTISIG,
    CriticalTimelock: ETHEREUM_MULTISIG,
    LzEndpoint: "0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675",
    LzVirtualChainId: "101",
  },
  opbnbtestnet: {
    LzEndpoint: "0x83c73Da98cf733B03315aFa8758834b36a195b87",
    LzVirtualChainId: "10202",
    NormalTimelock: OPBNB_TESTNET_MULTISIG,
  },
  opbnbmainnet: {
    NormalTimelock: OPBNB_MAINNET_MULTISIG,
    FastTrackTimelock: OPBNB_MAINNET_MULTISIG,
    CriticalTimelock: OPBNB_MAINNET_MULTISIG,
    LzEndpoint: "0xb6319cC6c8c27A8F5dAF0dD3DF91EA35C4720dd7",
    LzVirtualChainId: "202",
  },
  arbitrumsepolia: {
    NormalTimelock: ARBITRUM_SEPOLIA_MULTISIG,
    FastTrackTimelock: ARBITRUM_SEPOLIA_MULTISIG,
    CriticalTimelock: ARBITRUM_SEPOLIA_MULTISIG,
    LzEndpoint: "0x6098e96a28E02f27B1e6BD381f870F1C8Bd169d3",
    LzVirtualChainId: "10231",
  },
  arbitrumone: {
    NormalTimelock: ARBITRUM_ONE_MULTISIG,
    FastTrackTimelock: ARBITRUM_ONE_MULTISIG,
    CriticalTimelock: ARBITRUM_ONE_MULTISIG,
    LzEndpoint: "0x3c2269811836af69497E5F486A85D7316753cf62",
    LzVirtualChainId: "110",
  },
  zksyncsepolia: {
    NormalTimelock: ZKSYNC_SEPOLIA_MULTISIG,
    FastTrackTimelock: ZKSYNC_SEPOLIA_MULTISIG,
    CriticalTimelock: ZKSYNC_SEPOLIA_MULTISIG,
    LzEndpoint: "0x99b6359ce8E0eBdC27eBeDb76FE28F29303E78fF",
    LzVirtualChainId: "10248",
  },
  opsepolia: {
    NormalTimelock: OP_SEPOLIA_MULTISIG,
    FastTrackTimelock: OP_SEPOLIA_MULTISIG,
    CriticalTimelock: OP_SEPOLIA_MULTISIG,
    LzEndpoint: "0x55370E0fBB5f5b8dAeD978BA1c075a499eB107B8",
    LzVirtualChainId: "10232",
  },
  zksyncmainnet: {
    NormalTimelock: ZKSYNC_MAINNET_MULTISIG,
    FastTrackTimelock: ZKSYNC_MAINNET_MULTISIG,
    CriticalTimelock: ZKSYNC_MAINNET_MULTISIG,
    LzEndpoint: "0x9b896c0e23220469C7AE69cb4BbAE391eAa4C8da",
    LzVirtualChainId: "165",
  },
  opmainnet: {
    NormalTimelock: OP_MAINNET_MULTISIG,
    FastTrackTimelock: OP_MAINNET_MULTISIG,
    CriticalTimelock: OP_MAINNET_MULTISIG,
    LzEndpoint: "0x3c2269811836af69497E5F486A85D7316753cf62",
    LzVirtualChainId: "111",
  },
  basesepolia: {
    NormalTimelock: BASE_SEPOLIA_MULTISIG,
    FastTrackTimelock: BASE_SEPOLIA_MULTISIG,
    CriticalTimelock: BASE_SEPOLIA_MULTISIG,
    LzEndpoint: "0x55370E0fBB5f5b8dAeD978BA1c075a499eB107B8",
    LzVirtualChainId: "10245",
  },
  basemainnet: {
    NormalTimelock: BASE_MAINNET_MULTISIG,
    FastTrackTimelock: BASE_MAINNET_MULTISIG,
    CriticalTimelock: BASE_MAINNET_MULTISIG,
    LzEndpoint: "0xb6319cC6c8c27A8F5dAF0dD3DF91EA35C4720dd7",
    LzVirtualChainId: "184",
  },
  unichainsepolia: {
    NormalTimelock: UNICHAIN_SEPOLIA_MULTISIG,
    FastTrackTimelock: UNICHAIN_SEPOLIA_MULTISIG,
    CriticalTimelock: UNICHAIN_SEPOLIA_MULTISIG,
    LzEndpoint: "0x012f6eaE2A0Bf5916f48b5F37C62Bcfb7C1ffdA1",
    LzVirtualChainId: "10333",
  },
};

export const xvsBridgeMethodsSrc = [
  "setSendVersion(uint16)",
  "setReceiveVersion(uint16)",
  "forceResumeReceive(uint16,bytes)",
  "setOracle(address)",
  "setMaxSingleTransactionLimit(uint16,uint256)",
  "setMaxDailyLimit(uint16,uint256)",
  "setMaxSingleReceiveTransactionLimit(uint16,uint256)",
  "setMaxDailyReceiveLimit(uint16,uint256)",
  "pause()",
  "unpause()",
  "removeTrustedRemote(uint16)",
  "dropFailedMessage(uint16,bytes,uint64)",
  "fallbackWithdraw(address,uint256)",
  "fallbackDeposit(address,uint256)",
  "setPrecrime(address)",
  "setMinDstGas(uint16,uint16,uint256)",
  "setPayloadSizeLimit(uint16,uint256)",
  "setWhitelist(address,bool)",
  "setConfig(uint16,uint16,uint256,bytes)",
  "sweepToken(address,address,uint256)",
  "updateSendAndCallEnabled(bool)",
];

export const xvsBridgeMethodsDest = [
  "setSendVersion(uint16)",
  "setReceiveVersion(uint16)",
  "forceResumeReceive(uint16,bytes)",
  "setOracle(address)",
  "setMaxSingleTransactionLimit(uint16,uint256)",
  "setMaxDailyLimit(uint16,uint256)",
  "setMaxSingleReceiveTransactionLimit(uint16,uint256)",
  "setMaxDailyReceiveLimit(uint16,uint256)",
  "pause()",
  "unpause()",
  "removeTrustedRemote(uint16)",
  "dropFailedMessage(uint16,bytes,uint64)",
  "setPrecrime(address)",
  "setMinDstGas(uint16,uint16,uint256)",
  "setPayloadSizeLimit(uint16,uint256)",
  "setWhitelist(address,bool)",
  "setConfig(uint16,uint16,uint256,bytes)",
  "sweepToken(address,address,uint256)",
  "updateSendAndCallEnabled(bool)",
];

export const XVSBridgeAdminMethods = ["setTrustedRemoteAddress(uint16,bytes)", "transferBridgeOwnership(address)"];

export const XVSTokenDestMethods = [
  "migrateMinterTokens(address,address)",
  "setMintCap(address,uint256)",
  "updateBlacklist(address,bool)",
  "pause()",
  "unpause()",
];

export const xvsTokenPermissions = ["mint(address,uint256)", "burn(address,uint256)"];

export const bridgeConfig: BridgeConfig = {
  bsctestnet: {
    methods: [
      ...createMethodEntries(10161),
      ...createMethodEntries(10202),
      ...createMethodEntries(10231),
      ...createMethodEntries(10248),
      ...createMethodEntries(10232),
      ...createMethodEntries(10245),
      ...createMethodEntries(
        10333,
        300000,
        parseUnits("100000", 18),
        parseUnits("20000", 18),
        parseUnits("102000", 18),
        parseUnits("20400", 18),
      ),
    ],
  },
  bscmainnet: {
    methods: [
      ...createMethodEntries(101),
      ...createMethodEntries(202),
      ...createMethodEntries(
        110,
        300000,
        parseUnits("100000", 18),
        parseUnits("20000", 18),
        parseUnits("102000", 18),
        parseUnits("20400", 18),
      ),
      ...createMethodEntries(165),
      ...createMethodEntries(
        111,
        300000,
        parseUnits("100000", 18),
        parseUnits("20000", 18),
        parseUnits("102000", 18),
        parseUnits("20400", 18),
      ),
      ...createMethodEntries(184),
    ],
  },
  sepolia: {
    methods: [
      ...createMethodEntries(10102),
      ...createMethodEntries(10202),
      ...createMethodEntries(10231),
      ...createMethodEntries(10248),
      ...createMethodEntries(10232),
      ...createMethodEntries(10245),
      ...createMethodEntries(
        10333,
        300000,
        parseUnits("100000", 18),
        parseUnits("20000", 18),
        parseUnits("102000", 18),
        parseUnits("20400", 18),
      ),
    ],
  },
  ethereum: {
    methods: [
      ...createMethodEntries(102),
      ...createMethodEntries(202),
      ...createMethodEntries(
        110,
        300000,
        parseUnits("100000", 18),
        parseUnits("20000", 18),
        parseUnits("102000", 18),
        parseUnits("20400", 18),
      ),
      ...createMethodEntries(165),
      ...createMethodEntries(
        111,
        300000,
        parseUnits("100000", 18),
        parseUnits("20000", 18),
        parseUnits("102000", 18),
        parseUnits("20400", 18),
      ),
      ...createMethodEntries(184),
    ],
  },
  opbnbtestnet: {
    methods: [
      ...createMethodEntries(10102),
      ...createMethodEntries(10161),
      ...createMethodEntries(10231),
      ...createMethodEntries(10248),
      ...createMethodEntries(10232),
      ...createMethodEntries(10245),
      ...createMethodEntries(
        10333,
        300000,
        parseUnits("100000", 18),
        parseUnits("20000", 18),
        parseUnits("102000", 18),
        parseUnits("20400", 18),
      ),
    ],
  },
  opbnbmainnet: {
    methods: [
      ...createMethodEntries(102),
      ...createMethodEntries(101),
      ...createMethodEntries(
        110,
        300000,
        parseUnits("100000", 18),
        parseUnits("20000", 18),
        parseUnits("102000", 18),
        parseUnits("20400", 18),
      ),
      ...createMethodEntries(165),
      ...createMethodEntries(
        111,
        300000,
        parseUnits("100000", 18),
        parseUnits("20000", 18),
        parseUnits("102000", 18),
        parseUnits("20400", 18),
      ),
      ...createMethodEntries(184),
    ],
  },
  arbitrumsepolia: {
    methods: [
      ...createMethodEntries(10102),
      ...createMethodEntries(10202),
      ...createMethodEntries(10161),
      ...createMethodEntries(10248),
      ...createMethodEntries(10232),
      ...createMethodEntries(10245),
      ...createMethodEntries(
        10333,
        300000,
        parseUnits("100000", 18),
        parseUnits("20000", 18),
        parseUnits("102000", 18),
        parseUnits("20400", 18),
      ),
    ],
  },
  arbitrumone: {
    methods: [
      ...createMethodEntries(
        102,
        300000,
        parseUnits("100000", 18),
        parseUnits("20000", 18),
        parseUnits("102000", 18),
        parseUnits("20400", 18),
      ),
      ...createMethodEntries(
        101,
        300000,
        parseUnits("100000", 18),
        parseUnits("20000", 18),
        parseUnits("102000", 18),
        parseUnits("20400", 18),
      ),
      ...createMethodEntries(
        202,
        300000,
        parseUnits("100000", 18),
        parseUnits("20000", 18),
        parseUnits("102000", 18),
        parseUnits("20400", 18),
      ),
      ...createMethodEntries(165),
      ...createMethodEntries(
        111,
        300000,
        parseUnits("100000", 18),
        parseUnits("20000", 18),
        parseUnits("102000", 18),
        parseUnits("20400", 18),
      ),
      ...createMethodEntries(184),
    ],
  },
  zksyncsepolia: {
    methods: [
      ...createMethodEntries(10102),
      ...createMethodEntries(10202),
      ...createMethodEntries(10161),
      ...createMethodEntries(10231),
      ...createMethodEntries(10232),
      ...createMethodEntries(10245),
      ...createMethodEntries(
        10333,
        300000,
        parseUnits("100000", 18),
        parseUnits("20000", 18),
        parseUnits("102000", 18),
        parseUnits("20400", 18),
      ),
    ],
  },
  opsepolia: {
    methods: [
      ...createMethodEntries(10102),
      ...createMethodEntries(10202),
      ...createMethodEntries(10161),
      ...createMethodEntries(10231),
      ...createMethodEntries(10248),
      ...createMethodEntries(10245),
      ...createMethodEntries(
        10333,
        300000,
        parseUnits("100000", 18),
        parseUnits("20000", 18),
        parseUnits("102000", 18),
        parseUnits("20400", 18),
      ),
    ],
  },
  zksyncmainnet: {
    methods: [
      ...createMethodEntries(102),
      ...createMethodEntries(101),
      ...createMethodEntries(202),
      ...createMethodEntries(110),
      ...createMethodEntries(
        111,
        300000,
        parseUnits("100000", 18),
        parseUnits("20000", 18),
        parseUnits("102000", 18),
        parseUnits("20400", 18),
      ),
      ...createMethodEntries(184),
    ],
  },
  opmainnet: {
    methods: [
      ...createMethodEntries(
        102,
        300000,
        parseUnits("100000", 18),
        parseUnits("20000", 18),
        parseUnits("102000", 18),
        parseUnits("20400", 18),
      ),
      ...createMethodEntries(
        101,
        300000,
        parseUnits("100000", 18),
        parseUnits("20000", 18),
        parseUnits("102000", 18),
        parseUnits("20400", 18),
      ),
      ...createMethodEntries(
        202,
        300000,
        parseUnits("100000", 18),
        parseUnits("20000", 18),
        parseUnits("102000", 18),
        parseUnits("20400", 18),
      ),
      ...createMethodEntries(
        110,
        300000,
        parseUnits("100000", 18),
        parseUnits("20000", 18),
        parseUnits("102000", 18),
        parseUnits("20400", 18),
      ),
      ...createMethodEntries(
        165,
        300000,
        parseUnits("100000", 18),
        parseUnits("20000", 18),
        parseUnits("102000", 18),
        parseUnits("20400", 18),
      ),
      ...createMethodEntries(184),
    ],
  },
  basesepolia: {
    methods: [
      ...createMethodEntries(10102),
      ...createMethodEntries(10202),
      ...createMethodEntries(10161),
      ...createMethodEntries(10248),
      ...createMethodEntries(10232),
      ...createMethodEntries(10231),
    ],
  },
  basemainnet: {
    methods: [
      ...createMethodEntries(102),
      ...createMethodEntries(101),
      ...createMethodEntries(202),
      ...createMethodEntries(165),
      ...createMethodEntries(111),
      ...createMethodEntries(110),
    ],
  },
  unichainsepolia: {
    methods: [
      ...createMethodEntries(
        10102,
        300000,
        parseUnits("100000", 18),
        parseUnits("20000", 18),
        parseUnits("102000", 18),
        parseUnits("20400", 18),
      ),
      ...createMethodEntries(
        10202,
        300000,
        parseUnits("100000", 18),
        parseUnits("20000", 18),
        parseUnits("102000", 18),
        parseUnits("20400", 18),
      ),
      ...createMethodEntries(
        10161,
        300000,
        parseUnits("100000", 18),
        parseUnits("20000", 18),
        parseUnits("102000", 18),
        parseUnits("20400", 18),
      ),
      ...createMethodEntries(
        10231,
        300000,
        parseUnits("100000", 18),
        parseUnits("20000", 18),
        parseUnits("102000", 18),
        parseUnits("20400", 18),
      ),
      ...createMethodEntries(
        10248,
        300000,
        parseUnits("100000", 18),
        parseUnits("20000", 18),
        parseUnits("102000", 18),
        parseUnits("20400", 18),
      ),
      ...createMethodEntries(
        10232,
        300000,
        parseUnits("100000", 18),
        parseUnits("20000", 18),
        parseUnits("102000", 18),
        parseUnits("20400", 18),
      ),
    ],
  },

};

export async function getPreConfiguredAddresses(networkName: string): Promise<PreconfiguredAddresses> {
  switch (networkName) {
    case "bsctestnet":
      return preconfiguredAddresses.bsctestnet;
    case "bscmainnet":
      return preconfiguredAddresses.bscmainnet;
    case "sepolia":
      return preconfiguredAddresses.sepolia;
    case "ethereum":
      return preconfiguredAddresses.ethereum;
    case "opbnbtestnet":
      return preconfiguredAddresses.opbnbtestnet;
    case "opbnbmainnet":
      return preconfiguredAddresses.opbnbmainnet;
    case "arbitrumsepolia":
      return preconfiguredAddresses.arbitrumsepolia;
    case "arbitrumone":
      return preconfiguredAddresses.arbitrumone;
    case "zksyncsepolia":
      return preconfiguredAddresses.zksyncsepolia;
    case "opsepolia":
      return preconfiguredAddresses.opsepolia;
    case "zksyncmainnet":
      return preconfiguredAddresses.zksyncmainnet;
    case "opmainnet":
      return preconfiguredAddresses.opmainnet;
    case "basesepolia":
      return preconfiguredAddresses.basesepolia;
    case "basemainnet":
      return preconfiguredAddresses.basemainnet;
    case "unichainsepolia":
      return preconfiguredAddresses.unichainsepolia;
    default:
      throw new Error(`config for network ${networkName} is not available.`);
  }
}

function createMethodEntries(
  chainId: number,
  minDstGas: number = 300000,
  maxDailyLimit: BigNumber = parseUnits("100000", 18),
  maxSingleTransactionLimit: BigNumber = parseUnits("20000", 18),
  maxDailyReceiveLimit: BigNumber = parseUnits("102000", 18),
  maxSingleReceiveTransactionLimit: BigNumber = parseUnits("20400", 18),
): MethodEntry[] {
  return [
    { method: "setMinDstGas(uint16,uint16,uint256)", args: [chainId, 0, minDstGas] },
    { method: "setMaxDailyLimit(uint16,uint256)", args: [chainId, maxDailyLimit] },
    { method: "setMaxSingleTransactionLimit(uint16,uint256)", args: [chainId, maxSingleTransactionLimit] },
    { method: "setMaxDailyReceiveLimit(uint16,uint256)", args: [chainId, maxDailyReceiveLimit] },
    {
      method: "setMaxSingleReceiveTransactionLimit(uint16,uint256)",
      args: [chainId, maxSingleReceiveTransactionLimit],
    },
  ];
}

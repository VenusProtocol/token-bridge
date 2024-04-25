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
    methods: [...createMethodEntries(10161), ...createMethodEntries(10202), ...createMethodEntries(10231)],
  },
  bscmainnet: {
    methods: [...createMethodEntries(101), ...createMethodEntries(202), ...createMethodEntries(110)],
  },
  sepolia: {
    methods: [...createMethodEntries(10102), ...createMethodEntries(10202), ...createMethodEntries(10231)],
  },
  ethereum: {
    methods: [...createMethodEntries(102), ...createMethodEntries(202), ...createMethodEntries(110)],
  },
  opbnbtestnet: {
    methods: [...createMethodEntries(10102), ...createMethodEntries(10161), ...createMethodEntries(10231)],
  },
  opbnbmainnet: {
    methods: [...createMethodEntries(102), ...createMethodEntries(101), ...createMethodEntries(110)],
  },
  arbitrumsepolia: {
    methods: [...createMethodEntries(10102), ...createMethodEntries(10202), ...createMethodEntries(10161)],
  },
  arbitrumone: {
    methods: [...createMethodEntries(102), ...createMethodEntries(101), ...createMethodEntries(202)],
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
    default:
      throw new Error(`config for network ${networkName} is not available.`);
  }
}

function createMethodEntries(
  chainId: number,
  minDstGas: number = 300000,
  maxDailyLimit: BigNumber = parseUnits("50000", 18),
  maxSingleTransactionLimit: BigNumber = parseUnits("10000", 18),
  maxDailyReceiveLimit: BigNumber = parseUnits("51000", 18),
  maxSingleReceiveTransactionLimit: BigNumber = parseUnits("10200", 18),
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

export type PreconfiguredAddresses = { [contract: string]: string };

interface BridgeConfig {
  [networkName: string]: {
    methods: { method: string; args: any[] }[];
  };
}

const SEPOLIA_MULTISIG = "0x94fa6078b6b8a26f0b6edffbe6501b22a10470fb";
const OPBNB_TESTNET_MULTISIG = "0xb15f6EfEbC276A3b9805df81b5FB3D50C2A62BDf";
const OPBNB_MAINNET_MULTISIG = "0xC46796a21a3A9FAB6546aF3434F2eBfFd0604207";
const ETHEREUM_MULTISIG = "0x285960C5B22fD66A736C7136967A3eB15e93CC67";

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

export const mintableTokenBridgeMethods = [
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
  "forceMint(uint16,address,uint256)",
];

export const tokenBridgeAdminMethods = ["setTrustedRemoteAddress(uint16,bytes)", "transferBridgeOwnership(address)"];

export const tokenControllerMethods = [
  "migrateMinterTokens(address,address)",
  "setMintCap(address,uint256)",
  "updateBlacklist(address,bool)",
  "pause()",
  "unpause()",
];

export const multichainTokenMethods = ["mint(address,uint256)", "burn(address,uint256)"];

export const bridgeConfig: BridgeConfig = {
  bsctestnet: {
    methods: [
      { method: "setMinDstGas(uint16,uint16,uint256)", args: [10161, 0, "300000"] },
      { method: "setMaxDailyLimit(uint16,uint256)", args: [10161, "50000000000000000000000"] },
      { method: "setMaxSingleTransactionLimit(uint16,uint256)", args: [10161, "10000000000000000000000"] },
      { method: "setMaxDailyReceiveLimit(uint16,uint256)", args: [10161, "50000000000000000000000"] },
      { method: "setMaxSingleReceiveTransactionLimit(uint16,uint256)", args: [10161, "10000000000000000000000"] },
    ],
  },
  bscmainnet: {
    methods: [
      { method: "setMinDstGas(uint16,uint16,uint256)", args: [101, 0, "300000"] },
      { method: "setMaxDailyLimit(uint16,uint256)", args: [101, "50000000000000000000000"] },
      { method: "setMaxSingleTransactionLimit(uint16,uint256)", args: [101, "10000000000000000000000"] },
      { method: "setMaxDailyReceiveLimit(uint16,uint256)", args: [101, "50000000000000000000000"] },
      { method: "setMaxSingleReceiveTransactionLimit(uint16,uint256)", args: [101, "10000000000000000000000"] },
    ],
  },
  sepolia: {
    methods: [
      { method: "setMinDstGas(uint16,uint16,uint256)", args: [10102, 0, "300000"] },
      { method: "setMaxDailyLimit(uint16,uint256)", args: [10102, "50000000000000000000000"] },
      { method: "setMaxSingleTransactionLimit(uint16,uint256)", args: [10102, "10000000000000000000000"] },
      { method: "setMaxDailyReceiveLimit(uint16,uint256)", args: [10102, "50000000000000000000000"] },
      { method: "setMaxSingleReceiveTransactionLimit(uint16,uint256)", args: [10102, "10000000000000000000000"] },
    ],
  },
  ethereum: {
    methods: [
      { method: "setMinDstGas(uint16,uint16,uint256)", args: [102, 0, "300000"] },
      { method: "setMaxDailyLimit(uint16,uint256)", args: [102, "50000000000000000000000"] },
      { method: "setMaxSingleTransactionLimit(uint16,uint256)", args: [102, "10000000000000000000000"] },
      { method: "setMaxDailyReceiveLimit(uint16,uint256)", args: [102, "50000000000000000000000"] },
      { method: "setMaxSingleReceiveTransactionLimit(uint16,uint256)", args: [102, "10000000000000000000000"] },
    ],
  },
  opbnbtestnet: {
    methods: [
      { method: "setMinDstGas(uint16,uint16,uint256)", args: [10102, 0, "300000"] },
      { method: "setMaxDailyLimit(uint16,uint256)", args: [10102, "500000000000000000000"] },
      { method: "setMaxSingleTransactionLimit(uint16,uint256)", args: [10102, "10000000000000000000"] },
      { method: "setMaxDailyReceiveLimit(uint16,uint256)", args: [10102, "500000000000000000000"] },
      { method: "setMaxSingleReceiveTransactionLimit(uint16,uint256)", args: [10102, "10000000000000000000"] },
    ],
  },
  opbnbmainnet: {
    methods: [
      { method: "setMinDstGas(uint16,uint16,uint256)", args: [102, 0, "300000"] },
      { method: "setMaxDailyLimit(uint16,uint256)", args: [102, "50000000000000000000000"] },
      { method: "setMaxSingleTransactionLimit(uint16,uint256)", args: [102, "10000000000000000000000"] },
      { method: "setMaxDailyReceiveLimit(uint16,uint256)", args: [102, "50000000000000000000000"] },
      { method: "setMaxSingleReceiveTransactionLimit(uint16,uint256)", args: [102, "10000000000000000000000"] },
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
    default:
      throw new Error(`config for network ${networkName} is not available.`);
  }
}

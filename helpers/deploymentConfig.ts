export type PreconfiguredAddresses = { [contract: string]: string };

interface BridgeConfig {
  [networkName: string]: {
    methods: { method: string; args: any[] }[];
  };
}

const SEPOLIA_MULTISIG = "0x94fa6078b6b8a26f0b6edffbe6501b22a10470fb";
const OPBNB_TESTNET_MULTISIG = "0xb15f6EfEbC276A3b9805df81b5FB3D50C2A62BDf";

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
    // TODO
  },
  opbnbtestnet: {
    NormalTimelock: OPBNB_TESTNET_MULTISIG,
  },
};

export const xvsBridgeMethods = [
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
  "dropFailedMessage(uint16,bytes)",
  "fallbackWithdraw(address,uint256)",
  "setPrecrime(address)",
  "setMinDstGas(uint16,uint16,uint256)",
  "setPayloadSizeLimit(uint16,uint256)",
  "setWhitelist(address,bool)",
  "setConfig(uint16,uint16,uint256,bytes)",
];

export const bridgeAdminMethods = ["setTrustedRemoteAddress(uint16,bytes)", "transferBridgeOwnership(address)"];

export const xvsTokenPermissions = ["mint(address,uint256)", "burn(address,uint256)"];

export const bridgeConfig: BridgeConfig = {
  bsctestnet: {
    methods: [
      { method: "setMinDstGas(uint16,uint16,uint256)", args: [10161, 0, "200000"] },
      { method: "setMaxDailyLimit(uint16,uint256)", args: [10161, "500000000000000000000"] },
      { method: "setMaxSingleTransactionLimit(uint16,uint256)", args: [10161, "10000000000000000000"] },
      { method: "setMaxDailyReceiveLimit(uint16,uint256)", args: [10161, "500000000000000000000"] },
      { method: "setMaxSingleReceiveTransactionLimit(uint16,uint256)", args: [10161, "10000000000000000000"] },
    ],
  },
  bscmainnet: {
    methods: [
      { method: "setMinDstGas(uint16,uint16,uint256)", args: [101, 0, "200000"] },
      { method: "setMaxDailyLimit(uint16,uint256)", args: [101, "500000000000000000000"] },
      { method: "setMaxSingleTransactionLimit(uint16,uint256)", args: [101, "10000000000000000000"] },
      { method: "setMaxDailyReceiveLimit(uint16,uint256)", args: [101, "500000000000000000000"] },
      { method: "setMaxSingleReceiveTransactionLimit(uint16,uint256)", args: [101, "10000000000000000000"] },
    ],
  },
  sepolia: {
    methods: [
      { method: "setMinDstGas(uint16,uint16,uint256)", args: [10102, 0, "200000"] },
      { method: "setMaxDailyLimit(uint16,uint256)", args: [10102, "500000000000000000000"] },
      { method: "setMaxSingleTransactionLimit(uint16,uint256)", args: [10102, "10000000000000000000"] },
      { method: "setMaxDailyReceiveLimit(uint16,uint256)", args: [10102, "500000000000000000000"] },
      { method: "setMaxSingleReceiveTransactionLimit(uint16,uint256)", args: [10102, "10000000000000000000"] },
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
    default:
      throw new Error(`config for network ${networkName} is not available.`);
  }
}

export type PreconfiguredAddresses = { [contract: string]: string };

interface BridgeConfig {
  [networkName: string]: {
    methods: { method: string; args: any[] }[];
  };
}

const SEPOLIA_MULTISIG = "0x94fa6078b6b8a26f0b6edffbe6501b22a10470fb";

export const preconfiguredAddresses = {
  hardhat: {
    VTreasury: "account:deployer",
  },
  bsctestnet: {
    VTreasury: "0x8b293600C50D6fbdc6Ed4251cc75ECe29880276f",
    NormalTimelock: "0xce10739590001705F7FF231611ba4A48B2820327",
    FastTrackTimelock: "0x3CFf21b7AF8390fE68799D58727d3b4C25a83cb6",
    CriticalTimelock: "0x23B893a7C45a5Eb8c8C062b9F32d0D2e43eD286D",
    AccessControlManager: "0x45f8a08F534f34A97187626E05d4b6648Eeaa9AA",
    XVS: "0xB9e0E753630434d7863528cc73CB7AC638a7c8ff",
    ResilientOracle: "0x3cD69251D04A28d887Ac14cbe2E14c52F3D57823",
    LzEndpoint: "0x6Fcb97553D41516Cb228ac03FdC8B9a0a9df04A1",
    LzVirtualChainId: "10102",
  },
  bscmainnet: {
    VTreasury: "0xF322942f644A996A617BD29c16bd7d231d9F35E9",
    NormalTimelock: "0x939bD8d64c0A9583A7Dcea9933f7b21697ab6396",
    FastTrackTimelock: "0x555ba73dB1b006F3f2C7dB7126d6e4343aDBce02",
    CriticalTimelock: "0x213c446ec11e45b15a6E29C1C1b402B8897f606d",
    AccessControlManager: "0x4788629ABc6cFCA10F9f969efdEAa1cF70c23555",
    XVS: "0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63",
    ResilientOracle: "0x6592b5DE802159F3E74B2486b091D11a8256ab8A",
    LzEndpoint: "0x6592b5DE802159F3E74B2486b091D11a8256ab8A",
    LzVirtualChainId: "102",
  },
  sepolia: {
    VTreasury: "0x4116CA92960dF77756aAAc3aFd91361dB657fbF8",
    NormalTimelock: SEPOLIA_MULTISIG,
    FastTrackTimelock: SEPOLIA_MULTISIG,
    CriticalTimelock: SEPOLIA_MULTISIG,
    AccessControlManager: "0xbf705C00578d43B6147ab4eaE04DBBEd1ccCdc96",
    ResilientOracle: "0x9005091f2E0b20bEf6AaF2bD7F21dfd45DA8Af07",
    LzEndpoint: "0xae92d5aD7583AD66E49A0c67BAd18F6ba52dDDc1",
    LzVirtualChainId: "10161",
  },
  ethereum: {
    // TODO
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
      { method: "setMaxDailyReceiveLimit(uint16,uint256)", args: [10161, "50000000000000000000"] },
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
    default:
      throw new Error(`config for network ${networkName} is not available.`);
  }
}

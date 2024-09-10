import { BigNumberish } from "ethers";
import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import {
  XVSBridgeAdminMethods,
  bridgeConfig,
  getPreConfiguredAddresses,
  xvsBridgeMethodsSrc,
} from "../helpers/deploymentConfig";
import { toAddress } from "../helpers/utils";
import { getArgTypesFromSignature } from "../helpers/utils";

interface GovernanceCommand {
  contract: string;
  signature: string;
  argTypes: string[];
  parameters: any[];
  value: BigNumberish;
}

const configureAccessControls = async (
  methods: string[],
  accessControlManagerAddress: string,
  caller: string,
  target: string,
  hre: HardhatRuntimeEnvironment,
): Promise<GovernanceCommand[]> => {
  const commands = await Promise.all(
    methods.map(async method => {
      const callerAddress = await toAddress(caller, hre);
      const targetAddress = await toAddress(target, hre);
      return [
        {
          contract: accessControlManagerAddress,
          signature: "giveCallPermission(address,string,address)",
          argTypes: ["address", "string", "address"],
          parameters: [targetAddress, method, callerAddress],
          value: 0,
        },
      ];
    }),
  );
  return commands.flat();
};

const configureBridgeCommands = async (
  target: string,
  hre: HardhatRuntimeEnvironment,
): Promise<GovernanceCommand[]> => {
  const commands = await Promise.all(
    bridgeConfig[hre.network.name].methods.map(async (entry: { method: string; args: any[] }) => {
      const { method, args } = entry;
      return {
        contract: target,
        signature: method,
        argTypes: getArgTypesFromSignature(method),
        parameters: args,
        value: 0,
      };
    }),
  );
  return commands.flat();
};

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const preconfiguredAddresses = await getPreConfiguredAddresses(hre.network.name);
  const accessControlManager = await ethers.getContract("AccessControlManager");
  const normalTimelock = await ethers.getContract("NormalTimelock");
  const resilientOracle = await ethers.getContract("ResilientOracle");
  const XVS = await ethers.getContract("XVS");

  const defaultProxyAdmin = await hre.artifacts.readArtifact(
    "hardhat-deploy/solc_0.8/openzeppelin/proxy/transparent/ProxyAdmin.sol:ProxyAdmin",
  );

  const XVSProxyOFTSrc = await deploy("XVSProxyOFTSrc", {
    from: deployer,
    contract: "XVSProxyOFTSrc",
    args: [XVS.address, 8, preconfiguredAddresses.LzEndpoint, resilientOracle.address],
    autoMine: true,
    log: true,
  });

  const XVSBridgeAdmin = await deploy("XVSBridgeAdmin", {
    from: deployer,
    args: [XVSProxyOFTSrc.address],
    contract: "XVSBridgeAdmin",
    proxy: {
      owner: normalTimelock.address,
      proxyContract: "OptimizedTransparentUpgradeableProxy",
      execute: {
        methodName: "initialize",
        args: [accessControlManager.address],
      },
      viaAdminContract: {
        name: "DefaultProxyAdmin",
        artifact: defaultProxyAdmin,
      },
      upgradeIndex: 0,
    },
    log: true,
    autoMine: true,
  });

  const bridge = await ethers.getContract("XVSProxyOFTSrc");
  const bridgeAdmin = await ethers.getContract("XVSBridgeAdmin");

  const removeArray = new Array(xvsBridgeMethodsSrc.length).fill(true);
  let tx = await bridgeAdmin.upsertSignature(xvsBridgeMethodsSrc, removeArray);
  await tx.wait();

  tx = await bridge.transferOwnership(XVSBridgeAdmin.address);
  await tx.wait();

  tx = await bridgeAdmin.transferOwnership(normalTimelock.address);
  await tx.wait();
  console.log(
    `Bridge Admin owner ${deployer} sucessfully changed to ${normalTimelock.address}. Please accept the ownership.`,
  );

  const commands = [
    ...(await configureAccessControls(
      xvsBridgeMethodsSrc,
      accessControlManager.address,
      normalTimelock.address,
      XVSBridgeAdmin.address,
      hre,
    )),
    ...(await configureAccessControls(
      XVSBridgeAdminMethods,
      accessControlManager.address,
      normalTimelock.address,
      XVSBridgeAdmin.address,
      hre,
    )),

    {
      contract: XVSBridgeAdmin.address,
      signature: "acceptOwnership()",
      parameters: [],
      value: 0,
    },

    {
      contract: XVSBridgeAdmin.address,
      signature: "setTrustedRemoteAddress(uint16,bytes)",
      parameters: [preconfiguredAddresses.LzVirtualChainIdL, "0xDestAddress"],
      value: 0,
    },

    ...(await configureBridgeCommands(XVSBridgeAdmin.address, hre)),
  ];
  console.log("Please propose a VIP with the following commands:");
  console.log(
    JSON.stringify(
      commands.map(c => ({ target: c.contract, signature: c.signature, params: c.parameters, value: c.value })),
    ),
  );
};
func.tags = ["XVSBridgeSrc"];

func.skip = async (hre: HardhatRuntimeEnvironment) =>
  !(hre.network.name === "bsctestnet" || hre.network.name === "bscmainnet");
export default func;

import { BigNumberish } from "ethers";
import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import {
  XVSBridgeAdminMethods,
  XVSTokenDestMethods,
  bridgeConfig,
  getPreConfiguredAddresses,
  xvsBridgeMethodsDest,
  xvsTokenPermissions,
} from "../helpers/deploymentConfig";
import { toAddress } from "../helpers/utils";
import { XVSProxyOFTDest } from "../typechain";

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
const configureXVSTokenMintCapCommands = async (
  xvsToken: string,
  minterAddress: string,
): Promise<GovernanceCommand[]> => {
  const command = [
    {
      contract: xvsToken,
      signature: "setMintCap(address,uint256)",
      argTypes: ["address", "uint256"],
      parameters: [minterAddress, "100000000000000000000"],
      value: 0,
    },
  ];
  return command.flat();
};

const executeBridgeCommands = async (target: XVSProxyOFTDest, hre: HardhatRuntimeEnvironment, deployer: string) => {
  const signer = await ethers.getSigner(deployer);
  console.log("Executing Bridge commands");
  const methods = bridgeConfig[hre.network.name].methods;

  for (let i = 0; i < methods.length; i++) {
    const entry = methods[i];
    const { method, args } = entry;
    console.log(method);
    const iface = new ethers.utils.Interface([`function ${method}`]);
    const data = iface.encodeFunctionData(method, args);
    const tx = await signer.sendTransaction({
      to: target.address,
      data: data,
    });
    await tx.wait();
  }
};

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const preconfiguredAddresses = await getPreConfiguredAddresses(hre.network.name);
  const defaultProxyAdmin = await hre.artifacts.readArtifact(
    "hardhat-deploy/solc_0.8/openzeppelin/proxy/transparent/ProxyAdmin.sol:ProxyAdmin",
  );

  const proxyOwnerAddress = await toAddress(preconfiguredAddresses.NormalTimelock, hre);
  const accessControlManager = await ethers.getContract("AccessControlManager");
  const resilientOracle = await ethers.getContract("ResilientOracle");

  const XVS = await deploy("XVS", {
    from: deployer,
    contract: "XVS",
    args: [accessControlManager.address],
    autoMine: true,
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const XVSProxyOFTDest = await deploy("XVSProxyOFTDest", {
    from: deployer,
    contract: "XVSProxyOFTDest",
    args: [XVS.address, 8, preconfiguredAddresses.LzEndpoint, resilientOracle.address],
    autoMine: true,
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const XVSBridgeAdmin = await deploy("XVSBridgeAdmin", {
    from: deployer,
    args: [XVSProxyOFTDest.address],
    contract: "XVSBridgeAdmin",
    proxy: {
      owner: proxyOwnerAddress,
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
    skipIfAlreadyDeployed: true,
  });

  const bridge = await ethers.getContract<XVSProxyOFTDest>("XVSProxyOFTDest");
  const bridgeAdmin = await ethers.getContract("XVSBridgeAdmin");
  const xvs = await ethers.getContract("XVS");

  await executeBridgeCommands(bridge, hre, deployer);

  const removeArray = new Array(xvsBridgeMethodsDest.length).fill(true);
  let tx = await bridgeAdmin.upsertSignature(xvsBridgeMethodsDest, removeArray);
  await tx.wait();

  tx = await xvs.transferOwnership(preconfiguredAddresses.NormalTimelock);
  await tx.wait();

  tx = await bridge.transferOwnership(XVSBridgeAdmin.address);
  await tx.wait();

  tx = await bridgeAdmin.transferOwnership(preconfiguredAddresses.NormalTimelock);
  await tx.wait();
  console.log(
    `Bridge Admin owner ${deployer} sucessfully changed to ${preconfiguredAddresses.NormalTimelock}. Please accept the ownership.`,
  );

  const commands = [
    ...(await configureAccessControls(
      xvsBridgeMethodsDest,
      accessControlManager.address,
      preconfiguredAddresses.NormalTimelock,
      XVSBridgeAdmin.address,
      hre,
    )),

    ...(await configureAccessControls(
      xvsTokenPermissions,
      accessControlManager.address,
      XVSProxyOFTDest.address,
      XVS.address,
      hre,
    )),

    ...(await configureAccessControls(
      XVSBridgeAdminMethods,
      accessControlManager.address,
      preconfiguredAddresses.NormalTimelock,
      XVSBridgeAdmin.address,
      hre,
    )),

    ...(await configureAccessControls(
      XVSTokenDestMethods,
      accessControlManager.address,
      preconfiguredAddresses.NormalTimelock,
      XVS.address,
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

    ...(await configureXVSTokenMintCapCommands(XVS.address, XVSProxyOFTDest.address)),
  ];
  console.log("Please propose a Multisig tx with the following commands:");
  console.log(
    JSON.stringify(
      commands.map(c => ({ target: c.contract, signature: c.signature, params: c.parameters, value: c.value })),
    ),
  );
};
func.tags = ["XVSBridgeDest"];

func.skip = async (hre: HardhatRuntimeEnvironment) =>
  hre.network.live === false || hre.network.name === "bsctestnet" || hre.network.name === "bscmainnet";
export default func;

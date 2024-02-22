import { BigNumberish } from "ethers";
import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import {
  bridgeConfig,
  getPreConfiguredAddresses,
  mintableTokenBridgeMethods,
  multichainTokenMethods,
  tokenBridgeAdminMethods,
  tokenControllerMethods,
} from "../helpers/deploymentConfig";
import { toAddress } from "../helpers/utils";
import { MintableTokenBridge } from "../typechain";

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
const configureMultichainTokenMintCapCommands = async (
  token: string,
  minterAddress: string,
): Promise<GovernanceCommand[]> => {
  const command = [
    {
      contract: token,
      signature: "setMintCap(address,uint256)",
      argTypes: ["address", "uint256"],
      parameters: [minterAddress, "100000000000000000000"],
      value: 0,
    },
  ];
  return command.flat();
};

const executeBridgeCommands = async (target: MintableTokenBridge, hre: HardhatRuntimeEnvironment, deployer: string) => {
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
  const normalTimelock = await ethers.getContract("NormalTimelock");
  const accessControlManager = await ethers.getContract("AccessControlManager");
  const resilientOracle = await ethers.getContract("ResilientOracle");
  const token = await ethers.getContract("VAI");

  const TokenBridgeController = await deploy("TokenBridgeControllerSrcVAI", {
    from: deployer,
    contract: "TokenBridgeController",
    args: [accessControlManager.address, token.address],
    autoMine: true,
    log: true,
  });

  const MintableTokenBridge = await deploy("MintableTokenBridgeSrcVAI", {
    from: deployer,
    contract: "MintableTokenBridge",
    args: [token.address, 8, preconfiguredAddresses.LzEndpoint, resilientOracle.address, true],
    autoMine: true,
    log: true,
  });

  const TokenBridgeAdmin = await deploy("TokenBridgeAdminSrcVAI", {
    from: deployer,
    args: [MintableTokenBridge.address],
    contract: "TokenBridgeAdmin",
    proxy: {
      owner: normalTimelock.address,
      proxyContract: "OpenZeppelinTransparentProxy",
      execute: {
        methodName: "initialize",
        args: [accessControlManager.address],
      },
      upgradeIndex: 0,
    },
    log: true,
    autoMine: true,
  });

  const bridge = await ethers.getContract<MintableTokenBridge>("MintableTokenBridgeSrcVAI");
  const bridgeAdmin = await ethers.getContract("TokenBridgeAdminSrcVAI");

  await executeBridgeCommands(bridge, hre, deployer);

  const removeArray = new Array(multichainTokenMethods.length).fill(true);
  let tx = await bridgeAdmin.upsertSignature(multichainTokenMethods, removeArray);
  await tx.wait();

  tx = await bridge.transferOwnership(TokenBridgeAdmin.address);
  await tx.wait();

  tx = await bridgeAdmin.transferOwnership(normalTimelock.address);
  await tx.wait();

  console.log(
    `Bridge Admin owner ${deployer} sucessfully changed to ${preconfiguredAddresses.NormalTimelock}. Please accept the ownership.`,
  );

  const commands = [
    ...(await configureAccessControls(
      mintableTokenBridgeMethods,
      accessControlManager.address,
      normalTimelock.address,
      TokenBridgeAdmin.address,
      hre,
    )),

    ...(await configureAccessControls(
      multichainTokenMethods,
      accessControlManager.address,
      MintableTokenBridge.address,
      TokenBridgeController.address,
      hre,
    )),

    ...(await configureAccessControls(
      tokenBridgeAdminMethods,
      accessControlManager.address,
      normalTimelock.address,
      TokenBridgeAdmin.address,
      hre,
    )),

    ...(await configureAccessControls(
      tokenControllerMethods,
      accessControlManager.address,
      normalTimelock.address,
      TokenBridgeController.address,
      hre,
    )),

    {
      contract: TokenBridgeAdmin.address,
      signature: "acceptOwnership()",
      parameters: [],
      value: 0,
    },

    {
      contract: MintableTokenBridge.address,
      signature: "setTrustedRemoteAddress(uint16,bytes)",
      parameters: [preconfiguredAddresses.LzVirtualChainIdL, "0xDestAddress"],
      value: 0,
    },

    ...(await configureMultichainTokenMintCapCommands(TokenBridgeController.address, MintableTokenBridge.address)),
  ];
  console.log("Please propose a VIP with the following commands:");
  console.log(
    JSON.stringify(
      commands.map(c => ({ target: c.contract, signature: c.signature, params: c.parameters, value: c.value })),
    ),
  );
};
func.tags = ["mintable-token-bridge-src"];

func.skip = async (hre: HardhatRuntimeEnvironment) =>
  !(hre.network.name === "bsctestnet" || hre.network.name === "bscmainnet");
export default func;

import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";

import { AddressOne, convertToUnit } from "../helpers/utils";
import {
  AccessControlManager,
  LZEndpointMock,
  LZEndpointMock__factory,
  XVS,
  XVSBridgeAdmin,
  XVSProxyOFTDest,
  XVSProxyOFTDest__factory,
  XVS__factory,
} from "../typechain";

describe("Bridge Admin: ", function () {
  const localChainId = 1;
  const remoteChainId = 2;
  const singleTransactionLimit = convertToUnit(10, 18);
  const maxDailyTransactionLimit = convertToUnit(100, 18);

  const functionregistry = [
    "setOracle(address)",
    "setMaxSingleTransactionLimit(uint16,uint256)",
    "setMaxDailyLimit(uint16,uint256)",
    "setMaxSingleReceiveTransactionLimit(uint16,uint256)",
    "setMaxDailyReceiveLimit(uint16,uint256)",
    "pause()",
    "unpause()",
    "setWhitelist(address,bool)",
    "setConfig(uint16,uint16,uint256,bytes)",
    "setSendVersion(uint16)",
    "setReceiveVersion(uint16)",
    "forceResumeReceive(uint16,bytes)",
    "setTrustedRemoteAddress(uint16,bytes)",
    "setPrecrime(address)",
    "setMinDstGas(uint16,uint16,uint256)",
    "setPayloadSizeLimit(uint16,uint256)",
    "removeTrustedRemote(uint16)",
    "updateSendAndCallEnabled(bool)",
    "sweepToken(address,address,uint256)",
    "dropFailedMessage(uint16,bytes,uint64)",
  ];

  let LZEndpointMock: LZEndpointMock__factory,
    ProxyOFTV2Dest: XVSProxyOFTDest__factory,
    RemoteTokenFactory: XVS__factory,
    remoteEndpoint: LZEndpointMock,
    remoteOFT: XVSProxyOFTDest,
    bridgeAdmin: XVSBridgeAdmin,
    remotePath: string,
    acc2: SignerWithAddress,
    acc1: SignerWithAddress,
    accessControlManager: AccessControlManager,
    remoteToken: XVS;

  const grantPermissionsFixture = async () => {
    let tx = await accessControlManager
      .connect(acc1)
      .giveCallPermission(bridgeAdmin.address, "setMaxSingleTransactionLimit(uint16,uint256)", acc2.address);
    await tx.wait();

    tx = await accessControlManager
      .connect(acc1)
      .giveCallPermission(bridgeAdmin.address, "setMaxDailyLimit(uint16,uint256)", acc2.address);
    await tx.wait();

    tx = await accessControlManager
      .connect(acc1)
      .giveCallPermission(bridgeAdmin.address, "setMaxSingleReceiveTransactionLimit(uint16,uint256)", acc2.address);
    await tx.wait();

    tx = await accessControlManager
      .connect(acc1)
      .giveCallPermission(bridgeAdmin.address, "setMaxDailyReceiveLimit(uint16,uint256)", acc2.address);
    await tx.wait();

    tx = await accessControlManager
      .connect(acc1)
      .giveCallPermission(bridgeAdmin.address, "transferBridgeOwnership(address)", acc2.address);
    await tx.wait();
  };

  before(async function () {
    acc1 = (await ethers.getSigners())[0];
    acc2 = (await ethers.getSigners())[1];

    LZEndpointMock = await ethers.getContractFactory("LZEndpointMock");
    ProxyOFTV2Dest = await ethers.getContractFactory("XVSProxyOFTDest");
    const accessControlManagerFactory = await ethers.getContractFactory("AccessControlManager");
    RemoteTokenFactory = await ethers.getContractFactory("XVS");

    accessControlManager = await accessControlManagerFactory.deploy();
    remoteToken = await RemoteTokenFactory.deploy(accessControlManager.address);
    remoteEndpoint = await LZEndpointMock.deploy(remoteChainId);
    remoteOFT = await ProxyOFTV2Dest.deploy(remoteToken.address, 8, remoteEndpoint.address, AddressOne);

    const bridgeAdminFactory = await ethers.getContractFactory("XVSBridgeAdmin");
    bridgeAdmin = await upgrades.deployProxy(bridgeAdminFactory, [accessControlManager.address], {
      constructorArgs: [remoteOFT.address],
      initializer: "initialize",
    });

    await bridgeAdmin.deployed();
    await remoteOFT.transferOwnership(bridgeAdmin.address);

    remotePath = ethers.utils.solidityPack(["address", "address"], [AddressOne, remoteOFT.address]);

    const activeArray = new Array(functionregistry.length).fill(true);
    await bridgeAdmin.upsertSignature(functionregistry, activeArray);
    await loadFixture(grantPermissionsFixture);
  });

  it("Revert when inputs length mismatch in function registry", async function () {
    const activeArray = new Array(functionregistry.length - 1).fill(true);

    await expect(bridgeAdmin.upsertSignature(functionregistry, activeArray)).to.be.revertedWith(
      "Input arrays must have the same length",
    );
  });

  it("Deletes from function registry", async function () {
    const activeArray = new Array(functionregistry.length).fill(true);
    await bridgeAdmin.upsertSignature(functionregistry, activeArray);
    await bridgeAdmin.upsertSignature(["fakeFunction(uint256)"], [true]);
    await expect(bridgeAdmin.upsertSignature(["fakeFunction(uint256)"], [false])).to.emit(
      bridgeAdmin,
      "FunctionRegistryChanged",
    );
  });

  it("Reverts when non owner calls upsert signature", async function () {
    const activeArray = new Array(functionregistry.length - 1).fill(true);

    await expect(bridgeAdmin.connect(acc2).upsertSignature(functionregistry, activeArray)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
  });

  it("Revert if EOA called owner function of bridge", async function () {
    await expect(remoteOFT.connect(acc1).setTrustedRemote(localChainId, remotePath)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
  });

  it("Revert if permissions are not granted to call owner functions of bridge", async function () {
    let data = remoteOFT.interface.encodeFunctionData("setTrustedRemoteAddress", [localChainId, remotePath]);
    await expect(
      acc1.sendTransaction({
        to: bridgeAdmin.address,
        data: data,
      }),
    ).to.revertedWithCustomError(bridgeAdmin, "Unauthorized");

    data = remoteOFT.interface.encodeFunctionData("setMaxSingleTransactionLimit", [
      localChainId,
      singleTransactionLimit,
    ]);
    await expect(
      acc1.sendTransaction({
        to: bridgeAdmin.address,
        data: data,
      }),
    ).to.revertedWithCustomError(bridgeAdmin, "Unauthorized");

    data = remoteOFT.interface.encodeFunctionData("setMaxDailyLimit", [localChainId, maxDailyTransactionLimit]);
    await expect(
      acc1.sendTransaction({
        to: bridgeAdmin.address,
        data: data,
      }),
    ).to.revertedWithCustomError(bridgeAdmin, "Unauthorized");

    data = remoteOFT.interface.encodeFunctionData("setMaxSingleReceiveTransactionLimit", [
      localChainId,
      singleTransactionLimit,
    ]);
    await expect(
      acc1.sendTransaction({
        to: bridgeAdmin.address,
        data: data,
      }),
    ).to.revertedWithCustomError(bridgeAdmin, "Unauthorized");

    data = remoteOFT.interface.encodeFunctionData("setMaxDailyReceiveLimit", [localChainId, maxDailyTransactionLimit]);
    await expect(
      acc1.sendTransaction({
        to: bridgeAdmin.address,
        data: data,
      }),
    ).to.revertedWithCustomError(bridgeAdmin, "Unauthorized");
  });
  it("Success if permissions are granted to call owner functions of bridge", async function () {
    let data = remoteOFT.interface.encodeFunctionData("setMaxDailyLimit", [localChainId, maxDailyTransactionLimit]);
    await acc2.sendTransaction({
      to: bridgeAdmin.address,
      data: data,
    });

    data = remoteOFT.interface.encodeFunctionData("setMaxSingleTransactionLimit", [
      localChainId,
      singleTransactionLimit,
    ]);
    await acc2.sendTransaction({
      to: bridgeAdmin.address,
      data: data,
    });

    data = remoteOFT.interface.encodeFunctionData("setMaxDailyReceiveLimit", [localChainId, maxDailyTransactionLimit]);
    await acc2.sendTransaction({
      to: bridgeAdmin.address,
      data: data,
    });

    data = remoteOFT.interface.encodeFunctionData("setMaxSingleReceiveTransactionLimit", [
      localChainId,
      singleTransactionLimit,
    ]);
    await acc2.sendTransaction({
      to: bridgeAdmin.address,
      data: data,
    });
  });

  it("Revert if function is removed from function registry", async function () {
    await bridgeAdmin.upsertSignature(["setMaxDailyReceiveLimit(uint16,uint256)"], [false]);
    const data = remoteOFT.interface.encodeFunctionData("setMaxDailyReceiveLimit", [
      localChainId,
      maxDailyTransactionLimit,
    ]);
    await expect(
      acc1.sendTransaction({
        to: bridgeAdmin.address,
        data: data,
      }),
    ).to.be.revertedWith("Function not found");
  });

  it("Revert if function is not found in bridge admin function registry", async function () {
    const data = remoteOFT.interface.encodeFunctionData("oracle");
    await expect(
      acc1.sendTransaction({
        to: bridgeAdmin.address,
        data: data,
      }),
    ).to.be.revertedWith("Function not found");
  });

  it("Success on transfer bridge owner", async function () {
    await bridgeAdmin.connect(acc2).transferBridgeOwnership(acc2.address);
    expect(await remoteOFT.owner()).equals(acc2.address);
  });
});

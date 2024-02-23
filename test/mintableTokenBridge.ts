import { FakeContract, smock } from "@defi-wonderland/smock";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";

import { convertToUnit } from "../helpers/utils";
import {
  AccessControlManager,
  LZEndpointMock,
  LZEndpointMock__factory,
  MintableTokenBridge,
  MintableTokenBridge__factory,
  MockToken,
  MockToken__factory,
  MultichainToken,
  MultichainToken__factory,
  ResilientOracleInterface,
  TokenBridgeAdmin,
  TokenBridgeController,
  TokenBridgeController__factory,
} from "../typechain";

describe("Multichain Bridge:", function () {
  const localChainId = 1;
  const remoteChainId = 2;
  const name = "MultichainToken";
  const symbol = "MT";
  const sharedDecimals = 8;
  const singleTransactionLimit = convertToUnit(10, 18);
  const maxDailyTransactionLimit = convertToUnit(100, 18);

  let LZEndpointMock: LZEndpointMock__factory,
    RemoteTokenFactory: MultichainToken__factory,
    LocalTokenFactory: MockToken__factory,
    ProxyOFTV2Src: MintableTokenBridge__factory,
    ProxyOFTV2Dest: MintableTokenBridge__factory,
    localEndpoint: LZEndpointMock,
    remoteEndpoint: LZEndpointMock,
    localOFT: MintableTokenBridge,
    remoteOFT: MintableTokenBridge,
    localToken: MockToken,
    remoteToken: MultichainToken,
    tokenBridgeControllerFactory: TokenBridgeController__factory,
    tokenBridgeController: TokenBridgeController,
    bridgeAdminRemote: TokenBridgeAdmin,
    bridgeAdminLocal: TokenBridgeAdmin,
    localPath: string,
    remotePath: string,
    acc2: SignerWithAddress,
    acc3: SignerWithAddress,
    acc1: SignerWithAddress,
    accessControlManager: FakeContract<AccessControlManager>,
    oracle: FakeContract<ResilientOracleInterface>,
    defaultAdapterParams: any;
  const amount = convertToUnit(10, 18);

  async function mintOnSrc(account: SignerWithAddress, amount: string) {
    await tokenBridgeController.setMintCap(account.address, amount);
    await tokenBridgeController.connect(account).mint(account.address, amount);
    expect(await localToken.balanceOf(account.address)).to.be.equal(amount);
  }
  async function mintOnDest(account: SignerWithAddress, amount: string) {
    await remoteToken.setMintCap(account.address, amount);
    await remoteToken.connect(account).mint(account.address, amount);
    expect(await remoteToken.balanceOf(account.address)).to.be.equal(amount);
  }
  const bridgeFixture = async () => {
    LZEndpointMock = await ethers.getContractFactory("LZEndpointMock");
    ProxyOFTV2Src = await ethers.getContractFactory("MintableTokenBridge");
    ProxyOFTV2Dest = await ethers.getContractFactory("MintableTokenBridge");
    LocalTokenFactory = await ethers.getContractFactory("MockToken");
    tokenBridgeControllerFactory = await ethers.getContractFactory("TokenBridgeController");
    accessControlManager = await smock.fake<AccessControlManager>("AccessControlManager");
    accessControlManager.isAllowedToCall.returns(true);
    RemoteTokenFactory = await ethers.getContractFactory("MultichainToken");
    acc1 = (await ethers.getSigners())[0];
    acc2 = (await ethers.getSigners())[1];
    acc3 = (await ethers.getSigners())[2];
    oracle = await smock.fake<ResilientOracleInterface>("ResilientOracleInterface");
    oracle.getPrice.returns(convertToUnit(1, 18));
    defaultAdapterParams = ethers.utils.solidityPack(["uint16", "uint256"], [1, 500000]);

    localEndpoint = await LZEndpointMock.deploy(localChainId);
    remoteEndpoint = await LZEndpointMock.deploy(remoteChainId);

    // create two OmnichainFungibleToken instances
    localToken = await LocalTokenFactory.deploy(name, symbol, 18);
    remoteToken = await RemoteTokenFactory.deploy(accessControlManager.address, name, symbol);

    tokenBridgeController = await tokenBridgeControllerFactory.deploy(accessControlManager.address, localToken.address);
    localOFT = await ProxyOFTV2Src.deploy(
      tokenBridgeController.address,
      sharedDecimals,
      localEndpoint.address,
      oracle.address,
      true,
    );
    remoteOFT = await ProxyOFTV2Dest.deploy(
      remoteToken.address,
      sharedDecimals,
      remoteEndpoint.address,
      oracle.address,
      true,
    );

    const bridgeAdminFactory = await ethers.getContractFactory("TokenBridgeAdmin");
    bridgeAdminRemote = await upgrades.deployProxy(bridgeAdminFactory, [accessControlManager.address], {
      constructorArgs: [remoteOFT.address],
      initializer: "initialize",
    });
    await bridgeAdminRemote.deployed();

    bridgeAdminLocal = await upgrades.deployProxy(bridgeAdminFactory, [accessControlManager.address], {
      constructorArgs: [localOFT.address],
      initializer: "initialize",
    });
    await bridgeAdminLocal.deployed();

    await remoteOFT.transferOwnership(bridgeAdminRemote.address);
    await localOFT.transferOwnership(bridgeAdminLocal.address);

    await localEndpoint.setDestLzEndpoint(remoteOFT.address, remoteEndpoint.address);
    await remoteEndpoint.setDestLzEndpoint(localOFT.address, localEndpoint.address);

    // set each contracts source address so it can send to each other
    localPath = ethers.utils.solidityPack(["address", "address"], [localOFT.address, remoteOFT.address]);
    remotePath = ethers.utils.solidityPack(["address", "address"], [remoteOFT.address, localOFT.address]);

    // Set mint cap for destination bridge
    await remoteToken.setMintCap(remoteOFT.address, convertToUnit("100000", 18));

    // Set mint cap for source bridge
    await tokenBridgeController.setMintCap(localOFT.address, convertToUnit("100000", 18));

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
      "forceMint(uint16,address,uint256)",
      "dropFailedMessage(uint16,bytes,uint64)",
      "removeTrustedRemote(uint16)",
    ];
    const activeArray = new Array(functionregistry.length).fill(true);
    await bridgeAdminRemote.upsertSignature(functionregistry, activeArray);
    await bridgeAdminLocal.upsertSignature(functionregistry, activeArray);

    await bridgeAdminLocal.setTrustedRemoteAddress(remoteChainId, remoteOFT.address);
    await bridgeAdminRemote.setTrustedRemoteAddress(localChainId, localOFT.address);
    let data = localOFT.interface.encodeFunctionData("setMinDstGas", [remoteChainId, 0, 200000]);
    await acc1.sendTransaction({
      to: bridgeAdminLocal.address,
      data: data,
    });
    data = localOFT.interface.encodeFunctionData("setMaxDailyLimit", [remoteChainId, maxDailyTransactionLimit]);
    await acc1.sendTransaction({
      to: bridgeAdminLocal.address,
      data: data,
    });

    data = localOFT.interface.encodeFunctionData("setMaxSingleTransactionLimit", [
      remoteChainId,
      singleTransactionLimit,
    ]);
    await acc1.sendTransaction({
      to: bridgeAdminLocal.address,
      data: data,
    });

    data = localOFT.interface.encodeFunctionData("setMaxDailyReceiveLimit", [remoteChainId, maxDailyTransactionLimit]);
    await acc1.sendTransaction({
      to: bridgeAdminLocal.address,
      data: data,
    });
    data = localOFT.interface.encodeFunctionData("setMaxSingleReceiveTransactionLimit", [
      remoteChainId,
      singleTransactionLimit,
    ]);
    await acc1.sendTransaction({
      to: bridgeAdminLocal.address,
      data: data,
    });

    // Setting remote chain

    await bridgeAdminRemote.setTrustedRemoteAddress(localChainId, localOFT.address);

    data = remoteOFT.interface.encodeFunctionData("setMinDstGas", [localChainId, 0, 200000]);
    await acc1.sendTransaction({
      to: bridgeAdminRemote.address,
      data: data,
    });

    data = remoteOFT.interface.encodeFunctionData("setMaxDailyLimit", [localChainId, maxDailyTransactionLimit]);
    await acc1.sendTransaction({
      to: bridgeAdminRemote.address,
      data: data,
    });
    data = remoteOFT.interface.encodeFunctionData("setMaxSingleTransactionLimit", [
      localChainId,
      singleTransactionLimit,
    ]);
    await acc1.sendTransaction({
      to: bridgeAdminRemote.address,
      data: data,
    });

    data = remoteOFT.interface.encodeFunctionData("setMaxDailyReceiveLimit", [localChainId, maxDailyTransactionLimit]);
    await acc1.sendTransaction({
      to: bridgeAdminRemote.address,
      data: data,
    });
    data = remoteOFT.interface.encodeFunctionData("setMaxSingleReceiveTransactionLimit", [
      localChainId,
      singleTransactionLimit,
    ]);
    await acc1.sendTransaction({
      to: bridgeAdminRemote.address,
      data: data,
    });
  };
  beforeEach(async function () {
    await loadFixture(bridgeFixture);
  });

  it("Revert when admin functions are accessed by non admin on source chain", async () => {
    await expect(localOFT.setTrustedRemoteAddress(remoteChainId, remoteOFT.address)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    await expect(localOFT.setMinDstGas(remoteChainId, 0, 200000)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    await expect(localOFT.setMaxDailyLimit(remoteChainId, maxDailyTransactionLimit)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    await expect(localOFT.setMaxSingleTransactionLimit(remoteChainId, singleTransactionLimit)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    await expect(localOFT.setMaxDailyReceiveLimit(remoteChainId, maxDailyTransactionLimit)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    await expect(
      localOFT.setMaxSingleReceiveTransactionLimit(remoteChainId, singleTransactionLimit),
    ).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(localOFT.dropFailedMessage(remoteChainId, remotePath, 1)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    await expect(localOFT.forceMint(remoteChainId, acc3.address, amount)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    await expect(localOFT.setWhitelist(acc3.address, true)).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(localOFT.unpause()).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(localOFT.pause()).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(localOFT.setOracle(oracle.address)).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(localOFT.updateSendAndCallEnabled(true)).to.be.revertedWith("Ownable: caller is not the owner");
  });
  it("Revert when admin functions are accessed by non admin on destination chain", async () => {
    await expect(remoteOFT.setTrustedRemoteAddress(localChainId, localOFT.address)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    await expect(remoteOFT.setMinDstGas(localChainId, 0, 200000)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    await expect(remoteOFT.setMaxDailyLimit(localChainId, maxDailyTransactionLimit)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    await expect(remoteOFT.setMaxSingleTransactionLimit(localChainId, singleTransactionLimit)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    await expect(remoteOFT.setMaxDailyReceiveLimit(localChainId, maxDailyTransactionLimit)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    await expect(
      remoteOFT.setMaxSingleReceiveTransactionLimit(localChainId, singleTransactionLimit),
    ).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(remoteOFT.dropFailedMessage(localChainId, localPath, 1)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    await expect(remoteOFT.forceMint(localChainId, acc3.address, amount)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    await expect(remoteOFT.setWhitelist(acc3.address, true)).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(remoteOFT.unpause()).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(remoteOFT.pause()).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(remoteOFT.setOracle(oracle.address)).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(remoteOFT.updateSendAndCallEnabled(true)).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(remoteOFT.sweepToken(localToken.address, acc2.address, convertToUnit(10, 18))).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
  });

  it("Successful transfer of token from source to destination", async () => {
    // Minted tokens to user on source chain
    await mintOnSrc(acc2, amount);

    // Converting receiver address into bytes
    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);

    // Calculating gas fee to transfer tokens
    const nativeFee = (
      await localOFT.estimateSendFee(remoteChainId, acc3AddressBytes32, amount, false, defaultAdapterParams)
    ).nativeFee;

    await localOFT
      .connect(acc2)
      .sendFrom(
        acc2.address,
        remoteChainId,
        acc3AddressBytes32,
        amount,
        [acc2.address, ethers.constants.AddressZero, defaultAdapterParams],
        { value: nativeFee },
      );
    expect(await remoteToken.balanceOf(acc3.address)).to.be.equal(amount);
  });
  it("Successful transfer of tokens from destination to source", async () => {
    await mintOnDest(acc2, amount);
    remotePath;
    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);
    const nativeFee = (
      await remoteOFT.estimateSendFee(localChainId, acc3AddressBytes32, amount, false, defaultAdapterParams)
    ).nativeFee;

    await remoteOFT
      .connect(acc2)
      .sendFrom(
        acc2.address,
        localChainId,
        acc3AddressBytes32,
        amount,
        [acc2.address, ethers.constants.AddressZero, defaultAdapterParams],
        { value: nativeFee },
      );
    expect(await localToken.balanceOf(acc3.address)).to.be.equal(amount);
  });
  it("Fails when bridge mint limit exceeds on destination chain", async () => {
    await remoteToken.setMintCap(remoteOFT.address, convertToUnit(9, 18));
    await mintOnSrc(acc2, amount);
    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);
    const nativeFee = (
      await localOFT.estimateSendFee(remoteChainId, acc3AddressBytes32, amount, false, defaultAdapterParams)
    ).nativeFee;

    await localOFT
      .connect(acc2)
      .sendFrom(
        acc2.address,
        remoteChainId,
        acc3AddressBytes32,
        amount,
        [acc2.address, ethers.constants.AddressZero, defaultAdapterParams],
        { value: nativeFee },
      );
    expect(await remoteToken.balanceOf(acc3.address)).not.to.be.equal(amount);
  });
  it("Fails when bridge mint limit exceeds on source chain", async () => {
    await tokenBridgeController.setMintCap(localOFT.address, convertToUnit(9, 18));

    await mintOnDest(acc2, amount);

    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);
    const nativeFee = (
      await remoteOFT.estimateSendFee(localChainId, acc3AddressBytes32, amount, false, defaultAdapterParams)
    ).nativeFee;

    await remoteOFT
      .connect(acc2)
      .sendFrom(
        acc2.address,
        localChainId,
        acc3AddressBytes32,
        amount,
        [acc2.address, ethers.constants.AddressZero, defaultAdapterParams],
        { value: nativeFee },
      );
    expect(await localToken.balanceOf(acc3.address)).not.to.be.equal(amount);
  });
  it("Recover tokens on failure", async () => {
    await remoteToken.setMintCap(remoteOFT.address, convertToUnit(9, 18));

    await mintOnSrc(acc2, amount);
    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);
    const nativeFee = (
      await localOFT.estimateSendFee(remoteChainId, acc3AddressBytes32, amount, false, defaultAdapterParams)
    ).nativeFee;

    await localOFT
      .connect(acc2)
      .sendFrom(
        acc2.address,
        remoteChainId,
        acc3AddressBytes32,
        amount,
        [acc2.address, ethers.constants.AddressZero, defaultAdapterParams],
        { value: nativeFee },
      );

    expect(await remoteToken.balanceOf(acc3.address)).not.to.be.equal(amount);
    await remoteToken.setMintCap(remoteOFT.address, convertToUnit(100, 18));
    let data = remoteOFT.interface.encodeFunctionData("dropFailedMessage", [localChainId, localPath, 1]);
    await acc1.sendTransaction({
      to: bridgeAdminRemote.address,
      data: data,
    });
    data = remoteOFT.interface.encodeFunctionData("forceMint", [localChainId, acc3.address, amount]);
    await acc1.sendTransaction({
      to: bridgeAdminRemote.address,
      data: data,
    });
    expect(await remoteToken.balanceOf(acc3.address)).to.be.equal(amount);
  });
  it("Recover tokens on any chain", async () => {
    await remoteToken.setMintCap(remoteOFT.address, convertToUnit(9, 18));

    await mintOnSrc(acc2, amount);
    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);
    const nativeFee = (
      await localOFT.estimateSendFee(remoteChainId, acc3AddressBytes32, amount, false, defaultAdapterParams)
    ).nativeFee;

    await localOFT
      .connect(acc2)
      .sendFrom(
        acc2.address,
        remoteChainId,
        acc3AddressBytes32,
        amount,
        [acc2.address, ethers.constants.AddressZero, defaultAdapterParams],
        { value: nativeFee },
      );
    expect(await remoteToken.balanceOf(acc3.address)).not.to.be.equal(amount);
    await tokenBridgeController.setMintCap(localOFT.address, convertToUnit(10, 18));

    let data = localOFT.interface.encodeFunctionData("setMaxDailyReceiveLimit", [
      localChainId,
      maxDailyTransactionLimit,
    ]);
    await acc1.sendTransaction({
      to: bridgeAdminLocal.address,
      data: data,
    });

    data = localOFT.interface.encodeFunctionData("setMaxSingleReceiveTransactionLimit", [
      localChainId,
      singleTransactionLimit,
    ]);
    await acc1.sendTransaction({
      to: bridgeAdminLocal.address,
      data: data,
    });

    data = remoteOFT.interface.encodeFunctionData("dropFailedMessage", [localChainId, localPath, 1]);
    await acc1.sendTransaction({
      to: bridgeAdminRemote.address,
      data: data,
    });

    data = localOFT.interface.encodeFunctionData("forceMint", [localChainId, acc3.address, amount]);
    await acc1.sendTransaction({
      to: bridgeAdminLocal.address,
      data: data,
    });
    expect(await localToken.balanceOf(acc3.address)).to.be.equal(amount);
  });
  it("Reverts when force mint is not active", async function () {
    const localOFT2 = await ProxyOFTV2Src.deploy(
      tokenBridgeController.address,
      sharedDecimals,
      localEndpoint.address,
      oracle.address,
      false,
    );
    await localOFT2.transferOwnership(bridgeAdminLocal.address);
    await tokenBridgeController.setMintCap(localOFT2.address, convertToUnit("100000", 18));

    await remoteToken.setMintCap(remoteOFT.address, convertToUnit(9, 18));

    await mintOnSrc(acc2, amount);
    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);
    const nativeFee = (
      await localOFT.estimateSendFee(remoteChainId, acc3AddressBytes32, amount, false, defaultAdapterParams)
    ).nativeFee;

    await localOFT
      .connect(acc2)
      .sendFrom(
        acc2.address,
        remoteChainId,
        acc3AddressBytes32,
        amount,
        [acc2.address, ethers.constants.AddressZero, defaultAdapterParams],
        { value: nativeFee },
      );

    expect(await remoteToken.balanceOf(acc3.address)).not.to.be.equal(amount);
    await remoteToken.setMintCap(remoteOFT.address, convertToUnit(100, 18));
    let data = remoteOFT.interface.encodeFunctionData("dropFailedMessage", [localChainId, localPath, 1]);
    await acc1.sendTransaction({
      to: bridgeAdminRemote.address,
      data: data,
    });
    data = localOFT2.interface.encodeFunctionData("forceMint", [localChainId, acc3.address, amount]);
    await expect(
      acc1.sendTransaction({
        to: bridgeAdminLocal.address,
        data: data,
      }),
    ).to.be.reverted;
  });
  it("Reverts when single transaction limit exceeds daily limit", async function () {
    const data = remoteOFT.interface.encodeFunctionData("setMaxSingleTransactionLimit", [
      localChainId,
      convertToUnit(110, 18),
    ]);
    await expect(
      acc1.sendTransaction({
        to: bridgeAdminRemote.address,
        data: data,
      }),
    ).to.be.reverted;
  });
  it("Reverts when daily limit is less than single transaction limit", async function () {
    const data = remoteOFT.interface.encodeFunctionData("setMaxDailyLimit", [localChainId, convertToUnit(9, 18)]);
    await expect(
      acc1.sendTransaction({
        to: bridgeAdminRemote.address,
        data: data,
      }),
    ).to.be.reverted;
  });
  it("Reverts when single limit exceeds daily limit on remote", async () => {
    const data = remoteOFT.interface.encodeFunctionData("setMaxDailyReceiveLimit", [
      localChainId,
      convertToUnit(9, 18),
    ]);
    await expect(
      acc1.sendTransaction({
        to: bridgeAdminRemote.address,
        data: data,
      }),
    ).to.be.reverted;
  });
  it("Reverts when single receive transaction limit exceeds daily limit", async () => {
    const data = remoteOFT.interface.encodeFunctionData("setMaxSingleReceiveTransactionLimit", [
      localChainId,
      convertToUnit(110, 18),
    ]);
    await expect(
      acc1.sendTransaction({
        to: bridgeAdminRemote.address,
        data: data,
      }),
    ).to.be.reverted;
  });
  it("Reverts when caller and sender are different on source", async function () {
    await mintOnSrc(acc2, amount);

    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);

    const nativeFee = (
      await localOFT.estimateSendFee(remoteChainId, acc3AddressBytes32, amount, false, defaultAdapterParams)
    ).nativeFee;

    await expect(
      localOFT
        .connect(acc3)
        .sendFrom(
          acc2.address,
          remoteChainId,
          acc3AddressBytes32,
          amount,
          [acc2.address, ethers.constants.AddressZero, defaultAdapterParams],
          { value: nativeFee },
        ),
    ).to.be.revertedWith("ProxyOFT: owner is not send caller");
  });
  it("Reverts when caller and sender are different on destination", async function () {
    await mintOnDest(acc2, amount);

    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);

    const nativeFee = (
      await remoteOFT.estimateSendFee(localChainId, acc3AddressBytes32, amount, false, defaultAdapterParams)
    ).nativeFee;

    await expect(
      remoteOFT
        .connect(acc3)
        .sendFrom(
          acc2.address,
          localChainId,
          acc3AddressBytes32,
          amount,
          [acc2.address, ethers.constants.AddressZero, defaultAdapterParams],
          { value: nativeFee },
        ),
    ).to.be.revertedWith("ProxyOFT: owner is not send caller");
  });
  it("Reverts if amount is too small", async function () {
    const amount = ethers.utils.parseEther("0.00000000001", 18);
    await mintOnSrc(acc2, amount);

    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);

    const nativeFee = (
      await localOFT.estimateSendFee(remoteChainId, acc3AddressBytes32, amount, false, defaultAdapterParams)
    ).nativeFee;

    await expect(
      localOFT
        .connect(acc2)
        .sendFrom(
          acc2.address,
          remoteChainId,
          acc3AddressBytes32,
          amount,
          [acc2.address, ethers.constants.AddressZero, defaultAdapterParams],
          { value: nativeFee },
        ),
    ).to.be.revertedWith("OFTCore: amount too small");
  });

  it("Reverts on remote chain if vai token is paused", async function () {
    await remoteToken.pause();

    await mintOnSrc(acc2, amount);

    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);
    const nativeFee = (
      await localOFT.estimateSendFee(remoteChainId, acc3AddressBytes32, amount, false, defaultAdapterParams)
    ).nativeFee;

    await expect(
      localOFT
        .connect(acc2)
        .sendFrom(
          acc2.address,
          remoteChainId,
          acc3AddressBytes32,
          amount,
          [acc2.address, ethers.constants.AddressZero, defaultAdapterParams],
          { value: nativeFee },
        ),
    ).not.to.emit(remoteOFT, "ReceiveFromChain");
  });
  it("Reverts on remote chain if bridge is paused", async function () {
    const data = remoteOFT.interface.encodeFunctionData("pause");
    await acc1.sendTransaction({
      to: bridgeAdminRemote.address,
      data: data,
    });

    await mintOnSrc(acc2, amount);

    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);
    const nativeFee = (
      await localOFT.estimateSendFee(remoteChainId, acc3AddressBytes32, amount, false, defaultAdapterParams)
    ).nativeFee;

    await expect(
      localOFT
        .connect(acc2)
        .sendFrom(
          acc2.address,
          remoteChainId,
          acc3AddressBytes32,
          amount,
          [acc2.address, ethers.constants.AddressZero, defaultAdapterParams],
          { value: nativeFee },
        ),
    ).not.to.emit(remoteOFT, "ReceiveFromChain");
  });
  it("Reverts on local chain if bridge is paused", async function () {
    const data = localOFT.interface.encodeFunctionData("pause");
    await acc1.sendTransaction({
      to: bridgeAdminLocal.address,
      data: data,
    });

    await mintOnDest(acc2, amount);

    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);
    const nativeFee = (
      await remoteOFT.estimateSendFee(localChainId, acc3AddressBytes32, amount, false, defaultAdapterParams)
    ).nativeFee;

    await expect(
      remoteOFT
        .connect(acc2)
        .sendFrom(
          acc2.address,
          localChainId,
          acc3AddressBytes32,
          amount,
          [acc2.address, ethers.constants.AddressZero, defaultAdapterParams],
          { value: nativeFee },
        ),
    ).not.to.emit(remoteOFT, "ReceiveFromChain");
  });
  it("Reverts initially and succeed on retry on destination", async () => {
    let data = remoteOFT.interface.encodeFunctionData("setMaxSingleReceiveTransactionLimit", [
      localChainId,
      convertToUnit(9, 18),
    ]);
    await acc1.sendTransaction({
      to: bridgeAdminRemote.address,
      data: data,
    });

    await mintOnSrc(acc2, amount);

    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);

    const nativeFee = (
      await localOFT.estimateSendFee(remoteChainId, acc3AddressBytes32, amount, false, defaultAdapterParams)
    ).nativeFee;

    await localOFT
      .connect(acc2)
      .sendFrom(
        acc2.address,
        remoteChainId,
        acc3AddressBytes32,
        amount,
        [acc2.address, ethers.constants.AddressZero, defaultAdapterParams],
        { value: nativeFee },
      );
    expect(await remoteToken.balanceOf(acc3.address)).not.to.be.equal(amount);
    data = remoteOFT.interface.encodeFunctionData("setMaxSingleReceiveTransactionLimit", [
      localChainId,
      singleTransactionLimit,
    ]);
    await acc1.sendTransaction({
      to: bridgeAdminRemote.address,
      data: data,
    });
    const ld2sdAmount = convertToUnit(10, 8);
    const ptSend = await localOFT.PT_SEND();
    const payload = await ethers.utils.solidityPack(
      ["uint8", "bytes", "uint64"],
      [ptSend, acc3AddressBytes32, ld2sdAmount],
    );

    await expect(remoteOFT.retryMessage(localChainId, localPath, 1, payload)).to.emit(remoteOFT, "RetryMessageSuccess");
    expect(await remoteToken.balanceOf(acc3.address)).to.be.equal(amount);
  });

  it("Reverts initialy and should fail on retry if trusted remote is removed on destination", async function () {
    await mintOnSrc(acc2, amount);

    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);

    const nativeFee = (
      await localOFT.estimateSendFee(remoteChainId, acc3AddressBytes32, amount, false, defaultAdapterParams)
    ).nativeFee;

    // Blocking next message
    await remoteEndpoint.blockNextMsg();

    await localOFT
      .connect(acc2)
      .sendFrom(
        acc2.address,
        remoteChainId,
        acc3AddressBytes32,
        amount,
        [acc2.address, ethers.constants.AddressZero, defaultAdapterParams],
        { value: nativeFee },
      );

    expect(await remoteToken.balanceOf(acc3.address)).not.to.be.equal(amount);

    const data = remoteOFT.interface.encodeFunctionData("removeTrustedRemote", [localChainId]);
    await acc1.sendTransaction({
      to: bridgeAdminRemote.address,
      data: data,
    });

    const ld2sdAmount = convertToUnit(10, 8);
    const ptSend = await localOFT.PT_SEND();
    const payload = await ethers.utils.solidityPack(
      ["uint8", "bytes", "uint64"],
      [ptSend, acc3AddressBytes32, ld2sdAmount],
    );
    await expect(remoteEndpoint.retryPayload(localChainId, localPath, payload)).to.be.revertedWith(
      "LzApp: invalid source sending contract",
    );
  });

  it("Reverts initially and succeed on retry on source", async () => {
    let data = localOFT.interface.encodeFunctionData("setMaxSingleReceiveTransactionLimit", [
      remoteChainId,
      convertToUnit(9, 18),
    ]);
    await acc1.sendTransaction({
      to: bridgeAdminLocal.address,
      data: data,
    });

    await mintOnDest(acc2, amount);

    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);

    const nativeFee = (
      await remoteOFT.estimateSendFee(localChainId, acc3AddressBytes32, amount, false, defaultAdapterParams)
    ).nativeFee;

    await remoteOFT
      .connect(acc2)
      .sendFrom(
        acc2.address,
        localChainId,
        acc3AddressBytes32,
        amount,
        [acc2.address, ethers.constants.AddressZero, defaultAdapterParams],
        { value: nativeFee },
      );
    expect(await localToken.balanceOf(acc3.address)).not.to.be.equal(amount);
    data = localOFT.interface.encodeFunctionData("setMaxSingleReceiveTransactionLimit", [
      remoteChainId,
      singleTransactionLimit,
    ]);
    await acc1.sendTransaction({
      to: bridgeAdminLocal.address,
      data: data,
    });
    const ld2sdAmount = convertToUnit(10, 8);
    const ptSend = await remoteOFT.PT_SEND();
    const payload = await ethers.utils.solidityPack(
      ["uint8", "bytes", "uint64"],
      [ptSend, acc3AddressBytes32, ld2sdAmount],
    );

    await expect(localOFT.retryMessage(remoteChainId, remotePath, 1, payload)).to.emit(localOFT, "RetryMessageSuccess");
    expect(await localToken.balanceOf(acc3.address)).to.be.equal(amount);
  });

  it("Reverts initialy and should fail on retry if trusted remote is removed on source", async function () {
    await mintOnDest(acc2, amount);

    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);

    const nativeFee = (
      await remoteOFT.estimateSendFee(localChainId, acc3AddressBytes32, amount, false, defaultAdapterParams)
    ).nativeFee;

    // Blocking next message
    await localEndpoint.blockNextMsg();

    await remoteOFT
      .connect(acc2)
      .sendFrom(
        acc2.address,
        localChainId,
        acc3AddressBytes32,
        amount,
        [acc2.address, ethers.constants.AddressZero, defaultAdapterParams],
        { value: nativeFee },
      );

    expect(await localToken.balanceOf(acc3.address)).not.to.be.equal(amount);

    const data = localOFT.interface.encodeFunctionData("removeTrustedRemote", [remoteChainId]);
    await acc1.sendTransaction({
      to: bridgeAdminLocal.address,
      data: data,
    });

    const ld2sdAmount = convertToUnit(10, 8);
    const ptSend = await remoteOFT.PT_SEND();
    const payload = await ethers.utils.solidityPack(
      ["uint8", "bytes", "uint64"],
      [ptSend, acc3AddressBytes32, ld2sdAmount],
    );
    await expect(localEndpoint.retryPayload(remoteChainId, remotePath, payload)).to.be.revertedWith(
      "LzApp: invalid source sending contract",
    );
  });

  it("Reverts when zero chain id provided in set trusted remote on source", async function () {
    await expect(bridgeAdminLocal.setTrustedRemoteAddress(0, localOFT.address)).to.be.revertedWith(
      "ChainId must not be zero",
    );
  });
  it("Reverts when zero chain id provided in set trusted remote on destination", async function () {
    await expect(bridgeAdminRemote.setTrustedRemoteAddress(0, remoteOFT.address)).to.be.revertedWith(
      "ChainId must not be zero",
    );
  });

  it("Drops failed message on source", async function () {
    await mintOnDest(acc3, amount);
    const acc2AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc2.address]);
    const nativeFee = (
      await remoteOFT.estimateSendFee(localChainId, acc2AddressBytes32, amount, false, defaultAdapterParams)
    ).nativeFee;
    let data = localOFT.interface.encodeFunctionData("pause");
    await acc1.sendTransaction({
      to: bridgeAdminLocal.address,
      data: data,
    });
    await remoteOFT
      .connect(acc3)
      .sendFrom(
        acc3.address,
        localChainId,
        acc2AddressBytes32,
        amount,
        [acc3.address, ethers.constants.AddressZero, defaultAdapterParams],
        { value: nativeFee },
      );
    expect(await localOFT.failedMessages(remoteChainId, remotePath, 1)).to.not.equals(ethers.constants.HashZero);
    data = localOFT.interface.encodeFunctionData("dropFailedMessage", [remoteChainId, remotePath, 1]);
    await acc1.sendTransaction({
      to: bridgeAdminLocal.address,
      data: data,
    });

    expect(await localOFT.failedMessages(remoteChainId, remotePath, 1)).to.equals(ethers.constants.HashZero);
  });

  it("Drops failed message on destination", async function () {
    await mintOnSrc(acc3, amount);
    const acc2AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc2.address]);
    const nativeFee = (
      await localOFT.estimateSendFee(remoteChainId, acc2AddressBytes32, amount, false, defaultAdapterParams)
    ).nativeFee;
    let data = remoteOFT.interface.encodeFunctionData("pause");
    await acc1.sendTransaction({
      to: bridgeAdminRemote.address,
      data: data,
    });
    await localOFT
      .connect(acc3)
      .sendFrom(
        acc3.address,
        remoteChainId,
        acc2AddressBytes32,
        amount,
        [acc3.address, ethers.constants.AddressZero, defaultAdapterParams],
        { value: nativeFee },
      );
    expect(await remoteOFT.failedMessages(localChainId, localPath, 1)).to.not.equals(ethers.constants.HashZero);
    data = remoteOFT.interface.encodeFunctionData("dropFailedMessage", [localChainId, localPath, 1]);
    await acc1.sendTransaction({
      to: bridgeAdminRemote.address,
      data: data,
    });
    expect(await remoteOFT.failedMessages(localChainId, localPath, 1)).to.equals(ethers.constants.HashZero);
  });
  it("Reverts transfer of remote token to blacklist address", async function () {
    await mintOnSrc(acc2, amount);

    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);
    const nativeFee = (
      await localOFT.estimateSendFee(remoteChainId, acc3AddressBytes32, amount, false, defaultAdapterParams)
    ).nativeFee;

    await expect(
      localOFT
        .connect(acc2)
        .sendFrom(
          acc2.address,
          remoteChainId,
          acc3AddressBytes32,
          amount,
          [acc2.address, ethers.constants.AddressZero, defaultAdapterParams],
          { value: nativeFee },
        ),
    ).to.emit(remoteOFT, "ReceiveFromChain");
    await remoteToken.updateBlacklist(acc3.address, true);
    await expect(remoteToken.connect(acc2).transfer(acc3.address, amount)).to.be.revertedWithCustomError(
      remoteToken,
      "AccountBlacklisted",
    );
  });
  it("Reverts transfer of local token to blacklist address", async function () {
    await mintOnDest(acc2, amount);
    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);
    const nativeFee = (
      await remoteOFT.estimateSendFee(localChainId, acc3AddressBytes32, amount, false, defaultAdapterParams)
    ).nativeFee;

    await tokenBridgeController.updateBlacklist(acc3.address, true);
    await expect(
      remoteOFT
        .connect(acc2)
        .sendFrom(
          acc2.address,
          localChainId,
          acc3AddressBytes32,
          amount,
          [acc2.address, ethers.constants.AddressZero, defaultAdapterParams],
          { value: nativeFee },
        ),
    ).not.to.emit(localOFT, "ReceiveFromChain");
  });
  it("Reverts on local chain if minting permission is not granted to localOFT", async () => {
    await mintOnSrc(acc2, amount);
    accessControlManager.isAllowedToCall.returns(false);
    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);

    const nativeFee = (
      await localOFT.estimateSendFee(remoteChainId, acc3AddressBytes32, amount, false, defaultAdapterParams)
    ).nativeFee;

    await expect(
      localOFT
        .connect(acc2)
        .sendFrom(
          acc2.address,
          remoteChainId,
          acc3AddressBytes32,
          amount,
          [acc2.address, ethers.constants.AddressZero, defaultAdapterParams],
          { value: nativeFee },
        ),
    ).to.be.reverted;
    accessControlManager.isAllowedToCall.returns(true);
  });

  it("Reverts on remote chain if minting permission is not granted to remoteOFT", async () => {
    await mintOnDest(acc2, amount);
    accessControlManager.isAllowedToCall.returns(false);
    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);

    const nativeFee = (
      await remoteOFT.estimateSendFee(localChainId, acc3AddressBytes32, amount, false, defaultAdapterParams)
    ).nativeFee;

    await expect(
      remoteOFT
        .connect(acc2)
        .sendFrom(
          acc2.address,
          localChainId,
          acc3AddressBytes32,
          amount,
          [acc2.address, ethers.constants.AddressZero, defaultAdapterParams],
          { value: nativeFee },
        ),
    ).to.be.reverted;
    accessControlManager.isAllowedToCall.returns(true);
  });

  it("Reset limit if 24hour window passed on source", async function () {
    const mintAmount = ethers.utils.parseEther("110", 18);
    const amount = ethers.utils.parseEther("10", 18);
    await mintOnSrc(acc2, mintAmount);

    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);
    const nativeFee = (
      await localOFT.estimateSendFee(remoteChainId, acc3AddressBytes32, amount, false, defaultAdapterParams)
    ).nativeFee;

    // After 10 transaction it should fail as limit of max daily transaction is 100 USD and price per full token in USD is 1
    for (let i = 0; i < 10; i++) {
      await localOFT
        .connect(acc2)
        .sendFrom(
          acc2.address,
          remoteChainId,
          acc3AddressBytes32,
          amount,
          [acc2.address, ethers.constants.AddressZero, defaultAdapterParams],
          { value: nativeFee },
        );
    }

    // Limit reached
    expect(await localOFT.chainIdToLast24HourTransferred(remoteChainId)).equals(maxDailyTransactionLimit);

    await expect(
      localOFT
        .connect(acc2)
        .sendFrom(
          acc2.address,
          remoteChainId,
          acc3AddressBytes32,
          amount,
          [acc2.address, ethers.constants.AddressZero, defaultAdapterParams],
          { value: nativeFee },
        ),
    ).to.be.revertedWith("Daily Transaction Limit Exceed");

    await time.increase(86400);

    await expect(
      localOFT
        .connect(acc2)
        .sendFrom(
          acc2.address,
          remoteChainId,
          acc3AddressBytes32,
          amount,
          [acc2.address, ethers.constants.AddressZero, defaultAdapterParams],
          { value: nativeFee },
        ),
    )
      .to.emit(remoteOFT, "ReceiveFromChain")
      .withArgs(localChainId, acc3.address, amount);
  });

  it("Reset limit if 24hour window passed on destination", async function () {
    const mintAmount = ethers.utils.parseEther("110", 18);
    const amount = ethers.utils.parseEther("10", 18);
    await mintOnDest(acc2, mintAmount);

    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);
    const nativeFee = (
      await remoteOFT.estimateSendFee(localChainId, acc3AddressBytes32, amount, false, defaultAdapterParams)
    ).nativeFee;

    // After 10 transaction it should fail as limit of max daily transaction is 100 USD and price per full token in USD is 1
    for (let i = 0; i < 10; i++) {
      await remoteOFT
        .connect(acc2)
        .sendFrom(
          acc2.address,
          localChainId,
          acc3AddressBytes32,
          amount,
          [acc2.address, ethers.constants.AddressZero, defaultAdapterParams],
          { value: nativeFee },
        );
    }

    // Limit reached
    expect(await remoteOFT.chainIdToLast24HourTransferred(localChainId)).equals(maxDailyTransactionLimit);

    await expect(
      remoteOFT
        .connect(acc2)
        .sendFrom(
          acc2.address,
          localChainId,
          acc3AddressBytes32,
          amount,
          [acc2.address, ethers.constants.AddressZero, defaultAdapterParams],
          { value: nativeFee },
        ),
    ).to.be.revertedWith("Daily Transaction Limit Exceed");
    await time.increase(86400);

    await expect(
      remoteOFT
        .connect(acc2)
        .sendFrom(
          acc2.address,
          localChainId,
          acc3AddressBytes32,
          amount,
          [acc2.address, ethers.constants.AddressZero, defaultAdapterParams],
          { value: nativeFee },
        ),
    )
      .to.emit(localOFT, "ReceiveFromChain")
      .withArgs(remoteChainId, acc3.address, amount);
  });
  it("Reverts when amount is too large", async function () {
    const amount = ethers.utils.parseEther(Number.MAX_SAFE_INTEGER.toString(), 18);
    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);
    await expect(
      localOFT.estimateSendFee(remoteChainId, acc3AddressBytes32, amount, false, defaultAdapterParams),
    ).to.be.revertedWith("OFTCore: amountSD overflow");
  });
  it("Returns correct limits and eligibility of user initially", async function () {
    const {
      eligibleToSend,
      maxSingleTransactionLimit,
      maxDailyLimit,
      amountInUsd,
      transferredInWindow,
      last24HourWindowStart,
      isWhiteListedUser,
    } = await localOFT.connect(acc1).isEligibleToSend(acc2.address, remoteChainId, amount);
    expect(eligibleToSend).to.be.true;
    expect(await localOFT.chainIdToMaxSingleTransactionLimit(remoteChainId)).to.be.equals(maxSingleTransactionLimit);
    expect(await localOFT.chainIdToMaxDailyLimit(remoteChainId)).to.be.equals(maxDailyLimit);
    const oraclePrice = await oracle.getPrice(await localOFT.token());
    const expectedAmount = BigInt((oraclePrice * amount) / 1e18);
    expect(expectedAmount).to.be.equals(amountInUsd);
    expect((await localOFT.chainIdToLast24HourTransferred(remoteChainId)).add(amountInUsd)).to.be.equals(
      transferredInWindow,
    );
    const currentTimestamp = (await ethers.provider.getBlock("latest")).timestamp;
    expect((await localOFT.chainIdToLast24HourWindowStart(remoteChainId)).add(currentTimestamp)).to.be.equals(
      last24HourWindowStart,
    );
    expect(await localOFT.whitelist(acc2.address)).to.be.equals(isWhiteListedUser);
  });
  it("Returns updated value of limits and eligibility of user", async function () {
    const data = localOFT.interface.encodeFunctionData("setMaxSingleTransactionLimit", [
      remoteChainId,
      singleTransactionLimit,
    ]);
    await acc1.sendTransaction({
      to: bridgeAdminLocal.address,
      data: data,
    });
    const amount = ethers.utils.parseEther("1", 18);
    await mintOnSrc(acc2, amount);
    expect(await localToken.balanceOf(acc2.address)).to.be.equal(amount);
    expect(await remoteToken.balanceOf(acc3.address)).to.be.equal(0);
    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);
    const nativeFee = (
      await localOFT.estimateSendFee(remoteChainId, acc3AddressBytes32, amount, false, defaultAdapterParams)
    ).nativeFee;

    await localOFT
      .connect(acc2)
      .sendFrom(
        acc2.address,
        remoteChainId,
        acc3AddressBytes32,
        amount,
        [acc2.address, ethers.constants.AddressZero, defaultAdapterParams],
        { value: nativeFee },
      );

    const {
      eligibleToSend,
      maxSingleTransactionLimit,
      maxDailyLimit,
      amountInUsd,
      transferredInWindow,
      last24HourWindowStart,
      isWhiteListedUser,
    } = await localOFT.connect(acc1).isEligibleToSend(acc2.address, remoteChainId, amount);

    expect(eligibleToSend).to.be.true;
    expect(await localOFT.chainIdToMaxSingleTransactionLimit(remoteChainId)).to.be.equals(maxSingleTransactionLimit);
    expect(await localOFT.chainIdToMaxDailyLimit(remoteChainId)).to.be.equals(maxDailyLimit);
    const oraclePrice = await oracle.getPrice(await localOFT.token());
    const expectedAmount = BigInt((oraclePrice * amount) / 1e18);
    expect(expectedAmount).to.be.equals(amountInUsd);
    expect((await localOFT.chainIdToLast24HourTransferred(remoteChainId)).add(amountInUsd)).to.be.equals(
      transferredInWindow,
    );
    expect(await localOFT.chainIdToLast24HourWindowStart(remoteChainId)).to.be.equals(last24HourWindowStart);
    expect(await localOFT.whitelist(acc2.address)).to.be.equals(isWhiteListedUser);
  });
  it("Reverts when sendAndCall is disabled on source", async function () {
    const dstGasForCall = 0;
    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);

    await expect(
      localOFT
        .connect(acc1)
        .sendAndCall(acc3.address, remoteChainId, acc3AddressBytes32, amount, "0x", dstGasForCall, [
          acc1.address,
          ethers.constants.AddressZero,
          "0x",
        ]),
    ).to.be.revertedWith("sendAndCall is disabled");
  });
  it("Reverts when sendAndCall is disabled on destination", async function () {
    const dstGasForCall = 0;
    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);

    await expect(
      remoteOFT
        .connect(acc1)
        .sendAndCall(acc3.address, localChainId, acc3AddressBytes32, amount, "0x", dstGasForCall, [
          acc1.address,
          ethers.constants.AddressZero,
          "0x",
        ]),
    ).to.be.revertedWith("sendAndCall is disabled");
  });
  it("Successfully call sendAndCall on source", async function () {
    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);

    let data = localOFT.interface.encodeFunctionData("setMinDstGas", [remoteChainId, 1, 300000]);
    const amount = ethers.utils.parseEther("2", 18);
    const dstGasForCall_ = 0;
    await acc1.sendTransaction({
      to: bridgeAdminLocal.address,
      data: data,
    });

    await acc1.sendTransaction({
      to: bridgeAdminLocal.address,
      data: data,
    });
    data = localOFT.interface.encodeFunctionData("updateSendAndCallEnabled", [true]);
    await acc1.sendTransaction({
      to: bridgeAdminLocal.address,
      data: data,
    });

    const adapterParams = ethers.utils.solidityPack(["uint16", "uint256"], [1, 300000]);
    await localToken.connect(acc1).faucet(amount);
    await localToken.connect(acc1).approve(localOFT.address, amount);
    expect(await localOFT.sendAndCallEnabled()).to.be.true;

    const nativeFee = (await localOFT.estimateSendFee(remoteChainId, acc3AddressBytes32, amount, false, adapterParams))
      .nativeFee;

    await localOFT
      .connect(acc1)
      .sendAndCall(
        acc1.address,
        remoteChainId,
        acc3AddressBytes32,
        amount,
        "0x",
        dstGasForCall_,
        [acc1.address, acc1.address, adapterParams],
        { value: nativeFee },
      );
  });
  it("Successfully call sendAndCall on destination", async function () {
    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);

    let data = remoteOFT.interface.encodeFunctionData("setMinDstGas", [localChainId, 1, 200000]);
    const dstGasForCall_ = 0;
    await acc1.sendTransaction({
      to: bridgeAdminRemote.address,
      data: data,
    });
    data = remoteOFT.interface.encodeFunctionData("updateSendAndCallEnabled", [true]);
    await acc1.sendTransaction({
      to: bridgeAdminRemote.address,
      data: data,
    });

    await mintOnDest(acc1, amount);
    expect(await remoteOFT.sendAndCallEnabled()).to.be.true;

    const nativeFee = (
      await remoteOFT.estimateSendFee(localChainId, acc3AddressBytes32, amount, false, defaultAdapterParams)
    ).nativeFee;

    await remoteOFT
      .connect(acc1)
      .sendAndCall(
        acc1.address,
        localChainId,
        acc3AddressBytes32,
        amount,
        "0x",
        dstGasForCall_,
        [acc1.address, acc1.address, defaultAdapterParams],
        { value: nativeFee },
      );
  });
  it("Sweeps token back to the user on source chain", async function () {
    await mintOnSrc(acc1, amount);
    await localToken.connect(acc1).transfer(localOFT.address, amount);
    const data = localOFT.interface.encodeFunctionData("sweepToken", [localToken.address, acc1.address, amount]);
    await expect(
      acc1.sendTransaction({
        to: bridgeAdminLocal.address,
        data: data,
      }),
    ).to.emit(localOFT, "SweepToken");
  });
  it("Sweeps token back to the user on destination chain", async function () {
    await mintOnDest(acc1, amount);
    await remoteToken.connect(acc1).transfer(remoteOFT.address, amount);
    const data = remoteOFT.interface.encodeFunctionData("sweepToken", [remoteToken.address, acc1.address, amount]);
    await expect(
      acc1.sendTransaction({
        to: bridgeAdminRemote.address,
        data: data,
      }),
    ).to.emit(remoteOFT, "SweepToken");
  });

  it("Reverts when amount exceeds balance on source chain", async function () {
    const sweepAmount = ethers.utils.parseEther("11", 18);
    await localToken.connect(acc1).faucet(amount);
    await localToken.connect(acc1).transfer(localOFT.address, amount);
    const data = localOFT.interface.encodeFunctionData("sweepToken", [localToken.address, acc1.address, sweepAmount]);
    await expect(
      acc1.sendTransaction({
        to: bridgeAdminLocal.address,
        data: data,
      }),
    ).to.be.reverted;
  });
  it("Reverts when token balance of source bridge is 0", async function () {
    const data = localOFT.interface.encodeFunctionData("sweepToken", [remoteToken.address, acc1.address, amount]);
    await expect(
      acc1.sendTransaction({
        to: bridgeAdminLocal.address,
        data: data,
      }),
    ).to.be.reverted;
  });
  it("Reverts when token balance of destination bridge is 0", async function () {
    const data = remoteOFT.interface.encodeFunctionData("sweepToken", [localToken.address, acc1.address, amount]);
    await expect(
      acc1.sendTransaction({
        to: bridgeAdminRemote.address,
        data: data,
      }),
    ).to.be.reverted;
  });
  it("Sets whitelisted user on source", async function () {
    const data = localOFT.interface.encodeFunctionData("setWhitelist", [acc1.address, true]);
    await expect(
      acc1.sendTransaction({
        to: bridgeAdminLocal.address,
        data: data,
      }),
    ).to.emit(localOFT, "SetWhitelist");
  });
  it("Sets whitelisted user on destination", async function () {
    const data = remoteOFT.interface.encodeFunctionData("setWhitelist", [acc1.address, true]);
    await expect(
      acc1.sendTransaction({
        to: bridgeAdminRemote.address,
        data: data,
      }),
    ).to.emit(remoteOFT, "SetWhitelist");
  });
  it("Reverts on zero address otherwise sets oracle on source", async function () {
    let data = localOFT.interface.encodeFunctionData("setOracle", [ethers.constants.AddressZero]);
    await expect(
      acc1.sendTransaction({
        to: bridgeAdminRemote.address,
        data: data,
      }),
    ).to.be.reverted;
    const oracleNew = await smock.fake<ResilientOracleInterface>("ResilientOracleInterface");
    data = localOFT.interface.encodeFunctionData("setOracle", [oracleNew.address]);
    await expect(
      acc1.sendTransaction({
        to: bridgeAdminRemote.address,
        data: data,
      }),
    ).to.emit(remoteOFT, "OracleChanged");
  });
  it("Reverts on zero address otherwise sets oracle on destination", async function () {
    let data = remoteOFT.interface.encodeFunctionData("setOracle", [ethers.constants.AddressZero]);
    await expect(
      acc1.sendTransaction({
        to: bridgeAdminLocal.address,
        data: data,
      }),
    ).to.be.reverted;
    const oracleNew = await smock.fake<ResilientOracleInterface>("ResilientOracleInterface");
    data = remoteOFT.interface.encodeFunctionData("setOracle", [oracleNew.address]);
    await expect(
      acc1.sendTransaction({
        to: bridgeAdminLocal.address,
        data: data,
      }),
    ).to.emit(localOFT, "OracleChanged");
  });
  it("White listed user can bypass 24 hour window limit", async () => {
    let data = localOFT.interface.encodeFunctionData("setWhitelist", [acc2.address, true]);
    await acc1.sendTransaction({ to: bridgeAdminLocal.address, data: data });
    const amount = convertToUnit(100, 18);
    await mintOnSrc(acc2, amount);
    const acc2AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc2.address]);
    // Calculating gas fee to transfer tokens
    const nativeFee = (
      await localOFT.estimateSendFee(remoteChainId, acc2AddressBytes32, amount, false, defaultAdapterParams)
    ).nativeFee;

    data = remoteOFT.interface.encodeFunctionData("setWhitelist", [acc2.address, true]);
    await acc1.sendTransaction({ to: bridgeAdminRemote.address, data: data });
    await localOFT
      .connect(acc2)
      .sendFrom(
        acc2.address,
        remoteChainId,
        acc2AddressBytes32,
        amount,
        [acc2.address, ethers.constants.AddressZero, defaultAdapterParams],
        { value: nativeFee },
      );

    expect(await remoteToken.balanceOf(acc2.address)).to.be.equal(amount);
  });
});

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
  MockToken,
  MockToken__factory,
  ResilientOracleInterface,
  XVS,
  XVSBridgeAdmin,
  XVSProxyOFTDest,
  XVSProxyOFTDest__factory,
  XVSProxyOFTSrc,
  XVSProxyOFTSrc__factory,
  XVS__factory,
} from "../typechain";

describe("Proxy OFTV2: ", function () {
  const localChainId = 1;
  const remoteChainId = 2;
  const name = "Venus XVS";
  const symbol = "XVS";
  const sharedDecimals = 8;
  const singleTransactionLimit = convertToUnit(10, 18);
  const maxDailyTransactionLimit = convertToUnit(100, 18);

  let LZEndpointMock: LZEndpointMock__factory,
    RemoteTokenFactory: XVS__factory,
    LocalTokenFactory: MockToken__factory,
    ProxyOFTV2Src: XVSProxyOFTSrc__factory,
    ProxyOFTV2Dest: XVSProxyOFTDest__factory,
    localEndpoint: LZEndpointMock,
    remoteEndpoint: LZEndpointMock,
    localOFT: XVSProxyOFTSrc,
    remoteOFT: XVSProxyOFTDest,
    localToken: MockToken,
    bridgeAdminRemote: XVSBridgeAdmin,
    bridgeAdminLocal: XVSBridgeAdmin,
    remoteToken: XVS,
    localPath: string,
    acc2: SignerWithAddress,
    acc3: SignerWithAddress,
    acc1: SignerWithAddress,
    accessControlManager: FakeContract<AccessControlManager>,
    oracle: FakeContract<ResilientOracleInterface>,
    defaultAdapterParams: any;
  const bridgeFixture = async () => {
    LZEndpointMock = await ethers.getContractFactory("LZEndpointMock");
    ProxyOFTV2Src = await ethers.getContractFactory("XVSProxyOFTSrc");
    ProxyOFTV2Dest = await ethers.getContractFactory("XVSProxyOFTDest");
    LocalTokenFactory = await ethers.getContractFactory("MockToken");
    accessControlManager = await smock.fake<AccessControlManager>("AccessControlManager");
    accessControlManager.isAllowedToCall.returns(true);
    RemoteTokenFactory = await ethers.getContractFactory("XVS");
    acc1 = (await ethers.getSigners())[0];
    acc2 = (await ethers.getSigners())[1];
    acc3 = (await ethers.getSigners())[2];
    oracle = await smock.fake<ResilientOracleInterface>("ResilientOracleInterface");
    oracle.getPrice.returns(convertToUnit(1, 18));
    defaultAdapterParams = ethers.utils.solidityPack(["uint16", "uint256"], [1, 200000]);

    localEndpoint = await LZEndpointMock.deploy(localChainId);
    remoteEndpoint = await LZEndpointMock.deploy(remoteChainId);

    // create two OmnichainFungibleToken instances
    localToken = await LocalTokenFactory.deploy(name, symbol, 18);
    remoteToken = await RemoteTokenFactory.deploy(accessControlManager.address);

    localOFT = await ProxyOFTV2Src.deploy(localToken.address, sharedDecimals, localEndpoint.address, oracle.address);
    remoteOFT = await ProxyOFTV2Dest.deploy(
      remoteToken.address,
      sharedDecimals,
      remoteEndpoint.address,
      oracle.address,
    );

    const bridgeAdminFactory = await ethers.getContractFactory("XVSBridgeAdmin");
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
    // internal bookkeeping for endpoints (not part of a real deploy, just for this test)
    await localEndpoint.setDestLzEndpoint(remoteOFT.address, remoteEndpoint.address);
    await remoteEndpoint.setDestLzEndpoint(localOFT.address, localEndpoint.address);

    // set each contracts source address so it can send to each other
    localPath = ethers.utils.solidityPack(["address", "address"], [localOFT.address, remoteOFT.address]);

    // Should revert admin of remoteOFT is BridgeAdmin contract
    await expect(remoteOFT.setTrustedRemote(localChainId, localPath)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );

    // Should revert if provided address is 0
    await expect(
      bridgeAdminLocal.setTrustedRemoteAddress(localChainId, ethers.constants.AddressZero),
    ).to.be.revertedWithCustomError(bridgeAdminLocal, "ZeroAddressNotAllowed");

    await remoteToken.setMintCap(remoteOFT.address, convertToUnit("100000", 18));

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
      "setUseCustomAdapterParams(bool)",
      "removeTrustedRemote(uint16)",
      "updateSendAndCallEnabled(bool)",
    ];
    const activeArray = new Array(functionregistry.length).fill(true);
    await bridgeAdminRemote.upsertSignature(functionregistry, activeArray);
    await bridgeAdminLocal.upsertSignature(functionregistry, activeArray);

    // Setting local chain
    await bridgeAdminLocal.setTrustedRemoteAddress(remoteChainId, remoteOFT.address);

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

  it("send tokens from proxy oft and receive them back", async function () {
    const initialAmount = ethers.utils.parseEther("1.0000000001", 18); // 1 ether
    const amount = ethers.utils.parseEther("1", 18);
    const dust = ethers.utils.parseEther("0.0000000001");
    await localToken.connect(acc2).faucet(initialAmount);
    // verify acc2 has tokens and acc3 has no tokens on remote chain
    expect(await localToken.balanceOf(acc2.address)).to.be.equal(initialAmount);
    expect(await remoteToken.balanceOf(acc3.address)).to.be.equal(0);
    // acc2 sends tokens to acc3 on remote chain
    // approve the proxy to swap your tokens
    await localToken.connect(acc2).approve(localOFT.address, initialAmount);
    // swaps token to remote chain
    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);
    let nativeFee = (
      await localOFT.estimateSendFee(remoteChainId, acc3AddressBytes32, initialAmount, false, defaultAdapterParams)
    ).nativeFee;

    await localOFT
      .connect(acc2)
      .sendFrom(
        acc2.address,
        remoteChainId,
        acc3AddressBytes32,
        initialAmount,
        [acc2.address, ethers.constants.AddressZero, defaultAdapterParams],
        { value: nativeFee },
      );

    // tokens are now owned by the proxy contract, because this is the original oft chain
    expect(await localToken.balanceOf(localOFT.address)).to.equal(amount);
    expect(await localOFT.circulatingSupply()).to.equal(amount.div(10 ** (18 - sharedDecimals)));
    expect(await localToken.balanceOf(acc2.address)).to.equal(dust);
    // tokens received on the remote chain
    expect(await remoteOFT.circulatingSupply()).to.equal(amount);
    expect(await remoteToken.balanceOf(acc3.address)).to.be.equal(amount);
    // acc3 send tokens back to acc2 from remote chain
    const acc2AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc2.address]);
    const halfAmount = amount.div(2);
    nativeFee = (
      await remoteOFT.estimateSendFee(localChainId, acc2AddressBytes32, halfAmount, false, defaultAdapterParams)
    ).nativeFee;

    await remoteOFT
      .connect(acc3)
      .sendFrom(
        acc3.address,
        localChainId,
        acc2AddressBytes32,
        halfAmount,
        [acc3.address, ethers.constants.AddressZero, defaultAdapterParams],
        { value: nativeFee },
      );
    // half tokens are burned on the remote chain
    expect(await remoteOFT.circulatingSupply()).to.equal(halfAmount);
    expect(await remoteToken.balanceOf(acc3.address)).to.be.equal(halfAmount);
    // tokens received on the local chain and unlocked from the proxy
    expect(await localToken.balanceOf(localOFT.address)).to.be.equal(halfAmount);
    expect(await localToken.balanceOf(acc2.address)).to.be.equal(halfAmount.add(dust));
  });

  it("Reverts if single transaction limit exceed", async function () {
    const amount = ethers.utils.parseEther("11", 18);
    await localToken.connect(acc2).faucet(amount);
    await localToken.connect(acc2).approve(localOFT.address, amount);

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
    ).to.be.revertedWith("Single Transaction Limit Exceed");
  });

  it("Reverts if single transaction limit exceed on remote chain", async function () {
    const data = remoteOFT.interface.encodeFunctionData("setMaxSingleReceiveTransactionLimit", [
      localChainId,
      convertToUnit(5, 18),
    ]);
    await acc1.sendTransaction({
      to: bridgeAdminRemote.address,
      data: data,
    });

    const amount = ethers.utils.parseEther("10", 18);
    await localToken.connect(acc2).faucet(amount);
    await localToken.connect(acc2).approve(localOFT.address, amount);

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

  it("Reverts if max daily transaction limit exceed", async function () {
    const initialAmount = ethers.utils.parseEther("110", 18);
    const amount = ethers.utils.parseEther("10", 18);
    await localToken.connect(acc2).faucet(initialAmount);
    await localToken.connect(acc2).approve(localOFT.address, initialAmount);

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
    expect(await localOFT.chainIdToLast24HourTransferred(remoteChainId)).equals(maxDailyTransactionLimit);
    expect(await remoteOFT.circulatingSupply()).equals(maxDailyTransactionLimit);
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
  });

  it("Reverts if max daily transaction limit exceed on remote chain", async function () {
    const remoteReceiveLimit = convertToUnit(90, 18);
    const data = remoteOFT.interface.encodeFunctionData("setMaxDailyReceiveLimit", [localChainId, remoteReceiveLimit]);
    await acc1.sendTransaction({
      to: bridgeAdminRemote.address,
      data: data,
    });

    const initialAmount = ethers.utils.parseEther("110", 18);
    const amount = ethers.utils.parseEther("10", 18);
    await localToken.connect(acc2).faucet(initialAmount);
    await localToken.connect(acc2).approve(localOFT.address, initialAmount);

    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);
    const nativeFee = (
      await localOFT.estimateSendFee(remoteChainId, acc3AddressBytes32, amount, false, defaultAdapterParams)
    ).nativeFee;

    // After 10 transaction it should fail as limit of max daily transaction is 100 USD and price per full token in USD is 1
    for (let i = 0; i < 9; i++) {
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
    expect(await localOFT.chainIdToLast24HourTransferred(remoteChainId)).equals(maxDailyTransactionLimit);
    expect(await remoteOFT.circulatingSupply()).equals(remoteReceiveLimit);
  });

  it("Reset limit if 24hour window passed", async function () {
    const initialAmount = ethers.utils.parseEther("110", 18);
    const amount = ethers.utils.parseEther("10", 18);
    await localToken.connect(acc2).faucet(initialAmount);
    await localToken.connect(acc2).approve(localOFT.address, initialAmount);

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
      .to.be.emit(remoteOFT, "ReceiveFromChain")
      .withArgs(localChainId, acc3.address, amount);
  });

  it("Reverts on remote chain if minting permission is not granted to remoteOFT", async function () {
    accessControlManager.isAllowedToCall.returns(false);
    expect(await remoteEndpoint.inboundNonce(localChainId, localPath)).lessThanOrEqual(0);
    const amount = ethers.utils.parseEther("10", 18);
    await localToken.connect(acc2).faucet(amount);
    await localToken.connect(acc2).approve(localOFT.address, amount);

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

    // Msg should reach remote chain
    expect(await remoteEndpoint.inboundNonce(localChainId, localPath)).equals(1);
    accessControlManager.isAllowedToCall.returns(true);
  });

  it("Reverts transfer of remote token to blacklist address", async function () {
    const amount = ethers.utils.parseEther("10", 18);
    await localToken.connect(acc2).faucet(amount);
    await localToken.connect(acc2).approve(localOFT.address, amount);

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

  it("Reverts if try to set cap less than already minted tokens", async function () {
    const initialAmount = ethers.utils.parseEther("20", 18);
    await localToken.connect(acc2).faucet(initialAmount);
    await localToken.connect(acc2).approve(localOFT.address, initialAmount);
    const amount = ethers.utils.parseEther("10", 18);
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
      ),
      // Msg should reach remote chain
      expect(await remoteEndpoint.inboundNonce(localChainId, localPath)).equals(1);
    await expect(
      remoteToken.connect(acc1).setMintCap(remoteOFT.address, convertToUnit(1, 18)),
    ).to.be.revertedWithCustomError(remoteToken, "NewCapNotGreaterThanMintedTokens");
  });

  it("Reverts on remote chain if minting cap is reached", async function () {
    await remoteToken.connect(acc1).setMintCap(remoteOFT.address, convertToUnit(10, 18));
    expect(await remoteEndpoint.inboundNonce(localChainId, localPath)).lessThanOrEqual(0);
    const initialAmount = ethers.utils.parseEther("20", 18);
    const amount = ethers.utils.parseEther("10", 18);
    await localToken.connect(acc2).faucet(initialAmount);
    await localToken.connect(acc2).approve(localOFT.address, initialAmount);

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
      ),
      // Msg should reach remote chain
      expect(await remoteEndpoint.inboundNonce(localChainId, localPath)).equals(1);

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

    // Msg should reach remote chain
    expect(await remoteEndpoint.inboundNonce(localChainId, localPath)).equals(2);
  });

  it("Reverts initialy and should success on retry", async function () {
    const initialAmount = ethers.utils.parseEther("20", 18);
    const amount = ethers.utils.parseEther("10", 18);
    await localToken.connect(acc2).faucet(initialAmount);
    await localToken.connect(acc2).approve(localOFT.address, initialAmount);

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
    expect(await remoteEndpoint.hasStoredPayload(localChainId, localPath)).equals(true);
    // Initial state
    expect(await remoteOFT.circulatingSupply()).to.equal(0);
    expect(await remoteToken.balanceOf(acc3.address)).to.be.equal(0);

    const ld2sdAmount = convertToUnit(10, 8);
    const ptSend = await localOFT.PT_SEND();
    const payload = await ethers.utils.solidityPack(
      ["uint8", "bytes", "uint64"],
      [ptSend, acc3AddressBytes32, ld2sdAmount],
    );
    await remoteEndpoint.retryPayload(localChainId, localPath, payload);

    // tokens received on the remote chain
    expect(await remoteOFT.circulatingSupply()).to.equal(amount);
    expect(await remoteToken.balanceOf(acc3.address)).to.be.equal(amount);
  });

  it("Reverts initialy and should fail on retry if trusted remote changed", async function () {
    const initialAmount = ethers.utils.parseEther("20", 18);
    const amount = ethers.utils.parseEther("10", 18);
    await localToken.connect(acc2).faucet(initialAmount);
    await localToken.connect(acc2).approve(localOFT.address, initialAmount);

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
    expect(await remoteEndpoint.hasStoredPayload(localChainId, localPath)).equals(true);
    // Initial state
    expect(await remoteOFT.circulatingSupply()).to.equal(0);
    expect(await remoteToken.balanceOf(acc3.address)).to.be.equal(0);

    await bridgeAdminRemote.setTrustedRemoteAddress(localChainId, remoteOFT.address);

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

  it("Reverts on remote chain if bridge is paused", async function () {
    const data = remoteOFT.interface.encodeFunctionData("pause");
    await acc1.sendTransaction({
      to: bridgeAdminRemote.address,
      data: data,
    });

    const amount = ethers.utils.parseEther("10", 18);
    await localToken.connect(acc2).faucet(amount);
    await localToken.connect(acc2).approve(localOFT.address, amount);

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

  it("Reverts on remote chain if xvs token is paused", async function () {
    await remoteToken.pause();

    const amount = ethers.utils.parseEther("10", 18);
    await localToken.connect(acc2).faucet(amount);
    await localToken.connect(acc2).approve(localOFT.address, amount);

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

  it("Reverts if amount is too small", async function () {
    const amount = ethers.utils.parseEther("0.00000000001", 18);
    await localToken.connect(acc2).faucet(amount);
    await localToken.connect(acc2).approve(localOFT.address, amount);

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
  it("Successs on removal of trusted remote", async function () {
    const data = localOFT.interface.encodeFunctionData("removeTrustedRemote", [remoteChainId]);
    await acc1.sendTransaction({
      to: bridgeAdminLocal.address,
      data: data,
    });
    expect(await localOFT.trustedRemoteLookup(remoteChainId)).equals("0x");
  });
  it("Returns correct limits and eligibility of user initially", async function () {
    const amount = ethers.utils.parseEther("10", 18);
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

  it("Returns upadted value of limits and eligibility of user", async function () {
    const data = localOFT.interface.encodeFunctionData("setMaxSingleTransactionLimit", [
      remoteChainId,
      singleTransactionLimit,
    ]);
    await acc1.sendTransaction({
      to: bridgeAdminLocal.address,
      data: data,
    });

    const initialAmount = ethers.utils.parseEther("1", 18);
    await localToken.connect(acc2).faucet(initialAmount);
    expect(await localToken.balanceOf(acc2.address)).to.be.equal(initialAmount);
    expect(await remoteToken.balanceOf(acc3.address)).to.be.equal(0);
    await localToken.connect(acc2).approve(localOFT.address, initialAmount);
    const acc3AddressBytes32 = ethers.utils.defaultAbiCoder.encode(["address"], [acc3.address]);
    const nativeFee = (
      await localOFT.estimateSendFee(remoteChainId, acc3AddressBytes32, initialAmount, false, defaultAdapterParams)
    ).nativeFee;

    await localOFT
      .connect(acc2)
      .sendFrom(
        acc2.address,
        remoteChainId,
        acc3AddressBytes32,
        initialAmount,
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
    } = await localOFT.connect(acc1).isEligibleToSend(acc2.address, remoteChainId, initialAmount);

    expect(eligibleToSend).to.be.true;
    expect(await localOFT.chainIdToMaxSingleTransactionLimit(remoteChainId)).to.be.equals(maxSingleTransactionLimit);
    expect(await localOFT.chainIdToMaxDailyLimit(remoteChainId)).to.be.equals(maxDailyLimit);
    const oraclePrice = await oracle.getPrice(await localOFT.token());
    const expectedAmount = BigInt((oraclePrice * initialAmount) / 1e18);
    expect(expectedAmount).to.be.equals(amountInUsd);
    expect((await localOFT.chainIdToLast24HourTransferred(remoteChainId)).add(amountInUsd)).to.be.equals(
      transferredInWindow,
    );
    expect(await localOFT.chainIdToLast24HourWindowStart(remoteChainId)).to.be.equals(last24HourWindowStart);
    expect(await localOFT.whitelist(acc2.address)).to.be.equals(isWhiteListedUser);
  });
  it("Reverts when sendAndCall is disabled", async function () {
    const amount = ethers.utils.parseEther("2", 18);
    const dstGasForCall_ = 0;
    const uint160Value = BigInt("0x" + acc3.address.slice(2));
    const bytes32Value = uint160Value << BigInt(96);
    const acc3AddressBytes32 = "0x" + bytes32Value.toString(16).padStart(32, "0");

    await expect(
      localOFT
        .connect(acc1)
        .sendAndCall(acc3.address, remoteChainId, acc3AddressBytes32, amount, "0x", dstGasForCall_, [
          acc1.address,
          acc1.address,
          "0x",
        ]),
    ).to.be.revertedWith("sendAndCall is disabled");
  });

  it("Successfully call sendAndCall", async function () {
    const uint160Value = BigInt("0x" + acc3.address.slice(2));
    const bytes32Value = uint160Value << BigInt(96);
    const acc3AddressBytes32 = "0x" + bytes32Value.toString(16).padStart(32, "0");
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
});

import { FakeContract, smock } from "@defi-wonderland/smock";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";

import { AccessControlManager, MultichainToken, MultichainToken__factory } from "../typechain";

describe("Multichain Token Controller: ", function () {
  let tokenFactory: MultichainToken__factory,
    token: MultichainToken,
    acc2: SignerWithAddress,
    acc1: SignerWithAddress,
    accessControlManager: FakeContract<AccessControlManager>;

  const tokenFixture = async () => {
    accessControlManager = await smock.fake<AccessControlManager>("AccessControlManager");
    accessControlManager.isAllowedToCall.returns(true);
    tokenFactory = await ethers.getContractFactory("MultichainToken");
    token = await tokenFactory.deploy(accessControlManager.address, "MultichainToken", "MT");
    acc1 = (await ethers.getSigners())[0];
    acc2 = (await ethers.getSigners())[1];
  };
  beforeEach(async function () {
    await loadFixture(tokenFixture);
  });
  it("Reverts when token is paused", async () => {
    await token.pause();
    await expect(token.mint(acc1.address, ethers.utils.parseEther("2", 18))).to.be.revertedWith("Pausable: paused");
    await token.unpause();
  });
  it("Reverts when minting cap reached", async () => {
    await token.connect(acc1).setMintCap(acc1.address, ethers.utils.parseEther("1", 18));
    await expect(
      token.connect(acc1).mint(acc1.address, ethers.utils.parseEther("2", 18)),
    ).to.be.revertedWithCustomError(token, "MintLimitExceed");
  });
  it("Mint succesfully", async () => {
    const mintAmount = ethers.utils.parseEther("2", 18);
    await token.connect(acc1).setMintCap(acc1.address, mintAmount);
    await expect(token.connect(acc1).mint(acc1.address, mintAmount)).to.emit(token, "MintLimitDecreased");
    expect(await token.minterToMintedAmount(acc1.address)).to.equals(mintAmount);
  });

  it("Reverts when token is paused", async () => {
    await token.pause();
    await expect(token.burn(acc1.address, ethers.utils.parseEther("2", 18))).to.be.revertedWith("Pausable: paused");
  });
  it("Reverts when burned token is greater than minted token", async () => {
    await token.connect(acc1).setMintCap(acc1.address, ethers.utils.parseEther("2", 18));
    await expect(token.connect(acc1).mint(acc1.address, ethers.utils.parseEther("2", 18))).to.emit(
      token,
      "MintLimitDecreased",
    );
    await expect(token.connect(acc1).burn(acc1.address, ethers.utils.parseEther("3", 18))).to.be.revertedWith(
      "ERC20: burn amount exceeds balance",
    );
  });
  it("Burn succesfully", async () => {
    await token.connect(acc1).setMintCap(acc1.address, ethers.utils.parseEther("2", 18));
    await expect(token.connect(acc1).mint(acc1.address, ethers.utils.parseEther("2", 18))).to.emit(
      token,
      "MintLimitDecreased",
    );
    await expect(token.connect(acc1).burn(acc1.address, ethers.utils.parseEther("2", 18))).to.emit(
      token,
      "MintLimitIncreased",
    );
  });
  it("Update blackList", async () => {
    await expect(token.connect(acc1).updateBlacklist(acc2.address, true)).to.emit(token, "BlacklistUpdated");
    expect(await token.isBlackListed(acc2.address)).to.be.true;
  });
  it("Sets access control manager", async () => {
    const accessControlManagerNew = await smock.fake<AccessControlManager>("AccessControlManager");
    await expect(token.setAccessControlManager(accessControlManagerNew.address)).to.emit(
      token,
      "NewAccessControlManager",
    );

    await expect(token.setAccessControlManager(ethers.constants.AddressZero)).to.be.revertedWithCustomError(
      token,
      "ZeroAddressNotAllowed",
    );
  });
  it("Reverts when source and destination address is same in migration", async () => {
    await expect(token.migrateMinterTokens(acc1.address, acc1.address)).to.be.revertedWithCustomError(
      token,
      "AddressesMustDiffer",
    );
  });
  it("Reverts when destination cap is less than source and destination cap", async () => {
    const mintCap = ethers.utils.parseEther("2", 18);
    await token.setMintCap(acc1.address, mintCap);
    expect(await token.minterToCap(acc1.address)).to.equals(mintCap);
    await token.setMintCap(acc2.address, mintCap);
    expect(await token.minterToCap(acc2.address)).to.equals(mintCap);
    const amount = ethers.utils.parseEther("1", 18);
    await token.mint(acc1.address, amount);
    await token.mint(acc2.address, amount);
    await token.setMintCap(acc2.address, amount);
    await expect(token.migrateMinterTokens(acc1.address, acc2.address)).to.be.revertedWithCustomError(
      token,
      "MintLimitExceed",
    );
  });
  it("Migrates token from source minter to destination minter", async () => {
    const mintCap = ethers.utils.parseEther("2", 18);
    await token.setMintCap(acc1.address, mintCap);
    expect(await token.minterToCap(acc1.address)).to.equals(mintCap);
    await token.setMintCap(acc2.address, mintCap);
    expect(await token.minterToCap(acc2.address)).to.equals(mintCap);
    const amount = ethers.utils.parseEther("1", 18);
    await token.mint(acc1.address, amount);
    await token.mint(acc2.address, amount);
    await expect(token.migrateMinterTokens(acc1.address, acc2.address)).to.emit(token, "MintLimitDecreased");
    await expect(token.migrateMinterTokens(acc1.address, acc2.address)).to.emit(token, "MintLimitIncreased");
    await expect(token.migrateMinterTokens(acc1.address, acc2.address)).to.emit(token, "MintedTokensMigrated");
  });
});

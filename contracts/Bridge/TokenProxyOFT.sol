// SPDX-License-Identifier: BSD-3-Clause
pragma solidity 0.8.13;

import { IMultichainToken } from "./../interfaces/IMultichainToken.sol";
import { BaseTokenProxyOFT } from "./BaseTokenProxyOFT.sol";
import { ensureNonzeroAddress } from "@venusprotocol/solidity-utilities/contracts/validators.sol";

/**
 * @title TokenProxyOFT
 * @author Venus
 * @notice TokenProxyOFT contract builds upon the functionality of its parent contract, BaseTokenProxyOFT,
 * and focuses on managing token transfers to the chain where token is mintable and burnable.
 * It provides functions to check eligibility and perform the actual token transfers while maintaining strict access controls and pausing mechanisms.
 */

contract TokenProxyOFT is BaseTokenProxyOFT {
    /**
     * @notice Regulates the force minting; It should be true only if the token manage by this Bridge contract can be mintable on both source and destination chains.
     */
    bool public immutable isForceMintActive;
    /**
     * @notice Emits when stored message dropped without successful retrying.
     */
    event DropFailedMessage(uint16 srcChainId, bytes indexed srcAddress, uint64 nonce);
    /**
     * @notice Emits when token minted manually by owner in case of bridge failure and unsuccessful retrying.
     */
    event ForceMint(uint16 srcChainId, address indexed to, uint256 amount);

    constructor(
        address tokenAddress_,
        uint8 sharedDecimals_,
        address lzEndpoint_,
        address oracle_,
        bool isForceMintActive_
    ) BaseTokenProxyOFT(tokenAddress_, sharedDecimals_, lzEndpoint_, oracle_) {
        isForceMintActive = isForceMintActive_;
    }

    /**
     * @notice Clear failed messages from the storage.
     * @param srcChainId_ Chain id of source
     * @param srcAddress_ Address of source followed by current bridge address
     * @param nonce_ Nonce_ of the transaction
     * @custom:access Only owner
     * @custom:event Emits DropFailedMessage on clearance of failed message.
     */
    function dropFailedMessage(uint16 srcChainId_, bytes memory srcAddress_, uint64 nonce_) external onlyOwner {
        failedMessages[srcChainId_][srcAddress_][nonce_] = bytes32(0);
        emit DropFailedMessage(srcChainId_, srcAddress_, nonce_);
    }

    /**
     * @notice Only call it when there is no way to recover the failed message.
     * `dropFailedMessage` must be called first if transaction is from remote->local chain to avoid double spending.
     * @param srcChainId_ Chain ID from where transaction was initiated.
     * @param to_ The address to mint to
     * @param amount_ The amount of mint
     * @custom:access Only owner.
     * @custom:event Emits forceMint, once done with transfer.
     */
    function forceMint(uint16 srcChainId_, address to_, uint256 amount_) external onlyOwner {
        require(isForceMintActive, "ProxyOFT: Force mint of token is not allowed on this chain");
        ensureNonzeroAddress(to_);
        _creditTo(srcChainId_, to_, amount_);
        emit ForceMint(srcChainId_, to_, amount_);
    }

    /**
     * @notice Returns the total circulating supply of the token on the destination chain i.e (total supply).
     * @return total circulating supply of the token on the destination chain.
     */
    function circulatingSupply() public view override returns (uint256) {
        return innerToken.totalSupply();
    }

    /**
     * @notice Debit tokens from the given address
     * @param from_  Address from which tokens to be debited
     * @param dstChainId_ Destination chain id
     * @param amount_ Amount of tokens to be debited
     * @return Actual amount debited
     */
    function _debitFrom(
        address from_,
        uint16 dstChainId_,
        bytes32,
        uint256 amount_
    ) internal override whenNotPaused returns (uint256) {
        require(from_ == _msgSender(), "ProxyOFT: owner is not send caller");
        _isEligibleToSend(from_, dstChainId_, amount_);
        IMultichainToken(address(innerToken)).burn(from_, amount_);
        return amount_;
    }

    /**
     * @notice Credit tokens in the given account
     * @param srcChainId_  Source chain id
     * @param toAddress_ Address on which token will be credited
     * @param amount_ Amount of tokens to be credited
     * @return Actual amount credited
     */
    function _creditTo(
        uint16 srcChainId_,
        address toAddress_,
        uint256 amount_
    ) internal override whenNotPaused returns (uint256) {
        _isEligibleToReceive(toAddress_, srcChainId_, amount_);
        IMultichainToken(address(innerToken)).mint(toAddress_, amount_);
        return amount_;
    }
}

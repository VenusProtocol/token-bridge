// SPDX-License-Identifier: BSD-3-Clause
pragma solidity 0.8.13;

import { IXVS } from "./interfaces/IXVS.sol";
import { BaseXVSProxyOFT } from "./BaseXVSProxyOFT.sol";

/**
 * @title XVSProxyOFTDest
 * @author Venus
 * @notice XVSProxyOFTDest contract builds upon the functionality of its parent contract, BaseXVSProxyOFT,
 * and focuses on managing token transfers to the destination chain.
 * It provides functions to check eligibility and perform the actual token transfers while maintaining strict access controls and pausing mechanisms.
 */

contract XVSProxyOFTDest is BaseXVSProxyOFT {
    /**
     * @notice Emits when stored message dropped without successful retrying.
     */
    event DropFailedMessage(uint16 srcChainId, bytes indexed srcAddress, uint64 nonce);

    constructor(
        address tokenAddress_,
        uint8 sharedDecimals_,
        address lzEndpoint_,
        address oracle_
    ) BaseXVSProxyOFT(tokenAddress_, sharedDecimals_, lzEndpoint_, oracle_) {}

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
        IXVS(address(innerToken)).burn(from_, amount_);
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
        IXVS(address(innerToken)).mint(toAddress_, amount_);
        return amount_;
    }
}

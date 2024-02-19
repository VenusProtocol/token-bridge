// SPDX-License-Identifier: BSD-3-Clause
pragma solidity 0.8.13;

import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { BaseXVSProxyOFT } from "./BaseXVSProxyOFT.sol";

/**
 * @title XVSProxyOFTSrc
 * @author Venus
 * @notice XVSProxyOFTSrc contract serves as a crucial component for cross-chain token transactions,
 * focusing on the source side of these transactions.
 * It monitors the total amount transferred to other chains, ensuring it complies with defined limits,
 * and provides functions for transferring tokens while maintaining control over the circulating supply on the source chain.
 */

contract XVSProxyOFTSrc is BaseXVSProxyOFT {
    using SafeERC20 for IERC20;
    /**
     * @notice Total amount that is transferred from this chain to other chains.
     */
    uint256 public outboundAmount;

    /**
     * @notice Emits when locked token released manually by owner.
     */
    event FallbackWithdraw(address indexed to, uint256 amount);
    /**
     * @notice Emits when stored message dropped without successful retrying.
     */
    event DropFailedMessage(uint16 srcChainId, bytes indexed srcAddress, uint64 nonce);
    /**
     * @notice Event emitted when tokens are forcefully locked.
     */
    event FallbackDeposit(address indexed from, uint256 amount_);

    constructor(
        address tokenAddress_,
        uint8 sharedDecimals_,
        address lzEndpoint_,
        address oracle_
    ) BaseXVSProxyOFT(tokenAddress_, sharedDecimals_, lzEndpoint_, oracle_) {}

    /**
     * @notice Only call it when there is no way to recover the failed message.
     * `dropFailedMessage` must be called first if transaction is from remote->local chain to avoid double spending.
     * @param to_ The address to withdraw to
     * @param amount_ The amount of withdrawal
     * @custom:access Only owner.
     * @custom:event Emits FallbackWithdraw, once done with transfer.
     */
    function fallbackWithdraw(address to_, uint256 amount_) external onlyOwner {
        require(outboundAmount >= amount_, "Withdraw amount should be less than outbound amount");
        unchecked {
            outboundAmount -= amount_;
        }
        _transferFrom(address(this), to_, amount_);
        emit FallbackWithdraw(to_, amount_);
    }

    /**
     * @notice Forces the lock of tokens by increasing outbound amount and transferring tokens from the sender to the contract.
     * @param amount_ The amount of tokens to lock.
     * @param depositor_ Address of the depositor.
     * @custom:access Only owner.
     * @custom:event Emits FallbackDeposit, once done with transfer.
     */
    function fallbackDeposit(address depositor_, uint256 amount_) external onlyOwner {
        (uint256 actualAmount, ) = _removeDust(amount_);

        outboundAmount += actualAmount;
        uint256 cap = _sd2ld(type(uint64).max);
        require(cap >= outboundAmount, "ProxyOFT: outboundAmount overflow");

        _transferFrom(depositor_, address(this), actualAmount);

        emit FallbackDeposit(depositor_, actualAmount);
    }

    /**
     * @notice Clear failed messages from the storage.
     * @param srcChainId_ Chain id of source
     * @param srcAddress_ Address of source followed by current bridge address
     * @param nonce_ Nonce_ of the transaction
     * @custom:access Only owner.
     * @custom:event Emits DropFailedMessage on clearance of failed message.
     */
    function dropFailedMessage(uint16 srcChainId_, bytes memory srcAddress_, uint64 nonce_) external onlyOwner {
        failedMessages[srcChainId_][srcAddress_][nonce_] = bytes32(0);
        emit DropFailedMessage(srcChainId_, srcAddress_, nonce_);
    }

    /**
     * @notice Returns the total circulating supply of the token on the source chain i.e (total supply - locked in this contract).
     * @return Returns difference in total supply and the outbound amount.
     */
    function circulatingSupply() public view override returns (uint256) {
        return innerToken.totalSupply() - outboundAmount;
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

        uint256 amount = _transferFrom(from_, address(this), amount_);

        outboundAmount += amount;
        uint256 cap = _sd2ld(type(uint64).max);
        require(cap >= outboundAmount, "ProxyOFT: outboundAmount overflow");

        return amount;
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
        outboundAmount -= amount_;
        // tokens are already in this contract, so no need to transfer
        if (toAddress_ == address(this)) {
            return amount_;
        }

        return _transferFrom(address(this), toAddress_, amount_);
    }
}

// SPDX-License-Identifier: BSD-3-Clause
pragma solidity 0.8.13;

import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ResilientOracleInterface } from "@venusprotocol/oracle/contracts/interfaces/OracleInterface.sol";
import { Pausable } from "@openzeppelin/contracts/security/Pausable.sol";
import { BaseOFTV2 } from "@layerzerolabs/solidity-examples/contracts/token/oft/v2/BaseOFTV2.sol";
import { ensureNonzeroAddress } from "@venusprotocol/solidity-utilities/contracts/validators.sol";
import { ExponentialNoError } from "@venusprotocol/solidity-utilities/contracts/ExponentialNoError.sol";

/**
 * @title BaseXVSProxyOFT
 * @author Venus
 * @notice The BaseXVSProxyOFT contract is tailored for facilitating cross-chain transactions with an ERC20 token.
 * It manages transaction limits of a single and daily transactions.
 * This contract inherits key functionalities from other contracts, including pausing capabilities and error handling.
 * It holds state variables for the inner token and maps for tracking transaction limits and statistics across various chains and addresses.
 * The contract allows the owner to configure limits, set whitelists, and control pausing.
 * Internal functions conduct eligibility check of transactions, making the contract a fundamental component for cross-chain token management.
 */

abstract contract BaseXVSProxyOFT is Pausable, ExponentialNoError, BaseOFTV2 {
    using SafeERC20 for IERC20;
    IERC20 internal immutable innerToken;
    uint256 internal immutable ld2sdRate;
    bool public sendAndCallEnabled;

    /**
     * @notice The address of ResilientOracle contract wrapped in its interface.
     */
    ResilientOracleInterface public oracle;
    /**
     * @notice Maximum limit for a single transaction in USD(scaled with 18 decimals) from local chain.
     */
    mapping(uint16 => uint256) public chainIdToMaxSingleTransactionLimit;
    /**
     * @notice Maximum daily limit for transactions in USD(scaled with 18 decimals) from local chain.
     */
    mapping(uint16 => uint256) public chainIdToMaxDailyLimit;
    /**
     * @notice Total sent amount in USD(scaled with 18 decimals) within the last 24-hour window from local chain.
     */
    mapping(uint16 => uint256) public chainIdToLast24HourTransferred;
    /**
     * @notice Timestamp when the last 24-hour window started from local chain.
     */
    mapping(uint16 => uint256) public chainIdToLast24HourWindowStart;
    /**
     * @notice Maximum limit for a single receive transaction in USD(scaled with 18 decimals) from remote chain.
     */
    mapping(uint16 => uint256) public chainIdToMaxSingleReceiveTransactionLimit;
    /**
     * @notice Maximum daily limit for receiving transactions in USD(scaled with 18 decimals) from remote chain.
     */
    mapping(uint16 => uint256) public chainIdToMaxDailyReceiveLimit;
    /**
     * @notice Total received amount in USD(scaled with 18 decimals) within the last 24-hour window from remote chain.
     */
    mapping(uint16 => uint256) public chainIdToLast24HourReceived;
    /**
     * @notice Timestamp when the last 24-hour window started from remote chain.
     */
    mapping(uint16 => uint256) public chainIdToLast24HourReceiveWindowStart;
    /**
     * @notice Address on which cap check and bound limit is not appicable.
     */
    mapping(address => bool) public whitelist;

    /**
     * @notice Emmited when address is added to whitelist.
     */
    event SetWhitelist(address indexed addr, bool isWhitelist);
    /**
     * @notice  Emitted when the maximum limit for a single transaction from local chain is modified.
     */
    event SetMaxSingleTransactionLimit(uint16 chainId, uint256 oldMaxLimit, uint256 newMaxLimit);
    /**
     * @notice Emitted when the maximum daily limit of transactions from local chain is modified.
     */
    event SetMaxDailyLimit(uint16 chainId, uint256 oldMaxLimit, uint256 newMaxLimit);
    /**
     * @notice Emitted when the maximum limit for a single receive transaction from remote chain is modified.
     */
    event SetMaxSingleReceiveTransactionLimit(uint16 chainId, uint256 oldMaxLimit, uint256 newMaxLimit);
    /**
     * @notice Emitted when the maximum daily limit for receiving transactions from remote chain is modified.
     */
    event SetMaxDailyReceiveLimit(uint16 chainId, uint256 oldMaxLimit, uint256 newMaxLimit);
    /**
     * @notice Event emitted when oracle is modified.
     */
    event OracleChanged(address indexed oldOracle, address indexed newOracle);
    /**
     * @notice Event emitted when trusted remote sets to empty.
     */
    event TrustedRemoteRemoved(uint16 chainId);
    /**
     * @notice Event emitted when inner token set successfully.
     */
    event InnerTokenAdded(address indexed innerToken);

    /**
     * @notice Event emitted when SendAndCallEnabled updated successfully.
     */
    event UpdateSendAndCallEnabled(bool indexed enabled);

    /**
     * @param tokenAddress_ Address of the inner token.
     * @param sharedDecimals_ No of shared decimals.
     * @param lzEndpoint_ Address of the layer zero endpoint contract.
     * @param oracle_ Address of the price oracle.
     * @custom:error ZeroAddressNotAllowed is thrown when token contract address is zero.
     * @custom:error ZeroAddressNotAllowed is thrown when lzEndpoint contract address is zero.
     * @custom:error ZeroAddressNotAllowed is thrown when oracle contract address is zero.
     */
    constructor(
        address tokenAddress_,
        uint8 sharedDecimals_,
        address lzEndpoint_,
        address oracle_
    ) BaseOFTV2(sharedDecimals_, lzEndpoint_) {
        ensureNonzeroAddress(tokenAddress_);
        ensureNonzeroAddress(lzEndpoint_);

        innerToken = IERC20(tokenAddress_);

        (bool success, bytes memory data) = tokenAddress_.staticcall(abi.encodeWithSignature("decimals()"));
        require(success, "ProxyOFT: failed to get token decimals");
        uint8 decimals = abi.decode(data, (uint8));

        require(sharedDecimals_ <= decimals, "ProxyOFT: sharedDecimals must be <= decimals");
        ld2sdRate = 10 ** (decimals - sharedDecimals_);

        ensureNonzeroAddress(oracle_);

        emit InnerTokenAdded(tokenAddress_);
        emit OracleChanged(address(0), oracle_);

        oracle = ResilientOracleInterface(oracle_);
    }

    /**
     * @notice Set the address of the ResilientOracle contract.
     * @dev Reverts if the new address is zero.
     * @param oracleAddress_ The new address of the ResilientOracle contract.
     * @custom:access Only owner.
     * @custom:event Emits OracleChanged with old and new oracle address.
     */
    function setOracle(address oracleAddress_) external onlyOwner {
        ensureNonzeroAddress(oracleAddress_);
        emit OracleChanged(address(oracle), oracleAddress_);
        oracle = ResilientOracleInterface(oracleAddress_);
    }

    /**
     * @notice Sets the limit of single transaction amount.
     * @param chainId_ Destination chain id.
     * @param limit_ Amount in USD(scaled with 18 decimals).
     * @custom:access Only owner.
     * @custom:event Emits SetMaxSingleTransactionLimit with old and new limit associated with chain id.
     */
    function setMaxSingleTransactionLimit(uint16 chainId_, uint256 limit_) external onlyOwner {
        require(limit_ <= chainIdToMaxDailyLimit[chainId_], "Single transaction limit > Daily limit");
        emit SetMaxSingleTransactionLimit(chainId_, chainIdToMaxSingleTransactionLimit[chainId_], limit_);
        chainIdToMaxSingleTransactionLimit[chainId_] = limit_;
    }

    /**
     * @notice Sets the limit of daily (24 Hour) transactions amount.
     * @param chainId_ Destination chain id.
     * @param limit_ Amount in USD(scaled with 18 decimals).
     * @custom:access Only owner.
     * @custom:event Emits setMaxDailyLimit with old and new limit associated with chain id.
     */
    function setMaxDailyLimit(uint16 chainId_, uint256 limit_) external onlyOwner {
        require(limit_ >= chainIdToMaxSingleTransactionLimit[chainId_], "Daily limit < single transaction limit");
        emit SetMaxDailyLimit(chainId_, chainIdToMaxDailyLimit[chainId_], limit_);
        chainIdToMaxDailyLimit[chainId_] = limit_;
    }

    /**
     * @notice Sets the maximum limit for a single receive transaction.
     * @param chainId_ The destination chain ID.
     * @param limit_ The new maximum limit in USD(scaled with 18 decimals).
     * @custom:access Only owner.
     * @custom:event Emits setMaxSingleReceiveTransactionLimit with old and new limit associated with chain id.
     */
    function setMaxSingleReceiveTransactionLimit(uint16 chainId_, uint256 limit_) external onlyOwner {
        require(limit_ <= chainIdToMaxDailyReceiveLimit[chainId_], "single receive transaction limit > Daily limit");
        emit SetMaxSingleReceiveTransactionLimit(chainId_, chainIdToMaxSingleReceiveTransactionLimit[chainId_], limit_);
        chainIdToMaxSingleReceiveTransactionLimit[chainId_] = limit_;
    }

    /**
     * @notice Sets the maximum daily limit for receiving transactions.
     * @param chainId_ The destination chain ID.
     * @param limit_ The new maximum daily limit in USD(scaled with 18 decimals).
     * @custom:access Only owner.
     * @custom:event Emits setMaxDailyReceiveLimit with old and new limit associated with chain id.
     */
    function setMaxDailyReceiveLimit(uint16 chainId_, uint256 limit_) external onlyOwner {
        require(
            limit_ >= chainIdToMaxSingleReceiveTransactionLimit[chainId_],
            "Daily limit < single receive transaction limit"
        );
        emit SetMaxDailyReceiveLimit(chainId_, chainIdToMaxDailyReceiveLimit[chainId_], limit_);
        chainIdToMaxDailyReceiveLimit[chainId_] = limit_;
    }

    /**
     * @notice Sets the whitelist address to skip checks on transaction limit.
     * @param user_ Adress to be add in whitelist.
     * @param val_ Boolean to be set (true for user_ address is whitelisted).
     * @custom:access Only owner.
     * @custom:event Emits setWhitelist.
     */
    function setWhitelist(address user_, bool val_) external onlyOwner {
        emit SetWhitelist(user_, val_);
        whitelist[user_] = val_;
    }

    /**
     * @notice Triggers stopped state of the bridge.
     * @custom:access Only owner.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Triggers resume state of the bridge.
     * @custom:access Only owner.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Remove trusted remote from storage.
     * @param remoteChainId_ The chain's id corresponds to setting the trusted remote to empty.
     */
    function removeTrustedRemote(uint16 remoteChainId_) external onlyOwner {
        delete trustedRemoteLookup[remoteChainId_];
        emit TrustedRemoteRemoved(remoteChainId_);
    }

    /**
     * @notice It enables or disables sendAndCall functionality for the bridge.
     * @param enabled_ Boolean indicating whether the sendAndCall function should be enabled or disabled.
     */
    function updateSendAndCallEnabled(bool enabled_) external onlyOwner {
        sendAndCallEnabled = enabled_;
        emit UpdateSendAndCallEnabled(enabled_);
    }

    /**
     * @notice Initiates a cross-chain token transfer and triggers a call on the destination chain.
     * @dev This internal override function enables the contract to send tokens and invoke calls on the specified
     *      destination chain. It checks whether the sendAndCall feature is enabled before proceeding with the transfer.
     * @param from_ Address from which tokens will be debited.
     * @param dstChainId_ Destination chain id on which tokens will be send.
     * @param toAddress_ Address on which tokens will be credited on destination chain.
     * @param amount_ Amount of tokens that will be transferred.
     * @param payload_ Additional data payload for the call on the destination chain.
     * @param dstGasForCall_ The amount of gas allocated for the call on the destination chain.
     * @param callparams_ Additional parameters, including refund address, ZRO payment address,
     *                   and adapter params.
     */

    function sendAndCall(
        address from_,
        uint16 dstChainId_,
        bytes32 toAddress_,
        uint256 amount_,
        bytes calldata payload_,
        uint64 dstGasForCall_,
        LzCallParams calldata callparams_
    ) public payable override {
        require(sendAndCallEnabled, "sendAndCall is disabled");

        super.sendAndCall(from_, dstChainId_, toAddress_, amount_, payload_, dstGasForCall_, callparams_);
    }

    /**
     * @notice Empty implementation of renounce ownership to avoid any mishappening.
     */
    function renounceOwnership() public override {}

    /**
     * @notice Return's the address of the inner token of this bridge.
     */
    function token() public view override returns (address) {
        return address(innerToken);
    }

    function _isEligibleToSend(address from_, uint16 dstChainId_, uint256 amount_) internal {
        // Check if the sender's address is whitelisted
        bool isWhiteListedUser = whitelist[from_];
        // Check if the user is whitelisted and return if true
        if (isWhiteListedUser) {
            return;
        }

        // Calculate the amount in USD using the oracle price
        uint256 amountInUsd;
        Exp memory oraclePrice = Exp({ mantissa: oracle.getPrice(token()) });
        amountInUsd = mul_ScalarTruncate(oraclePrice, amount_);

        // Load values for the 24-hour window checks
        uint256 currentBlockTimestamp = block.timestamp;
        uint256 lastDayWindowStart = chainIdToLast24HourWindowStart[dstChainId_];
        uint256 transferredInWindow = chainIdToLast24HourTransferred[dstChainId_];
        uint256 maxSingleTransactionLimit = chainIdToMaxSingleTransactionLimit[dstChainId_];
        uint256 maxDailyLimit = chainIdToMaxDailyLimit[dstChainId_];

        // Revert if the amount exceeds the single transaction limit
        require(amountInUsd <= maxSingleTransactionLimit, "Single Transaction Limit Exceed");

        // Check if the time window has changed (more than 24 hours have passed)
        if (currentBlockTimestamp - lastDayWindowStart > 1 days) {
            transferredInWindow = amountInUsd;
            chainIdToLast24HourWindowStart[dstChainId_] = currentBlockTimestamp;
        } else {
            transferredInWindow += amountInUsd;
        }

        // Revert if the amount exceeds the daily limit
        require(transferredInWindow <= maxDailyLimit, "Daily Transaction Limit Exceed");

        // Update the amount for the 24-hour window
        chainIdToLast24HourTransferred[dstChainId_] = transferredInWindow;
    }

    function _isEligibleToReceive(address toAddress_, uint16 srcChainId_, uint256 receivedAmount_) internal {
        // Check if the recipient's address is whitelisted
        bool isWhiteListedUser = whitelist[toAddress_];
        // Check if the user is whitelisted and return if true
        if (isWhiteListedUser) {
            return;
        }

        // Calculate the received amount in USD using the oracle price
        uint256 receivedAmountInUsd;
        Exp memory oraclePrice = Exp({ mantissa: oracle.getPrice(address(token())) });
        receivedAmountInUsd = mul_ScalarTruncate(oraclePrice, receivedAmount_);

        uint256 currentBlockTimestamp = block.timestamp;

        // Load values for the 24-hour window checks for receiving
        uint256 lastDayReceiveWindowStart = chainIdToLast24HourReceiveWindowStart[srcChainId_];
        uint256 receivedInWindow = chainIdToLast24HourReceived[srcChainId_];
        uint256 maxSingleReceiveTransactionLimit = chainIdToMaxSingleReceiveTransactionLimit[srcChainId_];
        uint256 maxDailyReceiveLimit = chainIdToMaxDailyReceiveLimit[srcChainId_];

        // Check if the received amount exceeds the single transaction limit
        require(receivedAmountInUsd <= maxSingleReceiveTransactionLimit, "Single Transaction Limit Exceed");

        // Check if the time window has changed (more than 24 hours have passed)
        if (currentBlockTimestamp - lastDayReceiveWindowStart > 1 days) {
            receivedInWindow = receivedAmountInUsd;
            chainIdToLast24HourReceiveWindowStart[srcChainId_] = currentBlockTimestamp;
        } else {
            receivedInWindow += receivedAmountInUsd;
        }

        // Revert if the received amount exceeds the daily limit
        require(receivedInWindow <= maxDailyReceiveLimit, "Daily Transaction Limit Exceed");

        // Update the received amount for the 24-hour window
        chainIdToLast24HourReceived[srcChainId_] = receivedInWindow;
    }

    function _transferFrom(
        address from_,
        address to_,
        uint256 amount_
    ) internal override whenNotPaused returns (uint256) {
        uint256 before = innerToken.balanceOf(to_);
        if (from_ == address(this)) {
            innerToken.safeTransfer(to_, amount_);
        } else {
            innerToken.safeTransferFrom(from_, to_, amount_);
        }
        return innerToken.balanceOf(to_) - before;
    }

    function _nonblockingLzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) internal override {
        bytes memory trustedRemote = trustedRemoteLookup[_srcChainId];
        // if will still block the message pathway from (srcChainId, srcAddress). should not receive message from untrusted remote.
        require(
            _srcAddress.length == trustedRemote.length &&
                trustedRemote.length > 0 &&
                keccak256(_srcAddress) == keccak256(trustedRemote),
            "LzApp: invalid source sending contract"
        );
        super._nonblockingLzReceive(_srcChainId, _srcAddress, _nonce, _payload);
    }

    function _ld2sdRate() internal view override returns (uint256) {
        return ld2sdRate;
    }
}

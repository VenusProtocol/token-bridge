// SPDX-License-Identifier: BSD-3-Clause
pragma solidity 0.8.13;

import { IMultichainToken } from "./../interfaces/IMultichainToken.sol";
import { MultichainTokenController } from "./utils/MultichainTokenController.sol";
import { ensureNonzeroAddress } from "@venusprotocol/solidity-utilities/contracts/validators.sol";

/**
 * @title TokenBridgeController
 * @author Venus
 * @notice TokenBridgeController contract serves as a intermidiary contract between bridge and token. It controls the mint and burn operation via bridge contract.
 *  It also incorporates access control features provided by the "TokenController" contract to ensure proper governance and restrictions on minting and burning operations.
 */

contract TokenBridgeController is MultichainTokenController {
    /**
     * @notice Address of the token which is controlled by this contract.
     */
    IMultichainToken public immutable INNER_TOKEN;

    constructor(address accessControlManager_, address innerToken_) MultichainTokenController(accessControlManager_) {
        ensureNonzeroAddress(innerToken_);
        INNER_TOKEN = IMultichainToken(innerToken_);
    }

    /**
     * @notice Creates `amount_` tokens and assigns them to `account_`, increasing
     * the total supply. Checks access and eligibility.
     * @param account_ Address to which tokens are assigned.
     * @param amount_ Amount of tokens to be assigned.
     * @custom:access Controlled by AccessControlManager.
     * @custom:event Emits MintLimitDecreased with new available limit.
     * @custom:error MintLimitExceed is thrown when minting amount exceeds the maximum cap.
     */
    function mint(address account_, uint256 amount_) external whenNotPaused {
        _ensureAllowed("mint(address,uint256)");
        _beforeTokenTransfer(msg.sender, account_);
        _isEligibleToMint(msg.sender, amount_);
        INNER_TOKEN.mint(account_, amount_);
    }

    /**
     * @notice Destroys `amount_` tokens from `account_`, reducing the
     * total supply. Checks access and eligibility.
     * @param account_ Address from which tokens be destroyed.
     * @param amount_ Amount of tokens to be destroyed.
     * @custom:access Controlled by AccessControlManager.
     * @custom:event Emits MintLimitIncreased with new available limit.
     */
    function burn(address account_, uint256 amount_) external whenNotPaused {
        _ensureAllowed("burn(address,uint256)");
        _beforeTokenTransfer(msg.sender, account_);
        INNER_TOKEN.burn(account_, amount_);
        _increaseMintLimit(msg.sender, amount_);
    }

    /**
     * @notice Returns number of decimals of token
     * @return Number of decimals of token
     */
    function decimals() public view returns (uint8) {
        return INNER_TOKEN.decimals();
    }

    /**
     * @notice Hook that is called before any transfer of tokens. This includes
     * minting and burning.
     * @param from_ Address of account from which tokens are to be transferred.
     * @param to_ Address of the account to which tokens are to be transferred.
     * @custom:error AccountBlacklisted is thrown when either `from` or `to` address is blacklisted.
     */
    function _beforeTokenTransfer(address from_, address to_) internal view whenNotPaused {
        if (_blacklist[to_]) {
            revert AccountBlacklisted(to_);
        }
        if (_blacklist[from_]) {
            revert AccountBlacklisted(from_);
        }
    }
}

// SPDX-License-Identifier: BSD-3-Clause
pragma solidity 0.8.13;

/**
 * @title IMultichainToken
 * @author Venus
 * @notice Interface implemented by `MultichainToken`.
 */
interface IMultichainToken {
    function mint(address to, uint256 amount) external;

    function burn(address from, uint256 amount) external;

    function decimals() external view returns (uint8);
}

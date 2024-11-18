// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @dev The contract has a fee portion that can be changed, but only with prior notice.
 */
abstract contract FeeSettable is Ownable {
  uint256 constant FEE_ADVANCE_NOTICE_TIME = 7 days;

  /**
   * @notice The current fee portion (in tenths of a basis point)
   */
  uint24 public feePortion;

  /**
   * @notice If nonzero, the earliest time a new fee could be effective
   */
  uint256 public feeFrozenUntil;

  /**
   * @notice The new fee portion (in tenths of a basis point)
   */
  uint24 public newFeePortion;

  /**
   * @dev The starting fee portion (in tenths of a basis point) must be specified.
   * Example: if this is set to 4, it represents a 0.004% fee. Valid range is 0% to 100.000%.
   * @param initialFeePortion Initrail fee amount
   */
  constructor(uint24 initialFeePortion) {
    require(initialFeePortion <= 100000, "Fee portion out of range: over 100%");
    feePortion = initialFeePortion;
  }

  /**
   * @notice The new fee portion is proposed for a time in the future
   * @param proposedFee The new portion that the fee could be
   */
  function proposeNewFee(uint24 proposedFee)
    onlyOwner
    external
  {
    require(proposedFee <= 100000, "Fee portion out of range: over 100%");
    newFeePortion = proposedFee;
    feeFrozenUntil = block.timestamp + FEE_ADVANCE_NOTICE_TIME;
  }

  /**
   * @notice Put into effect a previously proposed new fee portion
   */
  function activateNewFee()
    onlyOwner
    external
  {
    require(feeFrozenUntil != 0, "An advanced notice has not yet been set");
    require(block.timestamp > feeFrozenUntil, "Current fee is still frozen");
    feePortion = newFeePortion;
  }

  /**
   * @notice Calculate fee as portion of some amount
   * @dev Fee is based on input amount.
   * @param calculateFrom Amount from which we will calculate fee.
   * @return the fee amount
   */
  function calculateFee(uint256 calculateFrom)
    public
    view
    returns (uint256)
  {
    return mulScale(calculateFrom, feePortion, 10000);
  }

  /**
   * @dev Multiply and divide
   * @dev This function is guaranteed to return the same result as the hypothetical
   * uint256( uint512(x) * uint512(y) / y )
   * or throw if the result is greater than 2^256-1
   * @param x One multiplicand
   * @param y Another multiplicand
   * @param scale The divisor, which must be less than 2^128
   * @return The result of x * y / d (rounded down)
   *
   * Based on: https://ethereum.stackexchange.com/a/79736/36268
   */
  function mulScale (uint256 x, uint256 y, uint128 scale)
    internal
    pure
    returns (uint256)
  {
    uint a = x / scale;
    uint b = x % scale;
    uint c = y / scale;
    uint d = y % scale;
    
    return a * c * scale
      + a * d
      + b * c
      + b * d / scale;
  }
}

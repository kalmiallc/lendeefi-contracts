// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.28;
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";


contract DenyReceivingERC721 is IERC721Receiver {
  /**
    * @notice This does not allow direct inbound ERC-721 transfers. You must
    * use other contract functions to transfer in tokens.
    */
  function onERC721Received(
    address,
    address,
    uint256,
    bytes calldata
  ) 
    external
    pure
    override
    returns (bytes4)
  {
    revert();
  }
}
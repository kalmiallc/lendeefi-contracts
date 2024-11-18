// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.28;
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";


contract MerkleMock {

  /**
    * @notice Verifies a Merkle proof against a root hash
    * @param root The Merkle root to verify against
    * @param proof A Merkle inclusion proof
    * @return bool True if the proof is valid
    */
  function merkleProof(
    address offeror,
    IERC721 nftContract,
    uint256 nftId,
    uint256 saleExpiration,
    IERC20 saleContract,
    uint256 saleAmount,
    uint256 termUntilCollateralAtRisk,
    IERC20 buybackContract,
    uint256 buybackAmount,
    bytes32 root,
    bytes32[] memory proof
  )
    external
    pure
    returns (bool)
  {
    bytes32 leaf = generateClaim(
      offeror,
      nftContract,
      nftId,
      saleExpiration,
      saleContract,
      saleAmount,
      termUntilCollateralAtRisk,
      buybackContract,
      buybackAmount
    );
    return MerkleProof.verify(proof, root, leaf);
  }

  function generateClaim(
    address offeror, // Who offers this sale & buyback
    
    IERC721 nftContract, // Where the collateral NFT is registered
    uint256 nftId, // The registered NFT identifier
    
    uint256 saleExpiration, // When (Unix timestamp) this offer expires
    IERC20 saleContract, // Where the sale value is accounted
    uint256 saleAmount, // The amount of the sale value

    uint256 termUntilCollateralAtRisk, // How long (seconds) that only Liquidator can buyback collateral
    IERC20 buybackContract, // Where the buyback value is accounted
    uint256 buybackAmount // The amount of the buyback value
  )
    public
    pure
    returns (bytes32)
  {
    return keccak256(abi.encodePacked(
      "com.lendeefi.sellWithBuybackOffer|",
      offeror,
      nftContract,
      nftId,
      saleExpiration,
      saleContract,
      saleAmount,
      termUntilCollateralAtRisk,
      buybackContract,
      buybackAmount
    ));
  }
}
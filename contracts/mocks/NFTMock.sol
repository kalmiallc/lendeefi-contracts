// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 * @dev This is a mock NFT contract implementation using OpenZeppelin's ERC721.
 */
contract NFTMock is ERC721 {
    constructor() ERC721("NFTMock", "NFTM") {}

    /**
     * @dev Mints a new NFT.
     * @param to The address that will own the minted NFT.
     * @param tokenId of the NFT to be minted.
     */
    function mint(address to, uint256 tokenId) external {
        _safeMint(to, tokenId);
    }
}

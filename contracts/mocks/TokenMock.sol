// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @dev This is a mock ERC20 token implementation using OpenZeppelin's ERC20.
 */
contract TokenMock is ERC20 {
    constructor() ERC20("Mock", "MCK") {
        _mint(msg.sender, 1000000000000000000000000);
    }
}

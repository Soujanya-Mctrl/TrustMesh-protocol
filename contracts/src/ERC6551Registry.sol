// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ERC6551Account.sol";

contract ERC6551Registry {
    event ERC6551AccountCreated(
        address account,
        address indexed tokenContract,
        uint256 indexed tokenId
    );

    // Maps tokenContract -> tokenId -> TBA address
    mapping(address => mapping(uint256 => address)) public getAccount;

    function createAccount(
        address tokenContract,
        uint256 tokenId
    ) external returns (address) {
        require(getAccount[tokenContract][tokenId] == address(0), "ERC6551Registry: Account already exists");
        
        ERC6551Account newAccount = new ERC6551Account(tokenContract, tokenId);
        address accountAddr = address(newAccount);
        getAccount[tokenContract][tokenId] = accountAddr;
        
        emit ERC6551AccountCreated(accountAddr, tokenContract, tokenId);
        return accountAddr;
    }
}

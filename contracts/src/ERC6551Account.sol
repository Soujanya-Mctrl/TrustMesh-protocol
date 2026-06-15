// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC721 {
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract ERC6551Account {
    address public immutable tokenContract;
    uint256 public immutable tokenId;

    event TransactionExecuted(address indexed to, uint256 value, bytes data);

    constructor(address _tokenContract, uint256 _tokenId) {
        tokenContract = _tokenContract;
        tokenId = _tokenId;
    }

    function owner() public view returns (address) {
        return IERC721(tokenContract).ownerOf(tokenId);
    }

    receive() external payable {}

    function execute(
        address to,
        uint256 value,
        bytes calldata data
    ) external payable returns (bytes memory) {
        require(msg.sender == owner(), "ERC6551: only owner");
        
        (bool success, bytes memory result) = to.call{value: value}(data);
        require(success, "ERC6551: execution failed");
        
        emit TransactionExecuted(to, value, data);
        return result;
    }
}

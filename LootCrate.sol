
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

// import "hardhat/console.sol";

contract LootCrate is ERC1155, IERC721Receiver {

    uint256 private _currentTokenId;

    struct Reward {
        address erc721contract; // reward contract address; these must be ERC721 contract
        uint256 tokenId;        // tokenId that is the reward
        uint8 rarity;           // rarity for each reward item. smaller integers means more rare
    }

    mapping(uint256 => Reward[]) public rewards;
    mapping(uint256 => uint32) public totalRarity;

    constructor()
    ERC1155("https://lootcrate.to/{id}.json")
    {
        _currentTokenId = 0;
    }

    function createCrate() external
    {
        _mint(_msgSender(), getNextTokenId(), 0, "");
        _incrementTokenId();
    }

    function addItemToCrate(uint256 tokenId, Reward calldata reward) external
    {
        // transfer reward item from caller wallet to LootCrate
        IERC721 erc721Interface = IERC721(reward.erc721contract);
        erc721Interface.safeTransferFrom(_msgSender(), address(this), reward.tokenId, "");

        // issue a key to caller
        _mint(_msgSender(), tokenId, 1, "");

        // update storage vars
        rewards[tokenId].push(reward);
        totalRarity[tokenId] += reward.rarity;        
    }

    function claimItemFromCrate(uint256 tokenId) external
    {
        uint32 localTotalRarity = totalRarity[tokenId];                 // to save gas on lookup (??)

        require(
          localTotalRarity > 0,
          "NO_CRATE_REWARDS_EXIST"
        );

        require(
          balanceOf(_msgSender(), tokenId) > 0,
          "CALLER_DOES_NOT_HAVE_ANY_KEY"
        );

        uint256 numRewards = rewards[tokenId].length;
        uint32[] memory selArray = new uint32[](localTotalRarity);
        uint32 i = 0;
        uint32 j = 0;
        Reward memory r;
        while(i < numRewards) {
            r = rewards[tokenId][i];                                    // to save gas on lookup (??)
            for(uint8 k=0; k < r.rarity; k++) {
                selArray[j] = i;
                // console.log("selArray[", j,"] = ", i);
                j++;
            }
            i++;
        }
        uint256 rand = random(string(abi.encodePacked(block.number, toString(tokenId))));
        // console.log("rand = ", toString(rand));
        // console.log("tokenId ", toString(tokenId), " totalRarity = ", toString(localTotalRarity));
        uint256 rewardIndex = rand % localTotalRarity;
        // console.log("rewardIndex = ", toString(rewardIndex));
        r = rewards[tokenId][selArray[rewardIndex]];

        IERC721 erc721Interface = IERC721(r.erc721contract);
        erc721Interface.safeTransferFrom(address(this), _msgSender(), r.tokenId, "");

        _burn(_msgSender(), tokenId, 1);

        // remove from array: set index we want to delete equal to last item , then delete last item
        rewards[tokenId][selArray[rewardIndex]] = rewards[tokenId][numRewards - 1];
        rewards[tokenId].pop();

        totalRarity[tokenId] = localTotalRarity - r.rarity;
    }

    function getNextTokenId() public view returns (uint256) {
        return _currentTokenId + 1;
    }

    function _incrementTokenId() private {
        _currentTokenId++;
    }

    /**
     * this is straight from Loot contract
     */
    function random(string memory input) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(input)));
    }

    /**
     * this is straight from Loot contract
     */
    function toString(uint256 value) internal pure returns (string memory) {
        // Inspired by OraclizeAPI's implementation - MIT license
        // https://github.com/oraclize/ethereum-api/blob/b42146b063c7d6ee1358846c198246239e9360e8/oraclizeAPI_0.4.25.sol

        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }    

    /**
     * This function needs to exist as below in any implementation of ERC721Receiver
     * Always returns `IERC721Receiver.onERC721Received.selector`.
     * see https://forum.openzeppelin.com/t/transferring-erc721-tokens/4726/2
     */
    function onERC721Received(address, address, uint256, bytes memory) public virtual override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}

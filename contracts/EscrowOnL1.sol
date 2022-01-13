// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;
import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./utils/MeralParser.sol";
import "./interfaces/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract EscrowOnL1 is
    Ownable,
    Pausable,
    ERC721Holder,
    MeralParser,
    ReentrancyGuard
{
    event TokenDeposit(uint256 id, address owner, uint256 timestamp);
    event TokenWithdraw(uint256 id, address owner, uint256 timestamp);
    event TokenOwnerChange(uint256 id, address owner, uint256 timestamp);

    /*///////////////////////////////////////////////////////////////
                  STORAGE
  //////////////////////////////////////////////////////////////*/

    /**
     * @dev Storage of all Deposit IDs to Owners
     * Use MeralParser to parse Type and Token ID from IDs, max 100,000 in a type
     * example Ethemeral Merals = type0, Monster Merals = type1
     * Front end must call correct ID
     */
    mapping(uint256 => address) public allDeposits;

    // TYPE to IERC721 addresses
    mapping(uint256 => address) public allContracts;

    // ID to price mapping - if user puts his NFT for sale than the price is stored here
    mapping(uint256 => uint256) public prices;

    /*///////////////////////////////////////////////////////////////
                  ADMIN FUNCTIONS
  //////////////////////////////////////////////////////////////*/

    function addContract(uint256 _type, address _address) external onlyOwner {
        require(allContracts[_type] == address(0), "type already exists");
        allContracts[_type] = _address;
    }

    /*///////////////////////////////////////////////////////////////
                  PUBLIC FUNCTIONS
  //////////////////////////////////////////////////////////////*/

    /**
     * @dev user can initiate a transfer of their token to the L2 chain. the token is transferred to the escrow contract's address.
     * @dev Tyrone - just simple transfer
     * Transfer event is emitted.
     * Requirements:
     * - contract is not paused
     * - erc721 contract must be pre registered
     * - only the owner can initiate the transfer
     * - id is generated from the front end
     */
    function deposit(uint256 _type, uint256 _tokenId) public {
        require(!paused(), "paused");
        require(allContracts[_type] != address(0), "not registered");
        IERC721 contractAddress = IERC721(allContracts[_type]);
        require(
            contractAddress.ownerOf((_tokenId)) == msg.sender,
            "only owner"
        );

        uint256 _id = getIdFromType(_type, _tokenId);
        allDeposits[_id] = msg.sender;
        contractAddress.safeTransferFrom(msg.sender, address(this), _tokenId);

        emit TokenDeposit(_id, msg.sender, block.timestamp);
    }

    /**
     * @dev user can initiate a withdraw of their token
     * Transfer event is emitted.
     * Requirements:
     * - contract is not paused
     * - only the owner can initiate the transfer
     * - id is generated from the front end
     */
    function withdraw(uint256 _type, uint256 _tokenId) public {
        require(!paused(), "paused");
        uint256 _id = getIdFromType(_type, _tokenId);
        require(allDeposits[_id] == msg.sender, "only owner");

        IERC721 contractAddress = IERC721(allContracts[_type]);
        contractAddress.safeTransferFrom(address(this), msg.sender, _tokenId);

        allDeposits[_id] = address(0);

        emit TokenWithdraw(_id, msg.sender, block.timestamp);
    }

    /**
     * @dev user can put up his NFT for sale which means:
     * - token will stay in the escrow
     * - proxy on L2 will function as before
     * - if the sale happens only the owner changes
     * So user does not have to withdraw the token for being able to sell it. He can does this while the token stays on L2 and in the escrow.
     * Requirements:
     * - contract is not paused
     * - only the owner can sell the NFT
     */
    function sellNft(
        uint256 _type,
        uint256 _tokenId,
        uint256 price
    ) public {
        require(!paused(), "paused");
        uint256 _id = getIdFromType(_type, _tokenId);
        require(allDeposits[_id] == msg.sender, "only owner");
        prices[_id] = price;
    }

    /**
     * @dev user can cancel his intention to sell his NFT
     * Requirements:
     * - contract is not paused
     * - only the owner can cancel
     */
    function cancelSellNftOrder(uint256 _type, uint256 _tokenId) external {
        require(!paused(), "paused");
        uint256 _id = getIdFromType(_type, _tokenId);
        require(allDeposits[_id] == msg.sender, "only owner");
        prices[_id] = 0;
    }

    /**
     * @dev user can buy an NFT from the escrow that is on sale. It means:
     * - NFT will stay in the escrow
     * - proxy on L2 will function as before
     * - only the owner changes
     * Requirements:
     * - contract is not paused
     * - only the owner can cancel
     */
    function buyNft(uint256 _type, uint256 _tokenId)
        public
        payable
        nonReentrant
    {
        require(!paused(), "paused");
        uint256 _id = getIdFromType(_type, _tokenId);
        require(prices[_id] > 0, "token is not for sale");
        require(prices[_id] == msg.value, "msg.value different from the price");
        address payable seller = payable(allDeposits[_id]);
        allDeposits[_id] = msg.sender;
        prices[_id] = 0;
        (bool sent, ) = seller.call{value: msg.value}("");
        require(sent, "Failed to send the price to the seller");
        emit TokenOwnerChange(_id, msg.sender, block.timestamp);
    }

    /**
     * @dev user can buy and withdraw an NFT from the escrow in the same time
     * Requirements:
     * - contract is not paused
     */
    function buyAndWithdrawNft(uint256 _type, uint256 _tokenId)
        external
        payable
    {
        buyNft(_type, _tokenId);
        withdraw(_type, _tokenId);
    }

    /**
     * @dev user can deposit an NFT and put it for sale in the same time
     * Requirements:
     * - contract is not paused
     */
    function depositAndSellNft(
        uint256 _type,
        uint256 _tokenId,
        uint256 price
    ) external {
        deposit(_type, _tokenId);
        sellNft(_type, _tokenId, price);
    }

    /**
     * @dev returns the price of a NFT, if price = 0 it means the NFT is not for sale
     */
    function getPrice(uint256 _type, uint256 _tokenId)
        external
        view
        returns (uint256)
    {
        uint256 _id = getIdFromType(_type, _tokenId);
        return prices[_id];
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
}

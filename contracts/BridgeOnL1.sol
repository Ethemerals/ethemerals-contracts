// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.3;
// import "hardhat/console.sol";

// import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
// import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/security/Pausable.sol";
// import "./utils/MeralParser.sol";
// import "./interfaces/IERC721.sol";

// contract EscrowOnL1 is
//     Ownable,
//     Pausable,
//     ERC721Holder,
//     MeralParser,
// {
//     event TokenDeposit(uint256 id, address owner, uint256 timestamp);
//     event TokenWithdraw(uint256 id, address owner, uint256 timestamp);
//     event TokenOwnerChange(uint256 id, address owner, uint256 timestamp);

//     /*///////////////////////////////////////////////////////////////
//                   STORAGE
//   //////////////////////////////////////////////////////////////*/

//     /**
//      * @dev Storage of all Deposit IDs to Owners
//      * Use MeralParser to parse Type and Token ID from IDs, max 100,000 in a type
//      * example Ethemeral Merals = type0, Monster Merals = type1
//      * Front end must call correct ID
//      */
//     mapping(uint256 => address) public allDeposits;

//     // TYPE to IERC721 addresses
//     mapping(uint256 => address) public allContracts;

//     /*///////////////////////////////////////////////////////////////
//                   ADMIN FUNCTIONS
//   //////////////////////////////////////////////////////////////*/

//     function addContract(uint256 _type, address _address) external onlyOwner {
//         require(allContracts[_type] == address(0), "type already exists");
//         allContracts[_type] = _address;
//     }

//     /*///////////////////////////////////////////////////////////////
//                   PUBLIC FUNCTIONS
//   //////////////////////////////////////////////////////////////*/

//     /**
//      * @dev user can initiate a transfer of their token to the L2 chain. the token is transferred to the escrow contract's address.
//      * @dev Tyrone - just simple transfer
//      * Transfer event is emitted.
//      * Requirements:
//      * - contract is not paused
//      * - erc721 contract must be pre registered
//      * - only the owner can initiate the transfer
//      * - id is generated from the front end
//      */
//     function deposit(uint256 _type, uint256 _tokenId) public {
//         require(!paused(), "paused");
//         require(allContracts[_type] != address(0), "not registered");
//         IERC721 contractAddress = IERC721(allContracts[_type]);
//         require(
//             contractAddress.ownerOf((_tokenId)) == msg.sender,
//             "only owner"
//         );

//         uint256 _id = getIdFromType(_type, _tokenId);
//         allDeposits[_id] = msg.sender;
//         contractAddress.safeTransferFrom(msg.sender, address(this), _tokenId);

//         emit TokenDeposit(_id, msg.sender, block.timestamp);
//     }

//     /**
//      * @dev user can initiate a withdraw of their token
//      * Transfer event is emitted.
//      * Requirements:
//      * - contract is not paused
//      * - only the owner can initiate the transfer
//      * - id is generated from the front end
//      */
//     function withdraw(uint256 _type, uint256 _tokenId) public {
//         require(!paused(), "paused");
//         uint256 _id = getIdFromType(_type, _tokenId);
//         require(allDeposits[_id] == msg.sender, "only owner");

//         IERC721 contractAddress = IERC721(allContracts[_type]);
//         contractAddress.safeTransferFrom(address(this), msg.sender, _tokenId);

//         allDeposits[_id] = address(0);

//         emit TokenWithdraw(_id, msg.sender, block.timestamp);
//     }


//     function pause() public onlyOwner {
//         _pause();
//     }

//     function unpause() public onlyOwner {
//         _unpause();
//     }
// }
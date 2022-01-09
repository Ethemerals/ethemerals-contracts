// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "../interfaces/IERC721.sol";
import "../utils/MeralParser.sol";


contract EscrowOnL2 is Ownable, ERC721Holder, MeralParser {

  // event TokenDeposit(uint256 id, address owner, uint256 timestamp);
  // event TokenWithdraw(uint256 id, address owner, uint256 timestamp);


  // /*///////////////////////////////////////////////////////////////
  //                 STORAGE
  // //////////////////////////////////////////////////////////////*/

  // /**
  //   * @dev Storage of all Deposit IDs
  //   * Use MeralParser to parse Type and Token ID from IDs, max 100,000 in a type
  //   * example Ethemeral Merals = type0, Monster Merals = type1
  //   * Front end must call correct ID
  //   */
  // mapping(uint => Deposit) public allDeposits;

  // // TYPE to IERC721 addresses
  // mapping(uint => address) public allContracts;

  // struct Deposit {
  //   address owner;
  //   uint timestamp;
  // }

  // // nonce is a sequence that identifes a transfer - on the L1 chain when the transfer is processed the nonce can be verified
  // uint256 public nonce;
  // // nonces coming from the L1 chain that are already processed
  // mapping(uint256 => bool) public processedNonces;

  // /*///////////////////////////////////////////////////////////////
  //                 ADMIN FUNCTIONS
  // //////////////////////////////////////////////////////////////*/

  // function addContract(uint _type, address _address) external onlyOwner {
  //   allContracts[_type] = _address;
  // }

  // /**
  //   * @dev gateway calls this when withdraw event is fired from L2
  //   * Requirements:
  //   * - contract is not paused
  //   * - erc721 contract must be pre registered
  //   * - id is generated from the front end
  //   */
  // function returnToEscrow(uint256 _id) external onlyOwner {
  //   uint _type = getTypeFromId(_id);
  //   require(allContracts[_type] != address(0), "not registered");
  //   IERC721 contractAddress = IERC721(allContracts[_type]);

  //   allDeposits[_id] = Deposit(msg.sender, block.timestamp);
  //   contractAddress.safeTransferFrom(msg.sender, address(this), getTokenIdFromId(_id));

  //   emit TokenDeposit(_id, msg.sender, block.timestamp);
  // }



  // /**
  //   * @dev the bridge component (script) calls the migrate function once it detects a Transfer event from L1 chain.
  //   * The migrate function either:
  //   * - creates the token if it does not exist on L2 yet
  //   * - updates the token if it already exists on L2 and is on the escrow (so it was previously transfered back to L1)
  //   * - reverts if the token exists on L2 but is not in the escrow meaning that it existed on L1 and L2 in paralell - it should never happen
  //   *
  //   * Requirements:
  //   * - contract is not paused
  //   * - nonce is not yet processed
  //   */
  // function transferToOwner(uint256 _tokenId, address owner, uint256 otherChainNonce) external onlyOwner {
  //   require(!paused(), "paused");
  //   require(ethemerals.ownerOf(_tokenId) == address(this), "not in escrow");
  //   require(processedNonces[otherChainNonce] == false, "already processed");

  //   ethemerals.safeTransferFrom(address(this), owner, _tokenId);
  //   processedNonces[otherChainNonce] = true;
  // }



}

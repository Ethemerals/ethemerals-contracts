// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./IEthemerals.sol";

contract EscrowOnL1 is Ownable, Pausable, ERC721Holder {

  event Deposit(uint256 id, address owner, uint256 date, uint256 nonce);

  // nonce is a sequence that identifes a transfer - on the L2 chain when the transfer is processed the nonce can be verified
  uint256 public nonce;
  // nonces coming from the L2 chain that are already processed
  mapping(uint256 => bool) public processedNonces;
  IEthemerals ethemerals;

  constructor(address _ethemerals) {
    ethemerals = IEthemerals(_ethemerals);
  }

  /**
    * @dev user can initiate a transfer of his token to the L2 chain. the token is transferred to the escrow contract's address.
    * Transfer event is emitted.
    * @dev Tyrone - just simple transfer
    * Requirements:
    * - contract is not paused
    * - only the owner can initiate the transfer
    */
  function deposit(uint256 _tokenId) external {
    require(!paused(), "paused");
    ethemerals.safeTransferFrom(msg.sender, address(this), _tokenId);
    emit Deposit(_tokenId, msg.sender, block.timestamp, nonce);
    nonce++;
  }

  /**
    * @dev the bridge component (script) calls the migrate function once it detects a Transfer event from L2 chain.
    * The migrate function releases the escrow: transfers the token back to the owner
    * The bridge component has to call this function with the owner address of this contract.
    * Requirements:
    * - contract is not paused
    * - token is in the escrow
    * - nonce is not yet processed
    * - only the contract owner which is the bridge component can call this function
  */
  function transferToOwner(uint256 _tokenId, address owner, uint256 otherChainNonce) external onlyOwner {
    require(!paused(), "paused");
    require(ethemerals.ownerOf(_tokenId) == address(this), "not in escrow");
    require(processedNonces[otherChainNonce] == false, "already processed");

    ethemerals.safeTransferFrom(address(this), owner, _tokenId);
    processedNonces[otherChainNonce] = true;
  }

  function pause() public onlyOwner {
    _pause();
  }

  function unpause() public onlyOwner {
    _unpause();
  }
}

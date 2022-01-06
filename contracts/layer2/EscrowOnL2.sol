// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/IEthemeralsOnL2.sol";

contract EscrowOnL2 is Ownable, Pausable, ERC721Holder {

    event Deposit(uint256 id, address owner, uint256 date, uint256 nonce);

    // nonce is a sequence that identifes a transfer - on the L1 chain when the transfer is processed the nonce can be verified
    uint256 public nonce;
    // nonces coming from the L1 chain that are already processed
    mapping(uint256 => bool) public processedNonces;
    IEthemeralsOnL2 ethemerals;

    constructor(address _ethemerals) {
      ethemerals = IEthemeralsOnL2(_ethemerals);
    }

    /**
     * @dev user can initiate a transfer of his token to the L1 chain. the token is transferred to the escrow contract's address.
     * Transfer event is emitted.
     *
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
    * @dev the bridge component (script) calls the migrate function once it detects a Transfer event from L1 chain.
    * The migrate function either:
    * - creates the token if it does not exist on L2 yet
    * - updates the token if it already exists on L2 and is on the escrow (so it was previously transfered back to L1)
    * - reverts if the token exists on L2 but is not in the escrow meaning that it existed on L1 and L2 in paralell - it should never happen
    *
    * Requirements:
    * - contract is not paused
    * - nonce is not yet processed
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

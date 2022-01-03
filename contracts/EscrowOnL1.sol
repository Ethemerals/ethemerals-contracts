// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./IEthemerals.sol";

contract EscrowOnL1 is Ownable, Pausable, ERC721Holder {
    // nonce is a sequence that identifes a transfer - on the L2 chain when the transfer is processed the nonce can be verified
    uint256 public nonce;
    // nonces coming from the L2 chain that are already processed
    mapping(uint256 => bool) public processedNonces;
    IEthemerals ethemerals;

    event Transfer(
        uint256 id,
        address recipient,
        uint16 score,
        uint32 rewards,
        uint16 atk,
        uint16 def,
        uint16 spd,
        uint256 date,
        uint256 nonce
    );

    constructor(address _ethemerals) {
        ethemerals = IEthemerals(_ethemerals);
    }

    /**
     * @dev user can initiate a transfer of his token to the L2 chain. the token is transferred to the escrow contract's address.
     * Transfer event is emitted.
     *
     * Requirements:
     * - contract is not paused
     * - only the owner can initiate the transfer
     */
    function transfer(uint256 _tokenId) external {
        require(!paused(), "Not allowed while paused");
        require(
            ethemerals.ownerOf(_tokenId) == msg.sender,
            "Only the owner can initiate a transfer into the escrow"
        );

        ethemerals.safeTransferFrom(msg.sender, address(this), _tokenId);

        IEthemerals.Meral memory meral = ethemerals.getEthemeral(_tokenId);
        emit Transfer(
            _tokenId,
            msg.sender,
            meral.score,
            meral.rewards,
            meral.atk,
            meral.def,
            meral.spd,
            block.timestamp,
            nonce
        );
        nonce++;
    }

    /**
     * @dev the bridge component (script) calls the migrate function once it detects a Transfer event from L2 chain.
     * The migrate function releases the escrow: transfers the token back to the owner and calls the score and reward adjustments.
     * The bridge component has to call this function with the owner address of this contract.
     *
     * Requirements:
     * - contract is not paused
     * - token is in the escrow
     * - nonce is not yet processed
     * - only the contract owner which is the bridge component can call this function
     */
    function migrate(
        uint256 _tokenId,
        address owner,
        uint256 otherChainNonce,
        uint16 scoreOffset,
        bool scoreAdd,
        uint32 scoreAmount,
        uint32 rewardsOffset,
        bool rewardsAdd,
        uint8 rewardsAction
    ) external onlyOwner {
        require(!paused(), "Not allowed while paused");
        require(
            ethemerals.ownerOf(_tokenId) == address(this),
            "Token is not in escrow"
        );
        require(
            processedNonces[otherChainNonce] == false,
            "transfer already processed"
        );
        ethemerals.safeTransferFrom(address(this), owner, _tokenId);
        ethemerals.changeScore(_tokenId, scoreOffset, scoreAdd, scoreAmount);
        ethemerals.changeRewards(
            _tokenId,
            rewardsOffset,
            rewardsAdd,
            rewardsAction
        );
        processedNonces[otherChainNonce] = true;
    }

    function pause() public onlyOwner {
        _pause();
    }
}

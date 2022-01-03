// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/interfaces.sol";

contract EscrowOnL2 is Ownable, Pausable, ERC721Holder {
    // nonce is a sequence that identifes a transfer - on the L1 chain when the transfer is processed the nonce can be verified
    uint256 public nonce;
    // nonces coming from the L1 chain that are already processed
    mapping(uint256 => bool) public processedNonces;
    IEthemeralsOnL2 ethemerals;

    event Transfer(
        uint256 id,
        address recipient,
        uint16 score,
        uint32 rewards,
        uint256 date,
        uint256 nonce
    );

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
    function transfer(uint256 _tokenId) external {
        require(!paused(), "Not allowed while paused");
        require(
            ethemerals.ownerOf(_tokenId) == msg.sender,
            "Only the owner can initiate a transfer into the escrow"
        );

        ethemerals.safeTransferFrom(msg.sender, address(this), _tokenId);

        IEthemeralsOnL2.Meral memory meral = ethemerals.getEthemeral(_tokenId);
        emit Transfer(
            _tokenId,
            msg.sender,
            meral.score,
            meral.rewards,
            block.timestamp,
            nonce
        );
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
    function migrate(
        uint256 _tokenId,
        address owner,
        uint256 otherChainNonce,
        uint16 _score,
        uint16 _rewards,
        uint16 _atk,
        uint16 _def,
        uint16 _spd
    ) external onlyOwner {
        require(!paused(), "Not allowed while paused");
        require(
            processedNonces[otherChainNonce] == false,
            "transfer already processed"
        );
        bool existingToken = ethemerals.exists(_tokenId);
        // token does not exist yet
        if (!existingToken) {
            ethemerals.migrateMeral(
                _tokenId,
                owner,
                _score,
                _rewards,
                _atk,
                _def,
                _spd
            );
        }
        // token already existed on L2 but was put on escrow
        else if (
            existingToken && ethemerals.ownerOf(_tokenId) == address(this)
        ) {
            ethemerals.updateMeral(
                _tokenId,
                owner,
                _score,
                _rewards,
                _atk,
                _def,
                _spd
            );
        }
        // other current owner is not acceptible: the token should not exist or should be in the escrow if the user could initiate the transfer from L1
        else {
            revert("Tokens already exists and not in the escrow");
        }
        processedNonces[otherChainNonce] = true;
    }

    function pause() public onlyOwner {
        _pause();
    }
}

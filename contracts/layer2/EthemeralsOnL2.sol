// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IMeralManager.sol";

// DEV - stripped down Ethemerals contract on L2, Stats are stored on meralManager
// DEV - modifed allow delegates to disallow delegates (true on default)

contract EthemeralsOnL2 is ERC721, Ownable {

  event DelegateChange(address delegate, bool add);

  /*///////////////////////////////////////////////////////////////
                  STORAGE
  //////////////////////////////////////////////////////////////*/

  // the contract holding the stats
  IMeralManager meralManager;

  address public escrowAddress;

  // Delegates include game masters and auction houses
  mapping(address => bool) public delegates;


  /*///////////////////////////////////////////////////////////////
                  GM FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  constructor(address meralManagerAddress)
    ERC721("Ethemerals", "MERALS")
  {
    meralManager = IMeralManager(meralManagerAddress);
  }

  /**
    * @dev migrates (mints) an Ethemeral
    * ment to be used during transfer from L1 to L2 when the meral does not exist in this chain yet
    * only the owner can call this function
    * sets the supplied id, score, rewards,  atk, def, spd
    */
  function migrateMeral(
    uint _tokenId,
    uint16 _score,
    uint32 _rewards,
    uint16 _atk,
    uint16 _def,
    uint16 _spd,
    uint8 _element,
    uint8 _subclass
  ) external onlyOwner {
    require(!_exists(_tokenId), "Token already exists");
    require(escrowAddress != address(0), "escrow cannot be zero address");
    _safeMint(escrowAddress, _tokenId);
    meralManager.registerOGMeral(_tokenId, _score, _rewards, _atk, _def, _spd, _element, _subclass);
  }


  /*///////////////////////////////////////////////////////////////
                  ADMIN FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function addDelegate(address _delegate, bool add) external onlyOwner {
    delegates[_delegate] = add;
    emit DelegateChange(_delegate, add);
  }

  function setEscrowAddress(address _escrowAddress) external onlyOwner {
    escrowAddress = _escrowAddress;
  }

  function setMeralManager(address meralManagerAddress) external onlyOwner {
    meralManager = IMeralManager(meralManagerAddress);
  }


  /*///////////////////////////////////////////////////////////////
                  OVERRIDES
  //////////////////////////////////////////////////////////////*/

  /**
    * @dev See {IERC721-isApprovedForAll}.
    * White list for game masters and auction house
    * On by default Opposite of mainnet
    */
  function isApprovedForAll(address _owner, address _operator)
    public
    view
    override
    returns (bool)
  {
    if (delegates[_operator] == true || escrowAddress == _operator) {
      return true;
    }

    return super.isApprovedForAll(_owner, _operator);
  }

  function exists(uint256 tokenId) public view returns (bool) {
    return super._exists(tokenId);
  }


}


// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../../utils/MeralParser.sol";

contract MeralManager is ERC721, Ownable, MeralParser {

  event ChangeHP(uint id, uint16 hp, bool add);
  event ChangeXP(uint id, uint32 xp, bool add);
  event ChangeELF(uint id, uint32 elf, bool add);
  event ChangeStats(uint id, uint16 atk, uint16 def, uint16 spd);
  event ChangeElement(uint id, uint8 element);
  event InitMeral(uint meralType, uint tokenId, uint32 elf, uint16 hp, uint16 maxHp, uint16 atk, uint16 def, uint16 spd, uint16 maxStamina, uint8 element, uint8 subclass);
  event AuthChange(address auth, bool add);

  /*///////////////////////////////////////////////////////////////
                  STORAGE
  //////////////////////////////////////////////////////////////*/

  /**
    * @dev Storage of all Meral IDs
    * Use MeralParser to parse Type and Token ID from IDs, max 100,000 in a type
    * Ethemeral Merals = 0, Monster Merals = 1 etc etc
    * Front end must call correct ID
    */
  mapping(uint => Meral) public allMerals;

  // include game masters
  mapping(address => bool) public gmAddresses;

  // TYPE to IERC721 addresses
  mapping(uint => address) public meralContracts;

  // IERC721 public merals;
  address public register;

  struct Meral {
    uint32 elf;
    uint32 xp;
    uint16 hp;
    uint16 maxHp;
    uint16 atk;
    uint16 def;
    uint16 spd;
    uint16 maxStamina;
    uint8 element;
    uint8 subclass;
  }


  /*///////////////////////////////////////////////////////////////
                  ADMIN FUNCTIONS
  //////////////////////////////////////////////////////////////*/
  constructor() ERC721("Proxy Ethemerals", "MERALS") {}

  function setRegister(address _register) external onlyOwner {
    register = _register;
  }

  function addGM(address _gm, bool add) external onlyOwner {
    gmAddresses[_gm] = add;
    emit AuthChange(_gm, add);
  }

  /*///////////////////////////////////////////////////////////////
                  GM FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function transfer(address from, address to, uint _id) external onlyGM {
    safeTransferFrom(from, to, _id);
  }

  function releaseFromPortal(address to, uint _id) external onlyGM {
    _safeMint(to, _id);
  }

  function returnToPortal(uint _id) external onlyGM {
    _burn(_id);
  }

  function registerOGMeral(
    uint _tokenId,
    uint16 _score,
    uint32 _rewards,
    uint16 _atk,
    uint16 _def,
    uint16 _spd,
    uint8 _element,
    uint8 _subclass
  ) external onlyGM {
    allMerals[getIdFromType(1, _tokenId)] = Meral(_rewards, 0, _score, 1000, _atk, _def, _spd, 100, _element, _subclass);
    emit InitMeral(1, _tokenId, _rewards, _score, 1000, _atk, _def, _spd, 100, _element, _subclass);
  }

  // function registerMeral(uint _type, uint _tokenId) external onlyGM() {

  //   bool success;
  //   bytes memory data;

  //   (success, data) = register.delegatecall(abi.encodeWithSignature("registerMeral(uint16,uint)", _type, _tokenId));
  //   require(success, "need success");
  // }

  function changeHP(uint _id, uint16 offset, bool add) external onlyGM {
    Meral storage _meral = allMerals[_id];

    uint16 _HP = _meral.hp;
    uint16 newHP;

    // safe
    if (add) {
      uint16 sum = _HP + offset;
      newHP = sum > _meral.maxHp ? _meral.maxHp : sum;
    } else {
      if (_HP <= offset) {
        newHP = 0;
      } else {
        newHP = _HP - offset;
      }
    }

    _meral.hp = newHP;

    emit ChangeHP(_id, newHP, add);
  }

  function changeXP(uint _id, uint32 offset, bool add) external onlyGM {
    Meral storage _meral = allMerals[_id];

    uint32 _XP = _meral.xp;
    uint32 newXP;

    // safe
    if (add) {
      uint32 sum = _XP + offset;
      newXP = sum > 100000 ? 100000 : sum;

    } else {
      if (_XP <= offset) {
        newXP = 0;
      } else {
        newXP = _XP - offset;
      }
    }

    _meral.xp = newXP;

    emit ChangeXP(_id, newXP, add);
  }

  function changeELF(uint _id, uint32 offset, bool add) external onlyGM {
    Meral storage _meral = allMerals[_id];

    uint _ELF = uint32(_meral.elf);
    uint newELF;

    // safe
    if (add) {
      uint sum = _ELF + offset;
      newELF = sum > 1000000 ? 1000000 : sum;
    } else {
      if (_ELF <= offset) {
        newELF = 0;
      } else {
        newELF = _ELF - offset;
      }
    }

    _meral.elf = uint32(newELF);

    emit ChangeELF(_id, uint32(newELF), add);
  }

  function changeStats(uint _id, uint16 _atk, uint16 _def, uint16 _spd) external onlyGM {
    Meral storage _meral = allMerals[_id];
    _meral.atk = _atk;
    _meral.def = _def;
    _meral.spd = _spd;

    emit ChangeStats(_id, _atk, _def, _spd);
  }

  function changeElement(uint _id, uint8 _element) external onlyGM {
    Meral storage _meral = allMerals[_id];
    _meral.element = _element;

    emit ChangeElement(_id, _element);
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
    if (gmAddresses[_operator]) {
      return true;
    }

    return super.isApprovedForAll(_owner, _operator);
  }


  /*///////////////////////////////////////////////////////////////
                  MODIFIERS
  //////////////////////////////////////////////////////////////*/

  /**
  * @dev Throws if called by any account other than the game master contract.
  */
  modifier onlyGM() {
    require(gmAddresses[msg.sender], "gm only");
    _;
  }

  /*///////////////////////////////////////////////////////////////
                  PUBLIC VIEW FUNCTIONS
  //////////////////////////////////////////////////////////////*/
  // TODO
  function ownerOfByType(uint _type, uint _tokenId) external view returns (address) {
    return ownerOf(getIdFromType(_type, _tokenId));
  }

  // INTERNAL ID
  function getMeralById(uint _id) external view returns (Meral memory) {
    return allMerals[_id];
  }

  // TYPE & TOKENID
  function getMeral(uint _type, uint _tokenId) external view returns (Meral memory) {
    return allMerals[getIdFromType(_type, _tokenId)];
  }

  function exists(uint256 id) public view returns (bool) {
    return super._exists(id);
  }
}